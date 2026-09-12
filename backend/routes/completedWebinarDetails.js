const express = require('express');
const router = express.Router();

const findMemberByEmail = async (Member, email) => {
  const normalizedEmail = (email || '').trim();
  if (!Member || !normalizedEmail) return null;

  const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Member.findOne({
    'basic.email_id': { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
  }).lean();
};

const getMemberMobile = (member) => (
  member?.contact_details?.mobile ||
  member?.contact_details?.phone ||
  member?.mobile ||
  member?.phone ||
  member?.contact ||
  ''
);

const sanitizeMemberValue = (value) => {
  if (value === null || value === undefined) return '';

  const str = String(value).trim();
  if (!str) return '';

  const normalized = str.toLowerCase();
  if (['present', 'n/a', 'na', 'null', 'undefined'].includes(normalized)) return '';

  return str;
};

const extractDepartmentFromString = (value) => {
  if (!value) return '';

  const str = String(value).trim();
  if (!str) return '';

  const normalized = str.toUpperCase();
  const departments = ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'AIDS', 'CE', 'CS', 'CS&E', 'CSEH', 'AEI', 'IT'];

  for (const dept of departments) {
    if (normalized.includes(dept)) return dept;
  }

  if (normalized.includes('COMPUTER') && normalized.includes('ENGINEER')) return 'CSE';
  if (normalized.includes('ELECTRON') && normalized.includes('COMM')) return 'ECE';
  if (normalized.includes('MECHAN') || normalized.includes('MECH')) return 'MECH';

  return '';
};

const getMemberDepartment = (member) => {
  if (!member) return '';

  const departmentCandidates = [
    member.basic?.department,
    member.basic?.dept,
    member.basic?.label,
    member.basic?.course,
    member.basic?.branch,
    member.education_details?.[0]?.department,
    member.education_details?.[0]?.dept,
    member.education_details?.[0]?.course,
    member.education_details?.[0]?.branch,
    member.academic_details?.department,
    member.academic_details?.dept,
    member.department,
    member.dept,
    member.branch,
    member.contact_details?.department,
    member.contact_details?.dept,
    member.label,
  ];

  for (const candidate of departmentCandidates) {
    const clean = sanitizeMemberValue(candidate);
    if (!clean) continue;

    const parsed = extractDepartmentFromString(clean);
    if (parsed) return parsed;

    if (clean.length <= 10) return clean.toUpperCase();
  }

  try {
    const fullText = JSON.stringify(member);
    const parsed = extractDepartmentFromString(fullText);
    if (parsed) return parsed;
  } catch (error) {
    // ignore
  }

  return '';
};

const getMemberBatch = (member) => {
  if (!member) return '';

  const batchCandidates = [
    member.basic?.batch,
    member.basic?.label,
    member.batch,
    member.label,
    member.passoutYear,
    member.graduationYear,
    member.passingYear,
    member.education_details?.[0]?.batch,
    member.education_details?.[0]?.end_year,
    member.education_details?.[0]?.year,
  ];

  for (const candidate of batchCandidates) {
    const cleanValue = sanitizeMemberValue(candidate);
    if (!cleanValue) continue;

    const numericValue = Number(cleanValue);
    if (!Number.isNaN(numericValue) && String(numericValue).length === 4) return String(numericValue);

    const match = cleanValue.match(/(19|20)\d{2}/);
    if (match) return match[0];

    if (cleanValue.toLowerCase() === 'present') continue;
    return cleanValue;
  }

  return '';
};

const getMemberName = (member) => {
  if (!member) return '';
  const candidates = [
    member.basic?.name,
    member.basic?.full_name,
    member.basic?.fullName,
    member.name,
    member.full_name,
    member.fullName,
    member.personal?.name,
    member.personal_details?.name,
    member.profile?.name,
  ];

  for (const candidate of candidates) {
    const value = (candidate || '').toString().trim();
    if (value) return value;
  }

  const firstName = member.basic?.first_name || member.basic?.firstName || member.first_name || member.firstName || '';
  const lastName = member.basic?.last_name || member.basic?.lastName || member.last_name || member.lastName || '';
  return `${firstName} ${lastName}`.trim();
};

// Create or update completed webinar details
// NOTE: For now this route only accepts JSON (attendanceSheet/eventImages as base64 strings).
router.put('/webinars/:webinarId/complete-details', async (req, res) => {
  try {
    const {
      attendanceSheet,
      eventImages,
      attendanceCount,
      prizeWinnerEmail,
      prizeWinnerName,
      prizeWinnerMobile,
      prizeWinnerDepartment,
      prizeWinnerBatch,
    } = req.body;

    // Support both keys just in case the frontend sends the older naming.
    const normalizedAttendanceSheet = req.body.attendanceSheet ?? req.body.attendanceSheetBase64;
    const normalizedPrizeWinnerEmail = prizeWinnerEmail ?? req.body.prizeWinnerEmail;
    let normalizedPrizeWinnerName = prizeWinnerName ?? req.body.name ?? '';
    let normalizedPrizeWinnerMobile = prizeWinnerMobile ?? req.body.prizeWinnerMobile;
    let normalizedPrizeWinnerDepartment = prizeWinnerDepartment ?? req.body.prizeWinnerDepartment ?? '';
    let normalizedPrizeWinnerBatch = prizeWinnerBatch ?? req.body.prizeWinnerBatch ?? '';


    const CompletedWebinarDetails = req.app.locals.CompletedWebinarDetails;
    const Member = req.app.locals.Member;

    if (!req.params.webinarId) {
      return res.status(400).json({ error: 'webinarId is required' });
    }

    const member = await findMemberByEmail(Member, normalizedPrizeWinnerEmail);
    if (member) {
      normalizedPrizeWinnerName = getMemberName(member) || normalizedPrizeWinnerName || '';
      normalizedPrizeWinnerMobile = getMemberMobile(member) || normalizedPrizeWinnerMobile || '';
      normalizedPrizeWinnerDepartment = getMemberDepartment(member) || normalizedPrizeWinnerDepartment || '';
      normalizedPrizeWinnerBatch = getMemberBatch(member) || normalizedPrizeWinnerBatch || '';
    }

    const update = {
      attendanceSheet: normalizedAttendanceSheet ?? '',
      eventImages: Array.isArray(eventImages) ? eventImages : [],
      attendanceCount: attendanceCount ?? 0,
      prizeWinnerEmail: normalizedPrizeWinnerEmail ?? '',
      prizeWinnerName: normalizedPrizeWinnerName ?? '',
      prizeWinnerMobile: normalizedPrizeWinnerMobile ?? '',
      prizeWinnerDepartment: normalizedPrizeWinnerDepartment ?? '',
      prizeWinnerBatch: normalizedPrizeWinnerBatch ?? '',
    };

    const doc = await CompletedWebinarDetails.findOneAndUpdate(
      { webinarId: req.params.webinarId },
      update,
      { new: true, upsert: true }
    );

    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('complete-details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get completed details by webinarId
router.get('/webinars/:webinarId/complete-details', async (req, res) => {
  try {
    const CompletedWebinarDetails = req.app.locals.CompletedWebinarDetails;

    const doc = await CompletedWebinarDetails.findOne({ webinarId: req.params.webinarId });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('get complete-details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all completed webinar details for prize winners display
// Returns docs even if only some webinars are completed.
router.get('/prize-winners', async (req, res) => {
  try {
    const CompletedWebinarDetails = req.app.locals.CompletedWebinarDetails;
    const Member = req.app.locals.Member;

    const docs = await CompletedWebinarDetails.find({
      prizeWinnerEmail: { $ne: '' },
    }).lean();

    // Attach webinar info for phase/topic/date/domain from Webinar collection.
    // Include webinars that have prizeWinnerEmail even if complete-details was not created yet.
    const Webinar = req.app.locals.Webinar;
    const webinarIds = docs.map(d => d.webinarId).filter(Boolean);

    const webinars = await Webinar.find({
      $or: [
        { _id: { $in: webinarIds } },
        { prizeWinnerEmail: { $exists: true, $ne: '' } },
      ],
    })
      .select('phaseId domain topic webinarDate prizeWinnerEmail prizeWinnerName prizeWinnerMobile prizeWinnerDepartment prizeWinnerBatch')
      .lean();

    const webinarById = Object.fromEntries(webinars.map(w => [String(w._id), w]));
    const detailByWebinarId = Object.fromEntries(docs.map(d => [String(d.webinarId), d]));
    const sourceRows = webinars.map(webinar => ({
      webinar,
      details: detailByWebinarId[String(webinar._id)] || {},
    }));

    const members = await Promise.all(sourceRows.map(({ webinar, details }) => (
      findMemberByEmail(Member, details.prizeWinnerEmail || webinar.prizeWinnerEmail)
    )));

    const response = sourceRows.map(({ webinar, details }, index) => {
      const w = webinarById[String(webinar._id)] || webinar || {};
      const member = members[index];
      const prizeWinnerEmail = details.prizeWinnerEmail || w.prizeWinnerEmail || '';
      const prizeWinnerDepartment = sanitizeMemberValue(getMemberDepartment(member) || details.prizeWinnerDepartment || w.prizeWinnerDepartment || '');
      const prizeWinnerBatch = sanitizeMemberValue(getMemberBatch(member) || details.prizeWinnerBatch || w.prizeWinnerBatch || '');

      return {
        webinarId: w._id,
        phaseId: w.phaseId ?? null,
        domain: w.domain ?? null,
        webinarDate: w.webinarDate ?? null,
        topic: w.topic ?? null,
        prizeWinnerName: getMemberName(member) || details.prizeWinnerName || w.prizeWinnerName || '',
        prizeWinnerEmail,
        prizeWinnerMobile: getMemberMobile(member) || details.prizeWinnerMobile || w.prizeWinnerMobile || '',
        prizeWinnerDepartment,
        prizeWinnerBatch,
      };
    }).filter(row => row.prizeWinnerEmail);

    res.json({ success: true, data: response });
  } catch (err) {
    console.error('prize-winners error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;