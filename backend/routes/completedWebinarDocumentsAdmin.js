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

    // Include webinars that have uploaded completed docs in either the new documents collection
    // or the older completed-details collection, so the Download link appears correctly.
    const docs = await CompletedWebinarDocuments.find({}).lean();
    const legacyDocs = await CompletedWebinarDetails.find({}).lean();

    const docByWebinarId = Object.fromEntries(docs.map(d => [String(d.webinarId), d]));
    const legacyDocByWebinarId = Object.fromEntries(legacyDocs.map(d => [String(d.webinarId), d]));

    const webinarIdsWithDocs = new Set([
      ...Object.keys(docByWebinarId),
      ...Object.keys(legacyDocByWebinarId),
    ]);

    // Join with Webinar to get phaseId/topic/webinarDate/domain (as department mapping handled in frontend or server)
    const webinars = await Webinar.find({
      $or: [
        { _id: { $in: Array.from(webinarIdsWithDocs) } },
        { status: 'Completed' },
      ],
    })
      .select('phaseId domain topic webinarDate attendedCount status')
      .lean();

    // Registered count from Register collection
    const rows = await Promise.all(
      webinars.map(async (w) => {
        const registeredCount = await WebinarRegister.countDocuments({ webinarId: w._id });
        const attendedCount = w.attendedCount ?? 0;

        const d = docByWebinarId[String(w._id)] || legacyDocByWebinarId[String(w._id)] || {};
        const hasDocs = Boolean((d.attendanceSheet && String(d.attendanceSheet).length > 0) || (Array.isArray(d.eventImages) && d.eventImages.length > 0));

        return {
          webinarId: w._id,
          phaseId: w.phaseId ?? null,
          department: w.domain ?? null,
          topic: w.topic ?? null,
          webinarDate: w.webinarDate ?? null,
          registeredCount,
          attendedCount,
          hasDocuments: hasDocs,
        };
      })
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('completed docs admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

