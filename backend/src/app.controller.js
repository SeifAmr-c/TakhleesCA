import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";

import { errorHandler } from "./middleware/errorHandler.js";
import { resolveLanguage } from "./middleware/language.js";
import { localizeResponses } from "./utils/localize.js";
import { getMongoUrl, getDbName } from "./Database/mongo_connection.js";
import userRouter from "./modules/user/user_controller.js";
import applicationRouter from "./modules/application/application_controller.js";
import categoryRouter from "./modules/category/category_controller.js";
import companyRouter from "./modules/company/company_controller.js";
import portRouter from "./modules/port/port_controller.js";
import companyPortRouter from "./modules/company_port/company_port_controller.js";
import companyCategoryRouter from "./modules/company_category/company_category_controller.js";
import companyPaymentRouter from "./modules/company_payment/company_payment_controller.js";
import documentRouter from "./modules/document/document_controller.js";
import paymentRouter from "./modules/payment/payment_controller.js";
import reviewRouter from "./modules/review/review_controller.js";
import supportTicketRouter from "./modules/support_ticket/support_ticket_controller.js";
import adminRouter from "./modules/admin/admin_controller.js";
import statsRouter from "./modules/stats/stats_controller.js";

export const bootstrap = () => {
  const app = express();

  /* Render terminates HTTPS at its proxy and forwards plain HTTP to us.
     Without this, express-session sees req.secure === false and refuses
     to set a `secure` cookie, so cross-site logins silently break. */
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  }));

  /* Some clients append duplicate Cookie segments (e.g. older RN
     networking stacks). Collapse to the first segment so cookie-parser
     can still parse a clean header downstream. */
  app.use((req, _res, next) => {
    if (req.headers.cookie && req.headers.cookie.includes(',')) {
      req.headers.cookie = req.headers.cookie.split(',')[0].trim();
    }
    next();
  });

  app.use(express.json());

  /* Default cookie lifetime is a year so the mobile app can hold a
     session across long gaps between launches. The web client doesn't
     get this treatment — see the override middleware below. */
  const MOBILE_SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
  const WEB_SESSION_MAX_AGE_MS = 30 * 60 * 1000;

  const sessionStore = MongoStore.create({
    mongoUrl: getMongoUrl(),
    dbName: getDbName(),
    collectionName: 'sessions',
    /* Store TTL is the upper bound; the per-session expires field
       (driven by req.session.cookie.maxAge) is what actually decides
       when each session is pruned. */
    ttl: MOBILE_SESSION_MAX_AGE_SECONDS,
    /* Throttle session-touch writes (the bookkeeping `rolling: true`
       does on every request) to at most once a minute per session, so
       a busy client doesn't hammer the sessions collection. */
    touchAfter: 60,
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-local-session-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    /* Slide the expiry on every request. Combined with the per-request
       maxAge override below, this means:
        - mobile clients (X-Client-Platform: mobile) keep a year-long
          rolling window — they stay signed in until they tap Sign out
        - web clients keep the historical 30-minute idle window */
    rolling: true,
    cookie: {
      maxAge: MOBILE_SESSION_MAX_AGE_SECONDS * 1000,
      httpOnly: true,
      /* In production the frontend (Vercel) and backend (Render) are on
         different sites, so the session cookie must be SameSite=None to
         flow on cross-site XHR — and browsers only accept None when the
         cookie is also Secure. In dev, CRA's proxy makes requests
         same-origin so Lax is correct and works over plain HTTP. */
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  }));

  /* Mobile sessions persist for a year so users don't get bounced to the
     sign-in screen when they reopen the app after hours/days. Web
     sessions stay at the original 30-minute rolling window. We detect
     the client via the X-Client-Platform header set by mobile/src/api.js
     on every fetch — its absence (browser fetch) flips the per-request
     cookie maxAge down to 30 minutes. */
  app.use((req, _res, next) => {
    if (req.session && req.headers['x-client-platform'] !== 'mobile') {
      req.session.cookie.maxAge = WEB_SESSION_MAX_AGE_MS;
    }
    next();
  });

  /* Resolve req.lang, then patch res.json so reference-data responses are
     flattened to that language. Mounted before the routers so every
     handler benefits without per-handler wiring. */
  app.use(resolveLanguage);
  app.use(localizeResponses);

  app.use("/user", userRouter);
  app.use("/application", applicationRouter);
  app.use("/category", categoryRouter);
  app.use("/company", companyRouter);
  app.use("/port", portRouter);
  app.use("/companyport", companyPortRouter);
  app.use("/companycategory", companyCategoryRouter);
  app.use("/companypayment", companyPaymentRouter);
  app.use("/document", documentRouter);
  app.use("/payment", paymentRouter);
  app.use("/review", reviewRouter);
  app.use("/supportticket", supportTicketRouter);
  app.use("/admin", adminRouter);
  app.use("/stats", statsRouter);

  app.use((req, res) => {
    res.status(404).json({ ok: false, message: "Route not found" });
  });

  app.use(errorHandler);

  return app;
};
