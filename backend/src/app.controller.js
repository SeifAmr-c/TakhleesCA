import express from "express";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
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
import mobileApplicationRouter from "./modules/mobile_application/mobile_application_controller.js";

export const bootstrap = () => {
  const app = express();

  // -----------------------------
  // Middlewares
  // -----------------------------
  /* CORS first so preflights pass before session/body parsing runs.
     Dev: reflect any origin and allow credentials so the React web
     client and the Expo mobile app (LAN IP / 10.0.2.2) all work. */
  app.use(cors({
    origin: (origin, callback) => callback(null, true),
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
  const sessionStore = new MySQLStore({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Takhlees',
    createDatabaseTable: true,
  });

  app.use(session({
    secret: 'dev-local-session-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
      httpOnly: true,
      /* sameSite must be 'lax' for local HTTP. 'none' would silently
         drop the cookie unless secure: true is also set, which breaks
         http://localhost dev. */
      sameSite: 'lax',
      /* secure must be false over plain HTTP — otherwise the browser /
         RN networking stack will refuse to store or send the cookie. */
      secure: false,
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
  /* Mongo-backed routes used exclusively by the mobile app. The matching
     /application/* routes (MySQL) remain so the web/admin dashboard is
     unaffected. */
  app.use("/mobile/application", mobileApplicationRouter);

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