import Category from '../../Database/mongo/category.mongo.js';
import Company from '../../Database/mongo/company.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';
import Review from '../../Database/mongo/review.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';

export const createCategory = async (req, res, next) => {
  try {
    const { Type } = req.body;
    const CategoryID = await nextId('category');
    await Category.create({ CategoryID, Type });
    return res.status(201).json({ Status: "OK", Message: `Record Added Successfully with Id ${CategoryID}` });
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

export const deleteCategory = async (req, res, next) => {
  try {
    const cid = Number(req.query.CategoryID);
    const result = await Category.deleteOne({ CategoryID: cid });
    if (!result.deletedCount) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${cid}] does not exist or has already been deleted.`,
      });
    }
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

    const Type = req.body.Type !== undefined ? req.body.Type : existing.Type;
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
