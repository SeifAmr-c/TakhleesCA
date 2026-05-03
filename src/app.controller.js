import express from "express";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";

import { errorHandler } from "./middleware/errorHandler.js";
import userRouter from "./modules/user/user_controller.js";
import applicationRouter from "./modules/application/application_controller.js";
import categoryRouter from "./modules/category/category_controller.js";
import companyRouter from "./modules/company/company_controller.js";
import portRouter from "./modules/port/port_controller.js";
import companyPortRouter from "./modules/company_port/company_port_controller.js";
import companyPaymentRouter from "./modules/company_payment/company_payment_controller.js";
import documentRouter from "./modules/document/document_controller.js";
import paymentRouter from "./modules/payment/payment_controller.js";
import reviewRouter from "./modules/review/review_controller.js";
import supportTicketRouter from "./modules/support_ticket/support_ticket_controller.js";

export const bootstrap = () => {
  const app = express();

  // -----------------------------
  // Middlewares
  // -----------------------------
  app.use(express.json());

  const MySQLStore = MySQLStoreFactory(session);
  const sessionStore = new MySQLStore({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Takhlees',
    createDatabaseTable: true,
  });

  const isProduction = false;

  app.use(session({
    secret: 'dev-local-session-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
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
  app.use("/companypayment", companyPaymentRouter);
  app.use("/document", documentRouter);
  app.use("/payment", paymentRouter);
  app.use("/review", reviewRouter);
  app.use("/supportticket", supportTicketRouter);

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