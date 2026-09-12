const express = require('express');
const router = express.Router();
const archiverImport = require('archiver');
// archiver has different export shapes across versions/builds
const createArchiver = typeof archiverImport === 'function'
  ? archiverImport
  : (archiverImport?.default || archiverImport?.archiver || null);

// (path/fs imported previously but not used in this route)


function base64ToBuffer(data) {
  if (!data) return Buffer.alloc(0);
  if (Buffer.isBuffer(data)) return data;
  if (typeof data !== 'string') return Buffer.from(String(data));

  // If data is a data URL (data:<mime>;base64,...)
  const match = data.match(/^data:.*;base64,(.*)$/);
  const b64 = match ? match[1] : data;
  return Buffer.from(b64, 'base64');
}

router.get('/admin/webinars/:webinarId/completed-documents/download', async (req, res) => {
  try {
    const { webinarId } = req.params;
    if (!webinarId) return res.status(400).json({ error: 'webinarId is required' });

    const CompletedWebinarDocuments = req.app.locals.CompletedWebinarDocuments;
    const CompletedWebinarDetails = req.app.locals.CompletedWebinarDetails;
    if (!CompletedWebinarDocuments) return res.status(500).json({ error: 'Documents model not configured' });

    const doc = await CompletedWebinarDocuments.findOne({ webinarId });
    if (!doc) return res.status(404).json({ error: 'Completed documents not found for this webinar' });

    const webinarTopic = (req.app.locals.Webinar?.topic || 'webinar').toString().trim();
    // Keep topic as-is for readability, but remove characters that break filenames.
    const webinarTopicSafe = webinarTopic.replace(/[\\/:*?"<>|]+/g, '_');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="completed_webinar_${webinarId}.zip"`
    );

    let archive;
    // archiver v8 may not be a callable factory in some bundlers; use ZipArchive directly.
    if (createArchiver) {
      archive = createArchiver('zip', { zlib: { level: 9 } });
    } else if (archiverImport?.ZipArchive) {
      archive = new archiverImport.ZipArchive('zip', { zlib: { level: 9 } });
    } else if (archiverImport?.default?.ZipArchive) {
      archive = new archiverImport.default.ZipArchive('zip', { zlib: { level: 9 } });
    } else {
      console.error('archiver import is invalid:', archiverImport);
      return res.status(500).json({ error: 'archiver module not available/invalid' });
    }


    archive.on('error', (err) => {
      console.error('ZIP error:', err);
      res.status(500).end();
    });

    archive.pipe(res);

    // Attendance sheet
    if (doc.attendanceSheet) {
      const buf = base64ToBuffer(doc.attendanceSheet);
      archive.append(buf, { name: 'AttendanceSheet.xlsx' });
    }

    // Copy of the signed report
    if (doc.signedReport) {
      const buf = base64ToBuffer(doc.signedReport);
      const signedName = String(doc.signedReportName || 'SignedReport.pdf');
      archive.append(buf, { name: signedName });
    }

    // Event images
    const imgs = Array.isArray(doc.eventImages) ? doc.eventImages : [];
    if (imgs.length > 0) {
      imgs.forEach((imgB64, idx) => {
        if (!imgB64) return;
        const buf = base64ToBuffer(imgB64);
        // default extension jpg/png not known; store as image_{i}.jpg
        archive.append(buf, { name: `EventImages/image_${idx + 1}.jpg` });
      });
    }

    await archive.finalize();
  } catch (err) {
    console.error('download zip error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
