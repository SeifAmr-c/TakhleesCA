import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";

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

  const sessionStore = MongoStore.create({
    mongoUrl: process.env.Mongo_url,
    dbName: 'Takhlees',
    collectionName: 'sessions',
    /* Mongo auto-removes expired sessions via a TTL index; matches the
       cookie maxAge below so dead sessions don't linger. */
    ttl: 30 * 60,
    touchAfter: 60,
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-local-session-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
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

  app.use((req, res) => {
    res.status(404).json({ ok: false, message: "Route not found" });
  });

  app.use(errorHandler);

  return app;
};
