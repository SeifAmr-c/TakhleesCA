import Company from '../../Database/mongo/company.mongo.js';
import Port from '../../Database/mongo/port.mongo.js';

/* The CompanyPort "join table" is folded into Company.ports[]. These
   handlers manipulate that embedded array and shape responses to match
   the legacy row-oriented API the frontend already calls. */

export const createCompanyPort = async (req, res, next) => {
  try {
    const { CompanyID, PortID } = req.body;
    if (!CompanyID || !PortID) {
      return res.status(400).json({
        Status: "Error",
        Message: "CompanyID and PortID are required.",
      });
    }
    const cid = Number(CompanyID);
    const pid = Number(PortID);

    const company = await Company.findOne({ CompanyID: cid });
    if (!company) {
      return res.status(404).json({ Status: "Error", Message: `Company [${cid}] not found.` });
    }
    if ((company.ports || []).some((p) => p.PortID === pid)) {
      return res.status(409).json({
        Status: "Error",
        Message: `Link between CompanyID [${cid}] and PortID [${pid}] already exists.`,
      });
    }

    const port = await Port.findOne({ PortID: pid }).lean();
    await Company.updateOne(
      { CompanyID: cid },
      { $push: { ports: {
        PortID: pid,
        PortName: port?.PortName ?? null,
        PortType: port?.PortType ?? null,
      } } }
    );

    return res.status(201).json({
      Status: "OK",
      Message: `Record Added Successfully (CompanyID=${cid}, PortID=${pid})`,
    });
  } catch (err) {
    return next(err);
  }
};

export const getCompanyPort = async (req, res, next) => {
  try {
    const { CompanyID, PortID } = req.query;

    if (CompanyID && PortID) {
      const cid = Number(CompanyID);
      const pid = Number(PortID);
      const company = await Company.findOne({ CompanyID: cid }, { ports: 1 }).lean();
      const sub = (company?.ports || []).find((p) => p.PortID === pid);
      return res.json(sub ? [{ CompanyID: cid, PortID: pid, ...sub }] : []);
    }
    if (CompanyID) {
      const cid = Number(CompanyID);
      const company = await Company.findOne({ CompanyID: cid }, { ports: 1 }).lean();
      const rows = (company?.ports || []).map((p) => ({
        CompanyID: cid,
        PortID: p.PortID,
        PortName: p.PortName,
        PortType: p.PortType,
      }));
      return res.json(rows);
    }
    if (PortID) {
      const pid = Number(PortID);
      const companies = await Company.find(
        { 'ports.PortID': pid },
        { CompanyID: 1, Name: 1 }
      ).lean();
      const rows = companies.map((c) => ({
        CompanyID: c.CompanyID,
        PortID: pid,
        CompanyName: c.Name,
      }));
      return res.json(rows);
    }

    /* No filter: flatten every Company's ports array into one list. */
    const all = await Company.find({}, { CompanyID: 1, ports: 1 }).lean();
    const rows = all.flatMap((c) =>
      (c.ports || []).map((p) => ({ CompanyID: c.CompanyID, PortID: p.PortID }))
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

export const deleteCompanyPort = async (req, res, next) => {
  try {
    const { CompanyID, PortID } = req.query;
    if (!CompanyID || !PortID) {
      return res.status(400).json({
        Status: "Error",
        Message: "CompanyID and PortID query params are required.",
      });
    }
    const cid = Number(CompanyID);
    const pid = Number(PortID);

    const result = await Company.updateOne(
      { CompanyID: cid, 'ports.PortID': pid },
      { $pull: { ports: { PortID: pid } } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({
        Status: "Error",
        Message: `Link (CompanyID=${cid}, PortID=${pid}) does not exist or has already been deleted.`,
      });
    }
    return res.status(200).json({
      Status: "OK",
      Message: `Link (CompanyID=${cid}, PortID=${pid}) deleted Successfully`,
    });
  } catch (err) {
    return next(err);
  }
};

export const searchCompanyPort = async (req, res, next) => {
  try {
    const { keyword, keyvalue } = req.query;
    const allowedColumns = ['CompanyID', 'PortID'];
    if (!allowedColumns.includes(keyword)) {
      return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

    const value = Number(keyvalue);
    if (keyword === 'CompanyID') {
      const company = await Company.findOne({ CompanyID: value }, { ports: 1 }).lean();
      const rows = (company?.ports || []).map((p) => ({ CompanyID: value, PortID: p.PortID }));
      return res.json(rows);
    }
    /* keyword === 'PortID' */
    const companies = await Company.find({ 'ports.PortID': value }, { CompanyID: 1 }).lean();
    const rows = companies.map((c) => ({ CompanyID: c.CompanyID, PortID: value }));
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};
