import express from "express";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import cors from "cors";

import { dbConfig } from "./Database/db_config.js";
import { errorHandler } from "./middleware/errorHandler.js";
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

export const bootstrap = () => {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  /* Render / Vercel / any reverse-proxied host terminates TLS upstream
     of the Node process. Without trust proxy, express-session sees the
     hop as plain HTTP and refuses to set Secure cookies in prod. */
  app.set('trust proxy', 1);

  // -----------------------------
  // Middlewares
  // -----------------------------
  /* CORS first so preflights pass before session/body parsing runs.
     Prod: lock to the configured frontend origin (required when sending
     credentialed requests — a wildcard is rejected by the browser).
     Dev: reflect any origin so the React web client and the Expo mobile
     app (LAN IP / 10.0.2.2) all work.

     Origin strings must match the browser's `Origin` header byte-for-byte,
     which never includes a trailing slash. Strip one if FRONTEND_ORIGIN
     was configured with a stray slash (a very easy dashboard mistake) so
     the preflight doesn't silently fail with no error in the logs. */
  const allowedOrigin = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.replace(/\/+$/, '')
    : undefined;
  if (isProd && allowedOrigin) {
    console.log(`[cors] allowed origin = ${allowedOrigin}`);
  }
  app.use(cors({
    origin: isProd && allowedOrigin
      ? allowedOrigin
      : (origin, callback) => callback(null, true),
    credentials: true,
  }));

  /* React Native's native networking stack force-appends cookies from
     its internal jar to whatever Cookie header we set manually,
     producing `connect.sid=X,connect.sid=X` on the wire. cookie-parser
     then refuses to parse this and express-session falls back to a
     fresh empty session, breaking auth. Collapse any comma-joined
     duplicates to the first segment before downstream middleware
     touches the header. */
  app.use((req, _res, next) => {
    if (req.headers.cookie && req.headers.cookie.includes(',')) {
      req.headers.cookie = req.headers.cookie.split(',')[0].trim();
    }
    next();
  });

  app.use(express.json());

  const MySQLStore = MySQLStoreFactory(session);
  /* Reuse the central db_config so the session store inherits the same
     TLS policy as the data pool — there is no way for one connection to
     end up encrypted while the other isn't. */
  const sessionStore = new MySQLStore({
    ...dbConfig,
    createDatabaseTable: true,
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-local-session-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
      httpOnly: true,
      /* Prod: cookie is sent from Vercel (frontend) to Render (backend)
         cross-site, so sameSite must be 'none' and secure must be true
         (browsers refuse 'none' without secure). Dev: 'lax' + insecure
         so localhost HTTP and the Expo native stack keep working. */
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    },
  }));

  // -----------------------------
  // Main Router (API Mount)
  // -----------------------------
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

  // -----------------------------
  // 404 Handler
  // -----------------------------
  app.use((req, res) => {
    res.status(404).json({ ok: false, message: "Route not found" });
  });

  // -----------------------------
  // Error Handler
  // -----------------------------
  app.use(errorHandler);

  return app;
};