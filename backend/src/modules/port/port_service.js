import Port from '../../Database/mongo/port.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';
import { parseLocalizedInput } from '../../utils/localize.js';

const allowedPortTypes = ['Air', 'Sea'];

export const createPort = async (req, res, next) => {
  try {
    const { PortType, EstDate } = req.body;
    const PortName = parseLocalizedInput(req.body.PortName);

    if (!PortName || !PortType || !EstDate) {
      return res.status(400).json({
        Status: "Error",
        Message: "PortName, PortType, and EstDate are required.",
      });
    }
    if (!allowedPortTypes.includes(PortType)) {
      return res.status(400).json({
        Status: "Error",
        Message: `Invalid PortType. Allowed: ${allowedPortTypes.join(', ')}`,
      });
    }

    const PortID = await nextId('port');
    await Port.create({ PortID, PortName, PortType, EstDate });

    return res.status(201).json({ Status: "OK", Message: `Record Added Successfully with Id ${PortID}` });
  } catch (err) {
    return next(err);
  }
};

export const getPort = async (req, res, next) => {
  try {
    const { PortID } = req.query;
    if (PortID !== undefined && PortID !== '' && PortID !== '%') {
      const rows = await Port.find({ PortID: Number(PortID) }).lean();
      return res.json(rows);
    }
    const rows = await Port.find().sort({ PortID: 1 }).lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

/* Statuses that count as "currently using" a port. Completed / Accepted /
   Rejected applications are historical and safely preserved by the embedded
   `port` snapshot on the Application doc, so deleting the master Port row
   won't break their reads. */
const ACTIVE_APPLICATION_STATUSES = ['Pending', 'In Progress'];

export const deletePort = async (req, res, next) => {
  try {
    const pid = Number(req.query.PortID);

    const activeCount = await Application.countDocuments({
      PortID: pid,
      Status: { $in: ACTIVE_APPLICATION_STATUSES },
    });
    if (activeCount > 0) {
      return res.status(409).json({
        Status: "Error",
        Code: "PORT_IN_USE",
        ActiveApplications: activeCount,
        Message: `Cannot delete port: ${activeCount} active application${activeCount === 1 ? '' : 's'} still using it.`,
      });
    }

    const result = await Port.deleteOne({ PortID: pid });
    if (!result.deletedCount) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${pid}] does not exist or has already been deleted.`,
      });
    }

    /* Keep the embedded Company.ports[] array in sync — otherwise companies
       would carry a dangling PortID that no longer resolves. */
    await Company.updateMany(
      { 'ports.PortID': pid },
      { $pull: { ports: { PortID: pid } } }
    );

    return res.status(200).json({ Status: "OK", Message: `Record Id [${pid}] deleted Successfully` });
  } catch (err) {
    return next(err);
  }
};

/* Same shape as getPort, but annotates each row with the count of active
   applications referencing it. Used by the admin Ports tab to decide
   whether to render a delete or a frozen indicator. */
export const getPortsWithUsage = async (_req, res, next) => {
  try {
    /* Admin catalog editor needs both languages — return raw { en, ar }. */
    res.locals.skipLocalize = true;
    const ports = await Port.find().sort({ PortID: 1 }).lean();
    if (ports.length === 0) return res.json([]);

    const counts = await Application.aggregate([
      { $match: { Status: { $in: ACTIVE_APPLICATION_STATUSES }, PortID: { $ne: null } } },
      { $group: { _id: '$PortID', n: { $sum: 1 } } },
    ]);
    const byPort = new Map(counts.map((c) => [Number(c._id), c.n]));

    return res.json(ports.map((p) => ({
      ...p,
      ActiveApplications: byPort.get(Number(p.PortID)) || 0,
    })));
  } catch (err) {
    return next(err);
  }
};

export const searchPort = async (req, res, next) => {
  try {
    const { keyword, keyvalue } = req.query;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? -1 : 1;

    const allowedColumns = ['PortID', 'PortName', 'PortType', 'EstDate'];
    if (!allowedColumns.includes(keyword)) {
      return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

    /* PortName is now bilingual — match against either language. */
    let query;
    if (keyword === 'PortID') query = { PortID: Number(keyvalue) };
    else if (keyword === 'PortName') query = { $or: [{ 'PortName.en': keyvalue }, { 'PortName.ar': keyvalue }] };
    else query = { [keyword]: keyvalue };
    const rows = await Port.find(query).sort({ PortID: sort }).lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

export const updatePort = async (req, res, next) => {
  try {
    const pid = Number(req.query.PortID);
    const existing = await Port.findOne({ PortID: pid });
    if (!existing) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${pid}] does not exist or has already been deleted. Update aborted.`,
      });
    }

    /* Merge incoming { en, ar } over the existing pair so a partial PUT
       doesn't blank the other language. */
    const incoming = parseLocalizedInput(req.body.PortName);
    const PortName = {
      en: incoming?.en ?? existing.PortName.en,
      ar: incoming?.ar ?? existing.PortName.ar,
    };
    const PortType = req.body.PortType !== undefined ? req.body.PortType : existing.PortType;
    const EstDate  = req.body.EstDate  !== undefined ? req.body.EstDate  : existing.EstDate;

    if (!allowedPortTypes.includes(PortType)) {
      return res.status(400).json({
        Status: "Error",
        Message: `Invalid PortType. Allowed: ${allowedPortTypes.join(', ')}`,
      });
    }

    await Port.updateOne({ PortID: pid }, { $set: { PortName, PortType, EstDate } });

    /* Fan out the full { en, ar } object to every denormalized snapshot. */
    await Company.updateMany(
      { 'ports.PortID': pid },
      { $set: { 'ports.$.PortName': PortName, 'ports.$.PortType': PortType } }
    );
    await Application.updateMany(
      { PortID: pid },
      { $set: { 'port.PortName': PortName, 'port.PortType': PortType } }
    );

    return res.status(200).json({ Status: "OK", Message: `Record Id [${pid}] is Updated Successfully` });
  } catch (err) {
    return next(err);
  }
};
