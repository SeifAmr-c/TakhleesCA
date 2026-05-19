import Company from '../../Database/mongo/company.mongo.js';
import Category from '../../Database/mongo/category.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';

/* Same definition as the port module — only Pending / In Progress
   applications block the company from removing a category. */
const ACTIVE_APPLICATION_STATUSES = ['Pending', 'In Progress'];

/* CompanyCategory was the SQL join table holding (CompanyID, CategoryID, Price).
   In Mongo it is folded into Company.categories[]. These handlers operate on
   that embedded array but preserve the legacy join-table API shape. */

export const createCompanyCategory = async (req, res, next) => {
  try {
    const { CompanyID, CategoryID, Price } = req.body;
    if (!CompanyID || !CategoryID) {
      return res.status(400).json({
        Status: "Error",
        Message: "CompanyID and CategoryID are required.",
      });
    }
    if (Price === undefined || Price === null || isNaN(Number(Price))) {
      return res.status(400).json({
        Status: "Error",
        Message: "Price is required and must be a number.",
      });
    }
    const cid = Number(CompanyID);
    const catId = Number(CategoryID);

    const company = await Company.findOne({ CompanyID: cid });
    if (!company) {
      return res.status(404).json({ Status: "Error", Message: `Company [${cid}] not found.` });
    }
    if ((company.categories || []).some((c) => c.CategoryID === catId)) {
      return res.status(409).json({
        Status: "Error",
        Message: `Link between CompanyID [${cid}] and CategoryID [${catId}] already exists.`,
      });
    }

    const cat = await Category.findOne({ CategoryID: catId }).lean();
    await Company.updateOne(
      { CompanyID: cid },
      { $push: { categories: {
        CategoryID: catId,
        Type: cat?.Type ?? null,
        Price: Number(Price),
      } } }
    );

    return res.status(201).json({
      Status: "OK",
      Message: `Record Added Successfully (CompanyID=${cid}, CategoryID=${catId})`,
    });
  } catch (err) {
    return next(err);
  }
};

export const getCompanyCategory = async (req, res, next) => {
  try {
    const { CompanyID, CategoryID } = req.query;

    if (CompanyID && CategoryID) {
      const cid = Number(CompanyID);
      const catId = Number(CategoryID);
      const company = await Company.findOne({ CompanyID: cid }, { categories: 1 }).lean();
      const sub = (company?.categories || []).find((c) => c.CategoryID === catId);
      return res.json(sub
        ? [{ CompanyID: cid, CategoryID: catId, Price: sub.Price, Type: sub.Type }]
        : []
      );
    }
    if (CompanyID) {
      const cid = Number(CompanyID);
      const company = await Company.findOne({ CompanyID: cid }, { categories: 1 }).lean();
      const rows = (company?.categories || []).map((c) => ({
        CompanyID: cid,
        CategoryID: c.CategoryID,
        Price: c.Price,
        Type: c.Type,
      }));
      return res.json(rows);
    }
    if (CategoryID) {
      const catId = Number(CategoryID);
      const companies = await Company.find(
        { 'categories.CategoryID': catId },
        { CompanyID: 1, Name: 1, categories: 1 }
      ).lean();
      const rows = companies.map((c) => {
        const sub = (c.categories || []).find((cc) => cc.CategoryID === catId);
        return {
          CompanyID: c.CompanyID,
          CategoryID: catId,
          Price: sub?.Price ?? null,
          CompanyName: c.Name,
        };
      });
      return res.json(rows);
    }

    const all = await Company.find({}, { CompanyID: 1, categories: 1 }).lean();
    const rows = all.flatMap((c) =>
      (c.categories || []).map((cc) => ({
        CompanyID: c.CompanyID,
        CategoryID: cc.CategoryID,
        Price: cc.Price,
      }))
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

export const updateCompanyCategory = async (req, res, next) => {
  try {
    const { CompanyID, CategoryID } = req.query;
    if (!CompanyID || !CategoryID) {
      return res.status(400).json({
        Status: "Error",
        Message: "CompanyID and CategoryID query params are required.",
      });
    }
    const cid = Number(CompanyID);
    const catId = Number(CategoryID);

    const result = await Company.updateOne(
      { CompanyID: cid, 'categories.CategoryID': catId },
      { $set: { 'categories.$.Price': Number(req.body.Price) } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({
        Status: "Error",
        Message: `Link (CompanyID=${cid}, CategoryID=${catId}) does not exist. Update aborted.`,
      });
    }
    return res.status(200).json({
      Status: "OK",
      Message: `Link (CompanyID=${cid}, CategoryID=${catId}) is Updated Successfully`,
    });
  } catch (err) {
    return next(err);
  }
};

export const deleteCompanyCategory = async (req, res, next) => {
  try {
    const { CompanyID, CategoryID } = req.query;
    if (!CompanyID || !CategoryID) {
      return res.status(400).json({
        Status: "Error",
        Message: "CompanyID and CategoryID query params are required.",
      });
    }
    const cid = Number(CompanyID);
    const catId = Number(CategoryID);

    const activeCount = await Application.countDocuments({
      CompanyID: cid,
      CategoryID: catId,
      Status: { $in: ACTIVE_APPLICATION_STATUSES },
    });
    if (activeCount > 0) {
      return res.status(409).json({
        Status: "Error",
        Code: "CATEGORY_IN_USE",
        ActiveApplications: activeCount,
        Message: `Cannot remove category: ${activeCount} active application${activeCount === 1 ? '' : 's'} still using it.`,
      });
    }

    const result = await Company.updateOne(
      { CompanyID: cid, 'categories.CategoryID': catId },
      { $pull: { categories: { CategoryID: catId } } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({
        Status: "Error",
        Message: `Link (CompanyID=${cid}, CategoryID=${catId}) does not exist or has already been deleted.`,
      });
    }
    return res.status(200).json({
      Status: "OK",
      Message: `Link (CompanyID=${cid}, CategoryID=${catId}) deleted Successfully`,
    });
  } catch (err) {
    return next(err);
  }
};

export const searchCompanyCategory = async (req, res, next) => {
  try {
    const { keyword, keyvalue } = req.query;
    const allowedColumns = ['CompanyID', 'CategoryID', 'Price'];
    if (!allowedColumns.includes(keyword)) {
      return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

    const value = Number(keyvalue);
    if (keyword === 'CompanyID') {
      const c = await Company.findOne({ CompanyID: value }, { categories: 1 }).lean();
      return res.json((c?.categories || []).map((cc) => ({
        CompanyID: value, CategoryID: cc.CategoryID, Price: cc.Price,
      })));
    }
    if (keyword === 'CategoryID') {
      const cs = await Company.find({ 'categories.CategoryID': value }, { CompanyID: 1, categories: 1 }).lean();
      return res.json(cs.map((c) => {
        const sub = (c.categories || []).find((cc) => cc.CategoryID === value);
        return { CompanyID: c.CompanyID, CategoryID: value, Price: sub?.Price ?? null };
      }));
    }
    /* keyword === 'Price' */
    const cs = await Company.find({ 'categories.Price': value }, { CompanyID: 1, categories: 1 }).lean();
    const rows = [];
    for (const c of cs) {
      for (const cc of (c.categories || [])) {
        if (cc.Price === value) rows.push({ CompanyID: c.CompanyID, CategoryID: cc.CategoryID, Price: cc.Price });
      }
    }
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};
