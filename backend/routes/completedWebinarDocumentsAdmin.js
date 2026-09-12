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

    const docs = await CompletedWebinarDocuments.find({}).lean();
    const legacyDocs = CompletedWebinarDetails ? await CompletedWebinarDetails.find({}).lean() : [];

    const docByWebinarId = Object.fromEntries(docs.map(d => [String(d.webinarId), d]));
    legacyDocs.forEach((d) => {
      const key = String(d.webinarId);
      if (!docByWebinarId[key]) {
        docByWebinarId[key] = d;
      }
    });

    const webinarIds = Object.keys(docByWebinarId);
    const webinars = await Webinar.find({
      $or: [
        { _id: { $in: webinarIds } },
        { status: 'Completed' },
      ],
    })
      .select('phaseId domain topic webinarDate attendedCount status')
      .lean();

    const rows = await Promise.all(
      webinars.map(async (w) => {
        const registeredCount = await WebinarRegister.countDocuments({ webinarId: w._id });
        const attendedCount = w.attendedCount ?? 0;
        const absenteeCount = registeredCount > attendedCount ? registeredCount - attendedCount : null;

        const d = docByWebinarId[String(w._id)] || {};
        const hasSignedReport = Boolean(d.signedReport && String(d.signedReport).length > 0);
        const hasDocs = Boolean(
          (d.attendanceSheet && String(d.attendanceSheet).length > 0) ||
          hasSignedReport ||
          (Array.isArray(d.eventImages) && d.eventImages.length > 0)
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
      })
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('completed docs admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
