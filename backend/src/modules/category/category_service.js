import Category from '../../Database/mongo/category.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';
import Review from '../../Database/mongo/review.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';

/* Same definition as the port module: a category is "in use" only if at
   least one application that references it is still being worked on. Once
   the application is Completed / Accepted / Rejected the embedded
   `category` snapshot keeps the historical name visible, so dropping the
   master Category row doesn't break those reads. */
const ACTIVE_APPLICATION_STATUSES = ['Pending', 'In Progress'];

export const createCategory = async (req, res, next) => {
  try {
    const raw = typeof req.body.Type === 'string' ? req.body.Type.trim() : '';
    if (!raw) {
      return res.status(400).json({ Status: "Error", Message: "Category Type is required." });
    }
    /* Case-insensitive uniqueness — admins can rename freely, but we don't
       want two rows that only differ in capitalization. */
    const existing = await Category.findOne({ Type: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean();
    if (existing) {
      return res.status(409).json({
        Status: "Error",
        Code: "CATEGORY_EXISTS",
        Message: `A category named "${existing.Type}" already exists.`,
      });
    }

    const CategoryID = await nextId('category');
    await Category.create({ CategoryID, Type: raw });
    return res.status(201).json({ Status: "OK", Message: `Record Added Successfully with Id ${CategoryID}`, CategoryID, Type: raw });
  } catch (err) {
    return next(err);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    const { CategoryID } = req.query;
    if (CategoryID !== undefined && CategoryID !== '' && CategoryID !== '%') {
      const cid = Number(CategoryID);
      const rows = await Category.find({ CategoryID: cid }).lean();
      return res.json(rows);
    }
    const rows = await Category.find().sort({ CategoryID: 1 }).lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

/* Admin Categories tab needs to know which rows are safe to delete. We
   annotate each category with the count of active applications referencing
   it so the UI can render a Frozen badge instead of a Delete button. */
export const getCategoriesWithUsage = async (_req, res, next) => {
  try {
    const cats = await Category.find().sort({ CategoryID: 1 }).lean();
    if (cats.length === 0) return res.json([]);

    const counts = await Application.aggregate([
      { $match: { Status: { $in: ACTIVE_APPLICATION_STATUSES }, CategoryID: { $ne: null } } },
      { $group: { _id: '$CategoryID', n: { $sum: 1 } } },
    ]);
    const byCat = new Map(counts.map((c) => [Number(c._id), c.n]));

    return res.json(cats.map((c) => ({
      ...c,
      ActiveApplications: byCat.get(Number(c.CategoryID)) || 0,
    })));
  } catch (err) {
    return next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const cid = Number(req.query.CategoryID);

    const activeCount = await Application.countDocuments({
      CategoryID: cid,
      Status: { $in: ACTIVE_APPLICATION_STATUSES },
    });
    if (activeCount > 0) {
      return res.status(409).json({
        Status: "Error",
        Code: "CATEGORY_IN_USE",
        ActiveApplications: activeCount,
        Message: `Cannot delete category: ${activeCount} active application${activeCount === 1 ? '' : 's'} still using it.`,
      });
    }

    const result = await Category.deleteOne({ CategoryID: cid });
    if (!result.deletedCount) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${cid}] does not exist or has already been deleted.`,
      });
    }

    /* Keep the embedded Company.categories[] arrays clean — otherwise a
       company would carry a price row pointing at a category that no
       longer resolves. */
    await Company.updateMany(
      { 'categories.CategoryID': cid },
      { $pull: { categories: { CategoryID: cid } } }
    );

    return res.status(200).json({ Status: "OK", Message: `Record Id [${cid}] deleted Successfully` });
  } catch (err) {
    return next(err);
  }
};

export const searchCategory = async (req, res, next) => {
  try {
    const { keyword, keyvalue } = req.query;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? -1 : 1;

    const allowedColumns = ['CategoryID', 'Type'];
    if (!allowedColumns.includes(keyword)) {
      return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

    const value = keyword === 'CategoryID' ? Number(keyvalue) : keyvalue;
    const rows = await Category.find({ [keyword]: value }).sort({ CategoryID: sort }).lean();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

/* Renaming a Category type fans out to every embedded snapshot that
   stores the old value: Company.categories[].Type, Application.category.Type,
   and Review.category.Type. */
export const updateCategory = async (req, res, next) => {
  try {
    const cid = Number(req.query.CategoryID);
    const existing = await Category.findOne({ CategoryID: cid });
    if (!existing) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${cid}] does not exist or has already been deleted. Update aborted.`,
      });
    }

    const incoming = typeof req.body.Type === 'string' ? req.body.Type.trim() : undefined;
    const Type = incoming !== undefined && incoming !== '' ? incoming : existing.Type;

    /* Block renames that would collide with another existing category. */
    if (Type.toLowerCase() !== existing.Type.toLowerCase()) {
      const clash = await Category.findOne({
        CategoryID: { $ne: cid },
        Type: new RegExp(`^${Type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      }).lean();
      if (clash) {
        return res.status(409).json({
          Status: "Error",
          Code: "CATEGORY_EXISTS",
          Message: `Another category named "${clash.Type}" already exists.`,
        });
      }
    }

    await Category.updateOne({ CategoryID: cid }, { $set: { Type } });

    await Company.updateMany(
      { 'categories.CategoryID': cid },
      { $set: { 'categories.$.Type': Type } }
    );
    await Application.updateMany(
      { CategoryID: cid },
      { $set: { 'category.Type': Type } }
    );
    await Review.updateMany(
      { CategoryID: cid },
      { $set: { 'category.Type': Type } }
    );

    return res.status(200).json({ Status: "OK", Message: `Record Id [${cid}] is Updated Successfully` });
  } catch (err) {
    return next(err);
  }
};
