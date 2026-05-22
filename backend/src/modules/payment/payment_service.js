import Application from '../../Database/mongo/application.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import CompanyPayment from '../../Database/mongo/company_payment.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';
import { PLATFORM_FEE_RATE } from '../../config/fees.js';

const PAYMENT_GATEWAYS = ['Credit Card', 'Bank Transfer'];

/* Payments are embedded subdocs on Application. */

export const createPayment = async (req, res, next) => {
    try {
        /* Frontend has historically sent the gateway under either
           `Method` or `PaymentGateway`; accept both. */
        const Gateway = req.body.PaymentGateway ?? req.body.Method;
        const Amount = Number(req.body.Amount);
        const ApplicationID = Number(req.body.ApplicationID);

        if (!ApplicationID) {
            return res.status(400).json({ ok: false, message: 'ApplicationID is required.' });
        }
        if (isNaN(Amount) || Amount <= 0) {
            return res.status(400).json({ ok: false, message: 'Amount must be a positive number.' });
        }
        if (!PAYMENT_GATEWAYS.includes(Gateway)) {
            return res.status(400).json({
                ok: false,
                message: `PaymentGateway must be one of: ${PAYMENT_GATEWAYS.join(', ')}.`,
            });
        }

        const app = await Application.findOne({ ApplicationID }).select({ CompanyID: 1 }).lean();
        if (!app) {
            return res.status(404).json({ ok: false, message: `Application ${ApplicationID} not found.` });
        }

        const PaymentID = await nextId('payment');
        await Application.updateOne(
            { ApplicationID },
            { $push: { payments: {
                PaymentID,
                PaymentDate: new Date(),
                Amount,
                PaymentGateway: Gateway,
            } } }
        );

        /* The client pays us a flat 5% on top of the service price at
           checkout. Book it immediately as the first slice of this
           payment's CompanyPayment ledger row; commission + the monthly
           listing fee are added to the SAME row when the company accepts
           (see updateApplication). Amount on the payment subdoc stays the
           service price so commission is computed off the price, not our cut. */
        const FixedFee = Math.round(Amount * PLATFORM_FEE_RATE * 100) / 100;
        let companySnap = null;
        if (app.CompanyID != null) {
            const c = await Company.findOne({ CompanyID: app.CompanyID }).select({ Name: 1 }).lean();
            if (c) companySnap = { Name: c.Name };
        }
        const CompanyPaymentID = await nextId('company_payment');
        await CompanyPayment.create({
            CompanyPaymentID,
            PaymentDate: new Date(),
            Amount: FixedFee,
            FixedFee,
            Commission: 0,
            ListingFee: 0,
            CompanyID: app.CompanyID ?? null,
            PaymentID,
            company: companySnap,
        });

        return res.status(201).json({
            ok: true,
            message: 'Payment recorded.',
            data: { PaymentID, Amount, PaymentGateway: Gateway, ApplicationID },
        });
    } catch (err) {
        return next(err);
    }
};

export const getPayment = async (req, res, next) => {
    try {
        const { PaymentID } = req.query;
        if (PaymentID === '%' || PaymentID === undefined) {
            const apps = await Application.find({}, { payments: 1, ApplicationID: 1 }).lean();
            const rows = apps.flatMap((a) =>
                (a.payments || []).map((p) => ({ ApplicationID: a.ApplicationID, ...p }))
            );
            return res.json(rows);
        }
        const pid = Number(PaymentID);
        const app = await Application.findOne({ 'payments.PaymentID': pid }, { payments: 1, ApplicationID: 1 }).lean();
        if (!app) return res.json([]);
        const p = (app.payments || []).find((x) => x.PaymentID === pid);
        return res.json(p ? [{ ApplicationID: app.ApplicationID, ...p }] : []);
    } catch (err) {
        return next(err);
    }
};

export const deletePayment = async (req, res, next) => {
    try {
        const pid = Number(req.query.PaymentID);
        const result = await Application.updateOne(
            { 'payments.PaymentID': pid },
            { $pull: { payments: { PaymentID: pid } } }
        );
        if (!result.matchedCount) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${pid}] does not exist or has already been deleted.`,
            });
        }
        return res.status(200).json({ Status: "OK", Message: `Record Id [${pid}] deleted Successfully` });
    } catch (err) {
        return next(err);
    }
};

export const searchPayment = async (req, res, next) => {
    try {
        const { keyword, keyvalue } = req.query;
        const allowedColumns = ['PaymentID', 'PaymentDate', 'Amount', 'PaymentGateway', 'ApplicationID'];
        if (!allowedColumns.includes(keyword)) {
            return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
        }
        if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

        if (keyword === 'ApplicationID') {
            const app = await Application.findOne({ ApplicationID: Number(keyvalue) }).select({ payments: 1, ApplicationID: 1 }).lean();
            return res.json((app?.payments || []).map((p) => ({ ApplicationID: app.ApplicationID, ...p })));
        }

        const numericKeys = new Set(['PaymentID', 'Amount']);
        const value = numericKeys.has(keyword)
            ? Number(keyvalue)
            : (keyword === 'PaymentDate' ? new Date(keyvalue) : keyvalue);

        const apps = await Application.find({ [`payments.${keyword}`]: value }, { payments: 1, ApplicationID: 1 }).lean();
        const rows = [];
        for (const app of apps) {
            for (const p of (app.payments || [])) {
                if (p[keyword] === value || (keyword === 'PaymentDate' && p.PaymentDate?.getTime?.() === value.getTime?.())) {
                    rows.push({ ApplicationID: app.ApplicationID, ...p });
                }
            }
        }
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
};

export const updatePayment = async (req, res, next) => {
    try {
        const pid = Number(req.query.PaymentID);
        const app = await Application.findOne({ 'payments.PaymentID': pid });
        if (!app) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${pid}] does not exist or has already been deleted. Update aborted.`,
            });
        }
        const existing = (app.payments || []).find((p) => p.PaymentID === pid);

        const PaymentDate    = req.body.PaymentDate    !== undefined ? new Date(req.body.PaymentDate) : existing.PaymentDate;
        const Amount         = req.body.Amount         !== undefined ? Number(req.body.Amount)        : existing.Amount;
        const PaymentGateway = req.body.PaymentGateway !== undefined ? req.body.PaymentGateway        : existing.PaymentGateway;

        await Application.updateOne(
            { 'payments.PaymentID': pid },
            { $set: {
                'payments.$.PaymentDate': PaymentDate,
                'payments.$.Amount': Amount,
                'payments.$.PaymentGateway': PaymentGateway,
            } }
        );
        return res.status(200).json({ Status: "OK", Message: `Record Id [${pid}] is Updated Successfully` });
    } catch (err) {
        return next(err);
    }
};
