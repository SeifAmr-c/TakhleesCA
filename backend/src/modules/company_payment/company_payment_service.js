import CompanyPayment from '../../Database/mongo/company_payment.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';

export const createCompanyPayment = async (req, res, next) => {
  try {
    const { PaymentDate, Amount, CompanyID, PaymentID } = req.body;
    const CompanyPaymentID = await nextId('company_payment');

    let companySnap = null;
    if (CompanyID) {
      const c = await Company.findOne({ CompanyID: Number(CompanyID) }).select({ Name: 1 }).lean();
      if (c) companySnap = { Name: c.Name };
    }

    await CompanyPayment.create({
      CompanyPaymentID,
      PaymentDate: PaymentDate ? new Date(PaymentDate) : new Date(),
      Amount: Number(Amount),
      CompanyID: CompanyID != null ? Number(CompanyID) : null,
      PaymentID: Number(PaymentID),
      company: companySnap,
    });

    return res.status(201).json({ Status: "OK", Message: `Record Added Successfully with Id ${CompanyPaymentID}` });
  } catch (err) {
    return next(err);
  }
};

export const getCompanyPayment = async (req, res, next) => {
  try {
    const { CompanyPaymentID } = req.query;
    if (CompanyPaymentID === '%' || CompanyPaymentID === undefined) {
      const rows = await CompanyPayment.find().sort({ CompanyPaymentID: 1 }).lean();
      return res.json(rows);
    }
    const rows = await CompanyPayment.find({ CompanyPaymentID: Number(CompanyPaymentID) }).lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

export const deleteCompanyPayment = async (req, res, next) => {
  try {
    const id = Number(req.query.CompanyPaymentID);
    const result = await CompanyPayment.deleteOne({ CompanyPaymentID: id });
    if (!result.deletedCount) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${id}] does not exist or has already been deleted.`,
      });
    }
    return res.status(200).json({ Status: "OK", Message: `Record Id [${id}] deleted Successfully` });
  } catch (err) {
    return next(err);
  }
};

export const searchCompanyPayment = async (req, res, next) => {
  try {
    const { keyword, keyvalue } = req.query;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? -1 : 1;

    const allowedColumns = ['CompanyPaymentID', 'PaymentDate', 'Amount', 'CompanyID', 'PaymentID'];
    if (!allowedColumns.includes(keyword)) {
      return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

    let value;
    if (keyword === 'PaymentDate') value = new Date(keyvalue);
    else if (keyword === 'CompanyPaymentID' || keyword === 'Amount' || keyword === 'CompanyID' || keyword === 'PaymentID') {
      value = Number(keyvalue);
    } else value = keyvalue;

    const rows = await CompanyPayment.find({ [keyword]: value }).sort({ CompanyPaymentID: sort }).lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

export const updateCompanyPayment = async (req, res, next) => {
  try {
    const id = Number(req.query.CompanyPaymentID);
    const existing = await CompanyPayment.findOne({ CompanyPaymentID: id });
    if (!existing) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${id}] does not exist or has already been deleted. Update aborted.`,
      });
    }

    const $set = {};
    if (req.body.PaymentDate !== undefined) $set.PaymentDate = new Date(req.body.PaymentDate);
    if (req.body.Amount      !== undefined) $set.Amount      = Number(req.body.Amount);
    if (req.body.CompanyID   !== undefined) $set.CompanyID   = req.body.CompanyID == null ? null : Number(req.body.CompanyID);
    if (req.body.PaymentID   !== undefined) $set.PaymentID   = Number(req.body.PaymentID);

    await CompanyPayment.updateOne({ CompanyPaymentID: id }, { $set });
    return res.status(200).json({ Status: "OK", Message: `Record Id [${id}] is Updated Successfully` });
  } catch (err) {
    return next(err);
  }
};
