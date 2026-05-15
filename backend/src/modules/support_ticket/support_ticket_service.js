import SupportTicket from '../../Database/mongo/support_ticket.mongo.js';
import User from '../../Database/mongo/user.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';

export const createSupportTicket = async (req, res, next) => {
    try {
        const Issue = req.body.Issue;
        const Resolved = !!req.body.Resolved;
        const AdminID = req.body.AdminID != null ? Number(req.body.AdminID) : null;
        const ClientID = Number(req.body.ClientID);

        const [adminUser, clientUser] = await Promise.all([
            AdminID ? User.findOne({ UserID: AdminID }).select({ FirstName: 1, LastName: 1 }).lean() : null,
            User.findOne({ UserID: ClientID }).select({ FirstName: 1, LastName: 1, Email: 1 }).lean(),
        ]);

        const TicketID = await nextId('support_ticket');
        await SupportTicket.create({
            TicketID,
            Issue,
            Resolved,
            AdminID,
            ClientID,
            admin:  adminUser  ? { FirstName: adminUser.FirstName, LastName: adminUser.LastName } : null,
            client: clientUser ? { FirstName: clientUser.FirstName, LastName: clientUser.LastName, Email: clientUser.Email } : null,
        });

        return res.status(201).json({ Status: "OK", Message: `Record Added Successfully with Id ${TicketID}` });
    } catch (err) {
        return next(err);
    }
};

export const getSupportTicket = async (req, res, next) => {
    try {
        const { TicketID } = req.query;
        if (TicketID === '%' || TicketID === undefined) {
            const rows = await SupportTicket.find().sort({ TicketID: 1 }).lean();
            return res.json(rows);
        }
        const rows = await SupportTicket.find({ TicketID: Number(TicketID) }).lean();
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
};

export const deleteSupportTicket = async (req, res, next) => {
    try {
        const tid = Number(req.query.TicketID);
        const result = await SupportTicket.deleteOne({ TicketID: tid });
        if (!result.deletedCount) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${tid}] does not exist or has already been deleted.`,
            });
        }
        return res.status(200).json({ Status: "OK", Message: `Record Id [${tid}] deleted Successfully` });
    } catch (err) {
        return next(err);
    }
};

export const searchSupportTicket = async (req, res, next) => {
    try {
        const { keyword, keyvalue } = req.query;
        const sort = req.query.sort?.toUpperCase() === 'DESC' ? -1 : 1;

        const allowedColumns = ['TicketID', 'Issue', 'Resolved', 'AdminID', 'ClientID'];
        if (!allowedColumns.includes(keyword)) {
            return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
        }
        if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

        let value;
        if (keyword === 'TicketID' || keyword === 'AdminID' || keyword === 'ClientID') value = Number(keyvalue);
        else if (keyword === 'Resolved') value = keyvalue === 'true' || keyvalue === '1' || keyvalue === true;
        else value = keyvalue;

        const rows = await SupportTicket.find({ [keyword]: value }).sort({ TicketID: sort }).lean();
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
};

export const updateSupportTicket = async (req, res, next) => {
    try {
        const tid = Number(req.query.TicketID);
        const existing = await SupportTicket.findOne({ TicketID: tid });
        if (!existing) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${tid}] does not exist or has already been deleted. Update aborted.`,
            });
        }

        const $set = {};
        if (req.body.Issue    !== undefined) $set.Issue    = req.body.Issue;
        if (req.body.Resolved !== undefined) $set.Resolved = !!req.body.Resolved;
        if (req.body.AdminID  !== undefined) $set.AdminID  = req.body.AdminID == null ? null : Number(req.body.AdminID);
        if (req.body.ClientID !== undefined) $set.ClientID = Number(req.body.ClientID);

        await SupportTicket.updateOne({ TicketID: tid }, { $set });
        return res.status(200).json({ Status: "OK", Message: `Record Id [${tid}] is Updated Successfully` });
    } catch (err) {
        return next(err);
    }
};
