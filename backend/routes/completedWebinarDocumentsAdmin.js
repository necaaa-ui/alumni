const express = require('express');

const router = express.Router();

// Returns rows for admin "Webinar Details Active Page"
// Columns expected:
// Phase ID, Department, Webinar Topic, Webinar Date, Registered Count, Attended Count, Documents (download link)
router.get('/admin/webinars/completed-documents', async (req, res) => {
  try {
    const Webinar = req.app.locals.Webinar;
    const CompletedWebinarDetails = req.app.locals.CompletedWebinarDetails;
    const CompletedWebinarDocuments = req.app.locals.CompletedWebinarDocuments;
    const WebinarRegister = req.app.locals.Register;

    if (!Webinar || !CompletedWebinarDocuments || !WebinarRegister) {
      return res.status(500).json({ error: 'Required models not available' });
    }

    // Project only presence flags. Attendance sheets and reports can contain
    // large base64 payloads; loading those blobs just to render this table is
    // needlessly slow.
    const documentPresencePipeline = [
      {
        $project: {
          webinarId: 1,
          hasAttendanceSheet: { $ne: [{ $ifNull: ['$attendanceSheet', ''] }, ''] },
          hasSignedReport: { $ne: [{ $ifNull: ['$signedReport', ''] }, ''] },
          hasEventImages: { $gt: [{ $size: { $ifNull: ['$eventImages', []] } }, 0] },
        },
      },
    ];
    const [docs, legacyDocs] = await Promise.all([
      CompletedWebinarDocuments.aggregate(documentPresencePipeline),
      CompletedWebinarDetails
        ? CompletedWebinarDetails.aggregate(documentPresencePipeline)
        : Promise.resolve([]),
    ]);

    const presenceByWebinarId = new Map();
    [...docs, ...legacyDocs].forEach((doc) => {
      const key = String(doc.webinarId);
      const existing = presenceByWebinarId.get(key) || {};
      presenceByWebinarId.set(key, {
        hasAttendanceSheet: existing.hasAttendanceSheet || doc.hasAttendanceSheet,
        hasSignedReport: existing.hasSignedReport || doc.hasSignedReport,
        hasEventImages: existing.hasEventImages || doc.hasEventImages,
      });
    });

    const webinarIds = [...presenceByWebinarId.keys()];
    const webinars = await Webinar.find({
      $or: [
        { _id: { $in: webinarIds } },
        { status: 'Completed' },
      ],
    })
      .select('phaseId domain topic webinarDate attendedCount status')
      .lean();

    const registrationCounts = webinars.length
      ? await WebinarRegister.aggregate([
          { $match: { webinarId: { $in: webinars.map((webinar) => webinar._id) } } },
          { $group: { _id: '$webinarId', count: { $sum: 1 } } },
        ])
      : [];
    const registrationCountByWebinarId = new Map(
      registrationCounts.map((item) => [String(item._id), item.count])
    );

    const rows = webinars.map((w) => {
        const registeredCount = registrationCountByWebinarId.get(String(w._id)) || 0;
        const attendedCount = w.attendedCount ?? 0;
        const absenteeCount = registeredCount > attendedCount ? registeredCount - attendedCount : null;

        const documentPresence = presenceByWebinarId.get(String(w._id)) || {};
        const hasSignedReport = Boolean(documentPresence.hasSignedReport);
        const hasDocs = Boolean(
          documentPresence.hasAttendanceSheet ||
          hasSignedReport ||
          documentPresence.hasEventImages
        );

        return {
          webinarId: w._id,
          phaseId: w.phaseId ?? null,
          department: w.domain ?? null,
          topic: w.topic ?? null,
          webinarDate: w.webinarDate ?? null,
          registeredCount,
          attendedCount,
          absenteeCount,
          hasSignedReport,
          hasDocuments: hasDocs,
        };
      });

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('completed docs admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

