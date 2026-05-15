import Review from '../../Database/mongo/review.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';
import User from '../../Database/mongo/user.mongo.js';
import Category from '../../Database/mongo/category.mongo.js';
import { nextId } from '../../Database/mongo/counters.js';

export const getReviewAverages = async (req, res, next) => {
    try {
        const rows = await Review.aggregate([
            { $match: { CompanyID: { $ne: null } } },
            { $group: { _id: '$CompanyID', avg: { $avg: '$Rating' }, count: { $sum: 1 } } },
            { $project: {
                _id: 0,
                CompanyID: '$_id',
                AverageRating: { $round: ['$avg', 1] },
                ReviewCount: '$count',
            } },
        ]);
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
};

export const getClientReviewedApplications = async (req, res, next) => {
    try {
        const { ClientID } = req.query;
        if (!ClientID) {
            return res.status(400).json({ error: 'ClientID is required' });
        }
        const rows = await Review.find({ ClientID: Number(ClientID) }).select({ ApplicationID: 1, _id: 0 }).lean();
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
};

export const getCompanyReviews = async (req, res, next) => {
    try {
        const { CompanyID } = req.query;
        if (!CompanyID) {
            return res.status(400).json({ error: 'CompanyID is required' });
        }
        const rows = await Review.find({ CompanyID: Number(CompanyID) }).sort({ ReviewID: -1 }).lean();
        return res.json(rows.map((r) => ({
            ReviewID: r.ReviewID,
            Review: r.Review,
            Rating: r.Rating,
            ApplicationID: r.ApplicationID,
            CategoryID: r.CategoryID,
            FirstName: r.client?.FirstName ?? null,
            LastName: r.client?.LastName ?? null,
        })));
    } catch (err) {
        return next(err);
    }
};

export const createReview = async (req, res, next) => {
    try {
        const ApplicationID = Number(req.body.ApplicationID);
        const CategoryID = Number(req.body.CategoryID);
        const Rating = Number(req.body.Rating);
        const ReviewText = req.body.Review ?? null;

        /* Pull CompanyID/ClientID and the denormalized snapshots from
           the parent Application so per-company review aggregates and
           UI lists don't need a separate join on every read. */
        const app = await Application.findOne({ ApplicationID }).select({
            CompanyID: 1, ClientID: 1, client: 1,
        }).lean();

        let categorySnap = null;
        if (CategoryID) {
            const cat = await Category.findOne({ CategoryID }).select({ Type: 1 }).lean();
            if (cat) categorySnap = { Type: cat.Type };
        }

        const ReviewID = await nextId('review');
        await Review.create({
            ReviewID,
            Review: ReviewText,
            Rating,
            ApplicationID,
            CategoryID,
            CompanyID: app?.CompanyID ?? null,
            ClientID:  app?.ClientID  ?? null,
            client:    app?.client ?? null,
            category:  categorySnap,
        });

        return res.status(201).json({ Status: "OK", Message: `Record Added Successfully with Id ${ReviewID}` });
    } catch (err) {
        return next(err);
    }
};

export const getReview = async (req, res, next) => {
    try {
        const { ReviewID } = req.query;
        if (ReviewID === '%' || ReviewID === undefined) {
            const rows = await Review.find().sort({ ReviewID: 1 }).lean();
            return res.json(rows);
        }
        const rows = await Review.find({ ReviewID: Number(ReviewID) }).lean();
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
};

export const deleteReview = async (req, res, next) => {
    try {
        const rid = Number(req.query.ReviewID);
        const result = await Review.deleteOne({ ReviewID: rid });
        if (!result.deletedCount) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${rid}] does not exist or has already been deleted.`,
            });
        }
        return res.status(200).json({ Status: "OK", Message: `Record Id [${rid}] deleted Successfully` });
    } catch (err) {
        return next(err);
    }
};

export const searchReview = async (req, res, next) => {
    try {
        const { keyword, keyvalue } = req.query;
        const sort = req.query.sort?.toUpperCase() === 'DESC' ? -1 : 1;

        const allowedColumns = ['ReviewID', 'Rating', 'ApplicationID', 'CategoryID'];
        if (!allowedColumns.includes(keyword)) {
            return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
        }
        if (!keyvalue) return res.status(400).json({ error: 'keyvalue is required' });

        const rows = await Review.find({ [keyword]: Number(keyvalue) }).sort({ ReviewID: sort }).lean();
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
};

export const updateReview = async (req, res, next) => {
    try {
        const rid = Number(req.query.ReviewID);
        const existing = await Review.findOne({ ReviewID: rid });
        if (!existing) {
            return res.status(404).json({
                Status: "Error",
                Message: `Record Id [${rid}] does not exist or has already been deleted. Update aborted.`,
            });
        }

        const $set = {};
        if (req.body.Review        !== undefined) $set.Review        = req.body.Review;
        if (req.body.Rating        !== undefined) $set.Rating        = Number(req.body.Rating);
        if (req.body.ApplicationID !== undefined) $set.ApplicationID = Number(req.body.ApplicationID);
        if (req.body.CategoryID    !== undefined) $set.CategoryID    = Number(req.body.CategoryID);

        await Review.updateOne({ ReviewID: rid }, { $set });
        return res.status(200).json({ Status: "OK", Message: `Record Id [${rid}] is Updated Successfully` });
    } catch (err) {
        return next(err);
    }
};
