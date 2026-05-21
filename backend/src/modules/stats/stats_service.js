import Company from '../../Database/mongo/company.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';

const ACTIVE_STATUSES = ['Pending', 'In Progress', 'Accepted'];
const IN_MOTION_STATUSES = ['In Progress', 'Accepted'];

const sumPayments = (payments) =>
  Array.isArray(payments) ? payments.reduce((acc, p) => acc + (Number(p?.Amount) || 0), 0) : 0;

/* Strip an application down to non-identifying operational fields. The
   landing page is public, so company names and client identity must never
   leave the server here — only the fee (number), document count (number),
   and shipment-level metadata (tracking, category, port) are exposed. */
const sanitizeApplication = (app) => ({
  TrackingNumber: app.TrackingNumber || null,
  Status: app.Status || null,
  SubmissionDate: app.SubmissionDate || null,
  Fee: sumPayments(app.payments),
  DocsSubmitted: Array.isArray(app.documents) ? app.documents.length : 0,
  CategoryType: app.category?.Type || null,
  PortName: app.port?.PortName || null,
  PortType: app.port?.PortType || null,
});

export const getLandingStats = async (_req, res, next) => {
  try {
    const [
      verifiedAgencies,
      containersCleared,
      totalApplications,
      inMotion,
      featuredDoc,
      recentDocs,
      activationSample,
    ] = await Promise.all([
      Company.countDocuments({ VerficationStatus: 'Verified' }),
      Application.countDocuments({ Status: 'Completed' }),
      Application.countDocuments({}),
      Application.countDocuments({ Status: { $in: IN_MOTION_STATUSES } }),
      Application.findOne({ Status: { $in: IN_MOTION_STATUSES } })
        .sort({ updatedAt: -1, _id: -1 })
        .lean(),
      Application.find({})
        .sort({ updatedAt: -1, _id: -1 })
        .limit(4)
        .select('TrackingNumber Status updatedAt port')
        .lean(),
      // For the activation countdown seed: time from submission to first
      // payment, averaged across recently-paid applications.
      Application.find({ 'payments.0': { $exists: true } })
        .sort({ _id: -1 })
        .limit(50)
        .select('SubmissionDate payments')
        .lean(),
    ]);

    // On-time milestone rate: completed out of all applications.
    const onTimePct = totalApplications > 0
      ? Math.round((containersCleared / totalApplications) * 1000) / 10
      : null;

    // Average activation seconds, clamped to a sane countdown range. Falls
    // back to 134s (2m 14s) when there's no payment history yet.
    let avgActivationSeconds = 134;
    const durations = activationSample
      .map((a) => {
        const first = a.payments?.reduce((min, p) => {
          const t = new Date(p.PaymentDate).getTime();
          return Number.isFinite(t) && t < min ? t : min;
        }, Infinity);
        const start = new Date(a.SubmissionDate).getTime();
        if (!Number.isFinite(first) || !Number.isFinite(start)) return null;
        return Math.round((first - start) / 1000);
      })
      .filter((d) => Number.isFinite(d) && d > 0);
    if (durations.length) {
      const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
      avgActivationSeconds = Math.min(599, Math.max(45, Math.round(avg)));
    }

    const recent = recentDocs.map((d) => ({
      time: d.updatedAt
        ? new Date(d.updatedAt).toISOString().slice(11, 16) // HH:MM (UTC)
        : '—',
      id: d.TrackingNumber || '—',
      event: d.Status || '—',
      port: d.port?.PortName || '—',
    }));

    return res.json({
      ok: true,
      data: {
        verifiedAgencies,
        containersCleared,
        onTimePct,
        inMotion,
        avgActivationSeconds,
        featured: featuredDoc ? sanitizeApplication(featuredDoc) : null,
        recent,
      },
    });
  } catch (err) {
    return next(err);
  }
};
