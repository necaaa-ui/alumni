const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const MAX_SPEAKER_PHOTO_SIZE_BYTES = 200 * 1024;
const speakerPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const uploadSpeakerPhoto = multer({
  storage: speakerPhotoStorage,
  limits: { fileSize: MAX_SPEAKER_PHOTO_SIZE_BYTES },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

// Update webinar main schedule fields (topic/domain/webinarDate/time/venue/meetingLink/alumniCity)
// and optionally speaker fields.
router.put('/webinars/:webinarId/main', uploadSpeakerPhoto.single('speakerPhoto'), async (req, res) => {
  try {
    const { webinarId } = req.params;
    if (!webinarId) return res.status(400).json({ error: 'webinarId is required' });

    const {
      topic,
      domain,
      webinarDate,
      deadline, // optional
      time,
      venue,
      meetingLink,
      alumniCity,
      speaker: rawSpeaker,
      status
    } = req.body || {};
    const speaker = typeof rawSpeaker === 'string' ? JSON.parse(rawSpeaker) : rawSpeaker;

    const Webinar = req.app.locals.Webinar;
    const Speaker = req.app.locals.Speaker;

    if (!Webinar) return res.status(500).json({ error: 'Webinar model not configured' });
    if (!Speaker) return res.status(500).json({ error: 'Speaker model not configured' });

    const webinarDoc = await Webinar.findById(webinarId);
    if (!webinarDoc) return res.status(404).json({ error: 'Webinar not found' });

    const update = {};
    if (webinarDate !== undefined && webinarDate) {
      const requestedDate = new Date(`${webinarDate}T00:00:00`);
      if (Number.isNaN(requestedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid webinar date' });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const requestedDay = new Date(
        requestedDate.getFullYear(),
        requestedDate.getMonth(),
        requestedDate.getDate()
      );
      if (requestedDay < today) {
        return res.status(400).json({ error: 'Webinar date must be today or a future date' });
      }
    }

    if (topic !== undefined) update.topic = topic;
    if (domain !== undefined) update.domain = domain;
    if (webinarDate !== undefined) update.webinarDate = webinarDate ? new Date(webinarDate) : webinarDate;
    if (deadline !== undefined) update.deadline = deadline ? new Date(deadline) : deadline;
    if (time !== undefined) update.time = time;
    if (venue !== undefined) update.venue = venue;
    if (meetingLink !== undefined) update.meetingLink = meetingLink;
    if (alumniCity !== undefined) update.alumniCity = alumniCity;
    if (status !== undefined) {
      const normalizedStatus = String(status).trim().toLowerCase();

      if (!normalizedStatus) {
        // Clear manual overrides so the date/time determine the lifecycle status.
        update.status = 'planned';
      } else {
        if (normalizedStatus === 'planned' || normalizedStatus === 'auto' || normalizedStatus === 'auto-derived') {
          update.status = 'planned';
        } else {
          const allowedManualStatuses = ['cancelled', 'deterred', 'deferred', 'cancelled / deterred', 'cancelled / deferred', 'postponed'];

          if (!allowedManualStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ error: 'Only Deterred and Postponed can be set manually' });
          }

          if (normalizedStatus === 'deterred' || normalizedStatus === 'deferred' || normalizedStatus === 'cancelled / deterred' || normalizedStatus === 'cancelled / deferred') {
            update.status = 'cancelled';
          } else if (normalizedStatus === 'postponed') {
            update.status = 'postponed';
          }
        }
      }
    }

    // Speaker update (optional)
    if (speaker && webinarDoc.speaker) {
      const speakerUpdate = {};
      if (speaker.name !== undefined) speakerUpdate.name = speaker.name;
      if (speaker.email !== undefined) speakerUpdate.email = speaker.email;
      if (speaker.designation !== undefined) speakerUpdate.designation = speaker.designation;
      if (speaker.companyName !== undefined) speakerUpdate.companyName = speaker.companyName;
      if (speaker.department !== undefined) speakerUpdate.department = speaker.department;
      if (speaker.batch !== undefined) speakerUpdate.batch = speaker.batch;
      if (req.file) speakerUpdate.speakerPhoto = req.file.filename;

      await Speaker.findByIdAndUpdate(webinarDoc.speaker, speakerUpdate, { new: true });
    }

    const updated = await Webinar.findByIdAndUpdate(webinarId, update, { new: true }).populate('speaker');
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('PUT /webinars/:webinarId/main error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;