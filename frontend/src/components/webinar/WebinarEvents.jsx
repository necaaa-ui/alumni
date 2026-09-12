import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Common.css';
import './WebinarEvents.css';
import { FiBookOpen, FiAward, FiEye, FiUpload } from "react-icons/fi";
import { Mail } from "lucide-react";
import Popup from './Popup';
import WebinarCertificate from './WebinarCertificate';
import WebinarPoster from './WebinarPoster';
import WebinarCircular from './WebinarCircular';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

// Add API base URL
const isLocalDev = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (isLocalDev ? 'http://localhost:5000' : '/alumnimain')
).replace(/\/$/, '');

const POSTER_TARGET_BYTES = 200 * 1024;

const canvasToBlob = (canvas, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, 'image/jpeg', quality);
});

const createPosterJpeg = async (canvas) => {
  let sourceCanvas = canvas;

  // A single conversion is normally enough for the mostly-text poster. This
  // avoids dozens of expensive canvas encodes before the browser can start
  // downloading the file.
  for (let resizeAttempt = 0; resizeAttempt < 3; resizeAttempt += 1) {
    const blob = await canvasToBlob(sourceCanvas, 0.72);
    if (blob && blob.size <= POSTER_TARGET_BYTES) return blob;

    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = Math.floor(sourceCanvas.width * 0.8);
    resizedCanvas.height = Math.floor(sourceCanvas.height * 0.8);
    const context = resizedCanvas.getContext('2d');
    context.drawImage(sourceCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
    sourceCanvas = resizedCanvas;
  }

  return canvasToBlob(sourceCanvas, 0.65);
};

const normalizePosterBackground = (canvas, backgroundColor) => {
  const colorMatch = String(backgroundColor || '').match(/\d+(?:\.\d+)?/g);
  if (!colorMatch || colorMatch.length < 3) return;

  const [red, green, blue] = colorMatch.slice(0, 3).map(Number);
  const targetMagnitude = Math.hypot(red, green, blue);
  if (!targetMagnitude) return;

  const context = canvas.getContext('2d');
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;

  for (let index = 0; index < data.length; index += 4) {
    const sourceRed = data[index];
    const sourceGreen = data[index + 1];
    const sourceBlue = data[index + 2];
    const sourceMagnitude = Math.hypot(sourceRed, sourceGreen, sourceBlue);

    // html2canvas occasionally paints translucent background layers as a
    // darker shade of the poster color. Match only that same hue, leaving
    // black panels, white cards, text, and photos untouched.
    if (sourceMagnitude < 35 || sourceMagnitude >= targetMagnitude * 0.93) continue;

    const similarity = (
      (sourceRed * red) + (sourceGreen * green) + (sourceBlue * blue)
    ) / (sourceMagnitude * targetMagnitude);

    if (similarity > 0.985) {
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
    }
  }

  context.putImageData(image, 0, 0);
};

const getDeadlineEnd = (deadline) => {
  if (!deadline) return null;
  const deadlineEnd = new Date(deadline);
  if (Number.isNaN(deadlineEnd.getTime())) return null;
  deadlineEnd.setHours(23, 59, 59, 999);
  return deadlineEnd;
};

const normalizeWebinarStatusKey = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (['completed', 'conducted', 'completed fully', 'completedfully'].includes(normalizedStatus)) return 'completed';
  if (['feedback to be filled', 'feedback-to-be-filled', 'feedbacktobefilled', 'feedback yet to be filled', 'feedback-yet-to-be-filled'].includes(normalizedStatus)) return 'feedback-to-be-filled';
  if (['in progress', 'in-progress', 'inprogress', 'in_progress'].includes(normalizedStatus)) return 'in-progress';
  if (['cancelled', 'cancelled / deterred', 'cancelled / deferred', 'cancelled/deterred', 'cancelled/deferred', 'deferred', 'deterred'].includes(normalizedStatus)) return 'cancelled';
  if (['postponed', 'postpone'].includes(normalizedStatus)) return 'postponed';
  return 'planned';
};

const getStatusCssKey = (statusKey) => {
  if (statusKey === 'cancelled') return 'deterred';
  if (statusKey === 'feedback-to-be-filled') return 'feedback-yet-to-be-filled';
  return statusKey;
};

const getDerivedWebinarStatus = (webinar) => {
  const statusValue = String(webinar?.status || '').trim();
  const normalizedStoredStatus = normalizeWebinarStatusKey(statusValue);

  // Only Deterred and Postponed are valid manual overrides.
  if (normalizedStoredStatus === 'cancelled') {
    return { key: 'deterred', label: 'DETERRED' };
  }

  if (normalizedStoredStatus === 'postponed') {
    return { key: 'postponed', label: 'POSTPONED' };
  }

  if (!webinar?.webinarDate || !webinar?.time) {
    return { key: 'planned', label: 'PLANNED' };
  }

  try {
    const webinarStart = new Date(webinar.webinarDate);
    const match = String(webinar.time).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);

    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2] || '0', 10);
      const period = match[3]?.toUpperCase();

      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      webinarStart.setHours(hours, minutes, 0, 0);
      const webinarEnd = new Date(webinarStart);
      webinarEnd.setHours(webinarEnd.getHours() + 1);

      const feedbackCount = Number(webinar.feedbackCount || 0);
      const registeredCount = Number(webinar.registeredCount || 0);
      const requiredFeedbackCount = registeredCount > 0 ? Math.ceil(registeredCount / 2) : 0;
      const hasUploads = Boolean(webinar.hasUploads || webinar.uploadsComplete);
      const feedbackComplete = feedbackCount >= requiredFeedbackCount;
      const isPastWebinar = new Date() >= webinarEnd;

      if (new Date() < webinarStart) {
        return { key: 'planned', label: 'PLANNED' };
      }

      if (isPastWebinar && registeredCount > 0 && feedbackComplete && hasUploads) {
        return { key: 'completed', label: 'COMPLETED' };
      }

      if (isPastWebinar && registeredCount > 0 && !feedbackComplete && feedbackCount < requiredFeedbackCount) {
        return { key: 'feedback-to-be-filled', label: 'FEEDBACK TO BE FILLED' };
      }

      if (isPastWebinar && registeredCount > 0 && feedbackComplete && !hasUploads) {
        return { key: 'in-progress', label: 'IN PROGRESS' };
      }

      return { key: 'planned', label: 'PLANNED' };
    }
  } catch (error) {
    console.error('Error deriving webinar status:', error);
  }

  return { key: 'planned', label: 'PLANNED' };
};

const WebinarDetail = ({ webinar, onClose, registrationEmail, onRegistrationEmailChange, registeredWebinars, onRegister }) => {
  const isRegistered = registeredWebinars.has(String(webinar._id));
  const deadlineEnd = getDeadlineEnd(webinar.deadline);
  const isDeadlinePassed = deadlineEnd && new Date() > deadlineEnd;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
      <div className="webinar-registration-modal bg-gradient-to-br from-purple-50/70 via-pink-50/70 to-blue-50/70 rounded-2xl max-w-4xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh] webinar-modal-scroll-hidden p-8">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-purple-900 hover:text-purple-800 text-2xl font-bold">X</button>
        </div>
        <div className="form-header">
          <div className="icon-wrapper"><FiBookOpen className="header-icon" /></div>
          <h1 className="text-2xl font-bold text-[#7d48b9]">Webinar Details</h1>
          <p className="webinar-subtitle">{webinar.title}</p>
        </div>

        <div className="form-card">
          <div className="form-fields">
            <div className="form-group">
              <label><Mail className="field-icon" /> Email <span className="required">*</span></label>
              <input
                type="email"
                name="email"
                value={registrationEmail}
                onChange={(event) => onRegistrationEmailChange(event.target.value)}
                placeholder="Enter your email"
                className={`input-field ${(isRegistered || isDeadlinePassed) ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isRegistered || isDeadlinePassed}
              />
            </div>
            <div className="form-group">
              <label>Date & Time</label>
              <input type="text" value={webinar.slot} disabled className="input-field" />
            </div>
            <div className="form-group">
              <label>Domain</label>
              <input type="text" value={webinar.domain} disabled className="input-field" />
            </div>
            <div className="form-group">
              <label>Registered Count</label>
              <input type="text" value={webinar.registered} disabled className="input-field" />
            </div>
            <div className="form-group">
              <label>Webinar Poster</label>
              <div className="webinar-registration-poster mt-6 flex justify-center">
                <div className="webinar-registration-poster-scale">
                  <WebinarPoster
                    desktopPreview
                    alumniPhoto={webinar.speaker?.photo || null}
                    webinarTopic={webinar.title}
                    webinarDate={new Date(webinar.webinarDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    webinarTime={webinar.time}
                    webinarVenue={webinar.venue}
                    alumniName={webinar.speaker.name}
                    alumniDesignation={webinar.speaker.designation}
                    alumniCompany={webinar.speaker?.companyName || 'TBD'}
                    alumniCity={webinar.alumniCity}
                    alumniBatch={webinar.speaker.passoutYear}
                    alumniDepartment={webinar.speaker.department}
                    webinarDomain={webinar.domain}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={onRegister}
                className={`submit-btn ${(isRegistered || isDeadlinePassed) ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isRegistered || isDeadlinePassed}
              >
                {isRegistered ? 'Already Registered' : isDeadlinePassed ? 'Deadline Passed' : 'Register Now'}
              </button>
            </div>
          </div>
        </div>
        <p className="form-footer">Designed with 💜 for Alumni Network</p>
      </div>
    </div>
  );
};

export default function WebinarEvents() {
  const navigate = useNavigate();
  const [selectedWebinar, setSelectedWebinar] = useState(null);
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });
  const [webinars, setWebinars] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [registeredWebinars, setRegisteredWebinars] = useState(new Set());
  const [selectedWebinarForCertificate, setSelectedWebinarForCertificate] = useState(null);
  const [certificateEmail, setCertificateEmail] = useState('');
  const [certificateData, setCertificateData] = useState(null);
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [showCircularPreview, setShowCircularPreview] = useState(false);
  const [circularData, setCircularData] = useState(null);
  const [circularMonth, setCircularMonth] = useState('');
  const [currentPhase, setCurrentPhase] = useState(null);
  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [phaseLoading, setPhaseLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [coordinators, setCoordinators] = useState([]);
  const isAnyModalOpen =
    !!selectedWebinar ||
    !!selectedWebinarForCertificate ||
    !!showCertificatePreview ||
    !!showCircularPreview;

  // Keep page scroll but hide vertical scrollbar while this page is open
  useEffect(() => {
    document.body.classList.add('webinar-events-hide-scrollbar');
    document.documentElement.classList.add('webinar-events-hide-scrollbar');

    return () => {
      document.body.classList.remove('webinar-events-hide-scrollbar');
      document.documentElement.classList.remove('webinar-events-hide-scrollbar');
    };
  }, []);
  const formatTimeWithAMPM = (timeString) => {
    if (!timeString) return 'TBD';

    // Handle different time formats (e.g., "3:00 PM", "15:00", "3 PM")
    const timeMatch = timeString.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/);
    if (!timeMatch) return timeString;

    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] || '00';
    const ampm = timeMatch[3]?.toUpperCase();

    // Convert to 24-hour format for calculation
    let startHour24 = hours;
    if (ampm === 'PM' && hours !== 12) {
      startHour24 = hours + 12;
    } else if (ampm === 'AM' && hours === 12) {
      startHour24 = 0;
    }

    // Calculate end time (add 1 hour)
    let endHour24 = startHour24 + 1;
    let endAmpm = 'AM';
    let endHour12 = endHour24;

    if (endHour24 >= 12) {
      endAmpm = 'PM';
      if (endHour24 > 12) {
        endHour12 = endHour24 - 12;
      } else if (endHour24 === 12) {
        endHour12 = 12;
      }
    } else if (endHour24 === 0) {
      endHour12 = 12;
      endAmpm = 'AM';
    }

    // Format start time
    let startHour12 = hours;
    let startAmpm = ampm || 'AM';

    if (!ampm) {
      // Convert from 24-hour format
      if (hours === 0) {
        startHour12 = 12;
        startAmpm = 'AM';
      } else if (hours < 12) {
        startAmpm = 'AM';
      } else if (hours === 12) {
        startHour12 = 12;
        startAmpm = 'PM';
      } else {
        startHour12 = hours - 12;
        startAmpm = 'PM';
      }
    }

    // Return time slot format
    return `${startHour12}.${minutes}${startAmpm} - ${endHour12}.${minutes}${endAmpm}`;
  };
  
  const getDepartmentFromDomain = (domain) => {
    // Domains created before and after the display-name mapping use different
    // values (for example, "Cloud Computing" and "CLOUD COMPUTING (CSE)").
    // Resolve by the stable domain/department keywords instead of exact text.
    const normalizedDomain = String(domain || '').toUpperCase();

    if (/\bCSE\b|CLOUD|CYBER/.test(normalizedDomain)) return 'CSE';
    if (/\bIT\b|FULL\s*STACK/.test(normalizedDomain)) return 'IT';
    if (/AI\s*&?\s*DS|ARTIFICIAL\s+INTELLIGENCE|DATA\s+SCIENCE/.test(normalizedDomain)) return 'AI & DS';
    if (/\bMECH\b|ROBOTIC|AUTOMATION/.test(normalizedDomain)) return 'MECH';
    if (/\bEEE\b|ELECTRICAL\s+POWER/.test(normalizedDomain)) return 'EEE';
    if (/\bECE\b|EMBEDDED/.test(normalizedDomain)) return 'ECE';
    if (/\bCIVIL\b|STRUCTURAL/.test(normalizedDomain)) return 'CIVIL';

    return 'TBD';
  };

  const getSpeakerHonorific = (speaker = {}) => {
    const rawGender = String(
      speaker.gender ?? speaker.sex ?? speaker.genderType ?? speaker.maritalStatus ?? ''
    ).trim().toLowerCase();

    const normalizedName = String(speaker.name || 'TBD').trim();
    const isMarried = ['married', 'mrs', 'mrs.', 'wife', 'yes', 'true', '1'].includes(rawGender)
      || ['married', 'married woman', 'wife'].includes(String(speaker.maritalStatus || '').trim().toLowerCase())
      || speaker.isMarried === true
      || speaker.married === true;

    if (!normalizedName || normalizedName === 'TBD') {
      return 'TBD';
    }

    if (['male', 'm', 'man', 'boy'].includes(rawGender) || speaker.gender === 'Male') {
      return `Mr. ${normalizedName}`;
    }

    if (['female', 'f', 'woman', 'girl'].includes(rawGender)) {
      return isMarried ? `Mrs. ${normalizedName}` : `Ms. ${normalizedName}`;
    }

    if (speaker.maritalStatus) {
      const maritalStatus = String(speaker.maritalStatus).trim().toLowerCase();
      if (maritalStatus === 'married') return `Mrs. ${normalizedName}`;
      if (maritalStatus === 'unmarried') return `Ms. ${normalizedName}`;
    }

    return normalizedName;
  };

  const generateCircular = (month) => {
    console.log('generateCircular called with month:', month);
    console.log('webinars:', webinars);
    try {
      const monthWebinars = webinars[month];
      console.log('monthWebinars:', monthWebinars);
      if (!monthWebinars || monthWebinars.length === 0) {
        setPopup({ show: true, message: 'No webinars found for this month', type: 'error' });
        return;
      }

      // Prepare table data for preview
      const tableData = monthWebinars.map((webinar) => {
        const date = new Date(webinar.webinarDate);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
        const speakerInfo = getSpeakerHonorific(webinar.speaker || {});
        // Get department from domain mapping for the branch column
        const branchInfo = getDepartmentFromDomain(webinar.domain);

        // Use speaker data directly from webinar object (no API fetch needed)
        const batchInfo = webinar.speaker?.passoutYear || webinar.speaker?.batch || 'TBD';
        const speakerDepartmentInfo = webinar.speaker?.department || 'TBD';

        const speakerWithDetails = `${speakerInfo}\n(Batch ${batchInfo} - ${speakerDepartmentInfo})`;
        return {
          branch: branchInfo,
          date: formattedDate,
          time: formatTimeWithAMPM(webinar.time),
          topic: webinar.title,
          speaker: speakerWithDetails,
          designation: `${webinar.speaker?.designation || 'TBD'}, ${webinar.speaker?.companyName || 'TBD'}, ${webinar.alumniCity || 'TBD'}`
        };
      });

      // Set data for preview modal
      setCircularData(tableData);
      const monthYearLabel = monthWebinars[0]?.webinarDate
        ? new Date(monthWebinars[0].webinarDate).toLocaleString('default', { month: 'long', year: 'numeric' })
        : month.charAt(0).toUpperCase() + month.slice(1);
      setCircularMonth(monthYearLabel);
      setShowCircularPreview(true);
    } catch (error) {
      console.error('Error preparing circular:', error);
      setPopup({ show: true, message: 'Failed to prepare circular', type: 'error' });
    }
  };

  const downloadCircular = async () => {
    try {
      // Create document
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                width: 12040,
                height: 15840
              },
              margin: { top: 720, bottom: 720, left: 720, right: 720 }
            }
          },

          children: [

            // ===========================
            // HEADER
            // ===========================
            new Paragraph({
              children: [
                new TextRun({
                  text: "NATIONAL ENGINEERING COLLEGE",
                  bold: true,
                  size: 36, // 18pt (matches image)
                  font: "Times New Roman"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "(An Autonomous Institution, Affiliated to Anna University - Chennai)",
                  size: 22,
                  font: "Times New Roman"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 60 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "K.R. NAGAR, KOVILPATTI – 628 503",
                  size: 22,
                  font: "Times New Roman"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 60 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "NEC ALUMNI ASSOCIATION",
                  bold: true,
                  size: 24,
                  underline: {},
                  font: "Times New Roman"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `Date :  ${new Date().getDate().toString().padStart(2, '0')}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getFullYear()}`,
                  size: 24,
                  bold: true,
                  font: "Times New Roman"
                })
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 200 }
            }),

            // ===========================
            // DESCRIPTION
            // ===========================
            new Paragraph({
              children: [
                new TextRun({
                  text: `In association with the conduction of webinar series the following speakers are identified for the month of ${circularMonth}.`,
                  size: 22,
                  font: "Times New Roman"
                })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { before: 200, after: 200 }
            }),

            // ===========================
            // MAIN TABLE (Matches UI Exactly)
            // ===========================
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              },
              borders: {
                top: { style: "single", size: 7, color: "000000" },
                bottom: { style: "single", size: 7, color: "000000" },
                left: { style: "single", size: 7, color: "000000" },
                right: { style: "single", size: 7, color: "000000" },
                insideHorizontal: { style: "single", size: 7, color: "000000" },
                insideVertical: { style: "single", size: 7, color: "000000" }
              },

              rows: [

                // ===========================
                // HEADER ROW
                // ===========================
                new TableRow({
                  height: { value: 400 },
                  children: [
                    cellHeader("Branch", 15),
                    cellHeader("Date", 15),
                    cellHeader("Timing", 15),
                    cellHeader("Topic", 20),
                    cellHeader("Speaker", 20),
                    cellHeader("Designation", 15)
                  ],
                }),

                // ===========================
                // DATA ROWS
                // ===========================
                ...circularData.map(row =>
                  new TableRow({
                    height: { value: 1200 }, // SAME HEIGHT AS IN IMAGE
                    children: [
                      cellText(row.branch),
                      cellText(row.date),
                      cellText(row.time),
                      cellText(row.topic),
                      cellMultiline(row.speaker),
                      cellText(row.designation)
                    ],
                    alignment: AlignmentType.CENTER 
                  })
                )
              ]
            }),

            // ===========================
            // FOOTER SIGNATURE ROW
            // ===========================
            new Paragraph({ text: "", spacing: { after: 1000 } }),

            // ===========================
            // FOOTER SIGNATURE TABLE
            // ===========================
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              },
              borders: {
                top: { style: "none" },
                bottom: { style: "none" },
                left: { style: "none" },
                right: { style: "none" },
                insideHorizontal: { style: "none" },
                insideVertical: { style: "none" }
              },
              rows: [
                new TableRow({
                  height: { value: 500 },
                  children: [
                    signatureCell("PROGRAM COORDINATOR", 25),
                    signatureCell("ASSOCIATE ALUMNI COORDINATOR", 20),
                    signatureCell("ALUMNI COORDINATOR", 20),
                    signatureCell("PRINCIPAL", 35)
                  ]
                })
              ]
            })
          ]
        }]
      });

      // ===============================
      // CELL HELPERS
      // ===============================
      function cellHeader(text, widthPercent) {
        return new TableCell({
          width: { size: widthPercent, type: WidthType.PERCENTAGE },
          verticalAlign: "center",
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text, bold: true, size: 24, font: "Times New Roman" })
              ]
            })
          ]
        });
      }

      function cellText(text) {
        return new TableCell({
          verticalAlign: "top",
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text, size: 24, font: "Times New Roman" })
              ]
            })
          ]
        });
      }

      function cellMultiline(text) {
        return new TableCell({
          verticalAlign: "top",
          children: text.split("\n").map(line =>
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: line, size: 24, font: "Times New Roman" })
              ]
            })
          )
        });
      }

      function signatureCell(title) {
        return new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: title, bold: true, size: 24, font: "Times New Roman" })
              ]
            })
          ]
        });
      }

      // Generate and download the document
      const blob = await Packer.toBlob(doc);
      const safeMonth = String(circularMonth || 'Circular').replace(/\s+/g, '_');
      saveAs(blob, `Webinar_Circular_${safeMonth}.docx`);

      setPopup({ show: true, message: 'Circular downloaded successfully!', type: 'success' });
      setShowCircularPreview(false);
      setCircularData(null);
      setCircularMonth('');
    } catch (error) {
      console.error('Error generating circular:', error);
      setPopup({ show: true, message: 'Failed to download circular', type: 'error' });
    }
  };

  const handleRegistration = async () => {
    if (!registrationEmail || !selectedWebinar) {
      setPopup({ show: true, message: 'Please enter your email', type: 'error' });
      return;
    }

    if (!currentPhase || !currentPhase.phaseId) {
      setPopup({ show: true, message: 'Current phase is not set. Please try again later.', type: 'error' });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registrationEmail,
          webinarId: selectedWebinar._id,
          phaseId: currentPhase.phaseId
        }),
      });

      if (response.ok) {
        setPopup({ show: true, message: 'Registration successful! 🎉', type: 'success' });
        setRegisteredWebinars(prev => new Set([...prev, selectedWebinar._id]));
        // Refetch webinars to get updated registration count
        fetchWebinars();
        fetchUserRegistrations(registrationEmail || userEmail);
        setRegistrationEmail('');
        setSelectedWebinar(null);
      } else {
        const errorData = await response.json();
        setPopup({ show: true, message: errorData.error || 'Registration failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error registering:', error);
      setPopup({ show: true, message: 'Registration failed', type: 'error' });
    }
  };

  const handleCertificateDownload = (webinar) => {
    // Open the certificate modal
    setSelectedWebinarForCertificate(webinar);
  };

  const downloadCertificate = async () => {
    if (!certificateEmail || !selectedWebinarForCertificate) {
      setPopup({ show: true, message: 'Please enter your email', type: 'error' });
      return;
    }

    setCertificateLoading(true);

    try {
      // First check eligibility
      const eligibilityResponse = await fetch(`${API_BASE_URL}/api/check-certificate-eligibility?email=${encodeURIComponent(certificateEmail)}&webinarId=${selectedWebinarForCertificate._id}`);
      const eligibilityData = await eligibilityResponse.json();

      if (!eligibilityData.eligible) {
        setPopup({ show: true, message: 'You are not eligible for this certificate. Please ensure you have attended the webinar.', type: 'error' });
        return;
      }

      // Get webinar details
      const webinarResponse = await fetch(`${API_BASE_URL}/api/webinars/${selectedWebinarForCertificate._id}`);
      const webinarData = await webinarResponse.json();

      // Get user name from members API
      const membersResponse = await fetch(`${API_BASE_URL}/api/names`);
      const members = await membersResponse.json();
      const member = members.find(m => m.email === certificateEmail);
      const userName = member?.name || certificateEmail; // Use name if found, fallback to email

      // Set certificate data to show the certificate preview modal
      setCertificateData({
        name: userName,
        programTitle: webinarData.topic,
        date: new Date(webinarData.webinarDate).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      });

      setShowCertificatePreview(true);
      setCertificateEmail('');
      setSelectedWebinarForCertificate(null);

    } catch (error) {
      console.error('Error preparing certificate:', error);
      setPopup({ show: true, message: 'Failed to prepare certificate', type: 'error' });
    } finally {
      setCertificateLoading(false);
    }
  };

  const fetchCurrentPhase = async () => {
    try {
      setPhaseLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/current-phase`);
      if (!response.ok) {
        throw new Error('Failed to fetch current phase');
      }
      const data = await response.json();
      setCurrentPhase(data && data.phaseId ? data : null);
    } catch (err) {
      console.error('Error fetching current phase:', err);
      setCurrentPhase(null);
    } finally {
      setPhaseLoading(false);
    }
  };

  const fetchPhases = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/phases`);
      if (!response.ok) {
        throw new Error('Failed to fetch phases');
      }
      const data = await response.json();
      setPhases(Array.isArray(data.phases) ? data.phases : []);
    } catch (err) {
      console.error('Error fetching phases:', err);
      setPhases([]);
    }
  };

  const resolveSpeakerPhotoUrl = (photoValue) => {
    if (!photoValue) return null;

    const trimmedValue = String(photoValue).trim();
    if (!trimmedValue) return null;

    // Handle blob: URLs (used in assignment form preview)
    if (trimmedValue.startsWith('blob:')) {
      return trimmedValue;
    }

    // Handle standard absolute URLs and data URIs
    if (/^https?:\/\//i.test(trimmedValue) || trimmedValue.startsWith('data:')) {
      return trimmedValue;
    }

    // Handle application-root paths (e.g., /alumnimain/uploads/photo.jpg)
    if (trimmedValue.startsWith('/')) {
      // The path is already root-relative — use it directly as it works
      // in both dev (localhost) and production (reverse proxy) environments.
      return trimmedValue;
    }

    // Handle 'uploads/filename' style paths
    if (trimmedValue.startsWith('uploads/')) {
      return `${API_BASE_URL}/${trimmedValue}`;
    }

    // Default: The database stores just the filename (e.g., "1784865136682.jpeg").
    // Use the dedicated API speaker-photos endpoint so it works regardless of
    // whether /uploads is proxied in the deployed /alumnimain application.
    const photoFileName = trimmedValue.split('/').filter(Boolean).pop();
    if (photoFileName) {
      return `${API_BASE_URL}/api/speaker-photos/${encodeURIComponent(photoFileName)}`;
    }

    // Final fallback: try traditional /uploads/ path
    return `${API_BASE_URL}/uploads/${trimmedValue}`;
  };

  const fetchWebinars = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/webinars`);
      if (!response.ok) {
        throw new Error('Failed to fetch webinars');
      }
      const data = await response.json();

      // Group webinars by month
      const groupedWebinars = data.reduce((acc, webinar) => {
        const date = new Date(webinar.webinarDate);
        const month = date.toLocaleString('default', { month: 'long' }).toLowerCase();
        const year = date.getFullYear();

        if (!acc[month]) {
          acc[month] = [];
        }

        // Transform data to match component structure
        const rawMeetingLink = String(webinar.meetingLink || '').trim();
        const resolvedJoinLink = /^https?:\/\//i.test(rawMeetingLink) ? rawMeetingLink : '';

        const derivedStatus = getDerivedWebinarStatus({
          ...webinar,
          status: webinar.status,
          feedbackCount: webinar.feedbackCount,
          registeredCount: webinar.registeredCount,
          hasUploads: webinar.hasUploads,
          uploadsComplete: webinar.uploadsComplete,
          webinarDate: webinar.webinarDate,
          time: webinar.time,
        });

        acc[month].push({
          _id: webinar._id,
          phaseId: webinar.phaseId,
          title: webinar.topic,
          slot: `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} ${year}, ${webinar.time}`,
          formattedDeadline: webinar.deadline ? new Date(webinar.deadline).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) : 'TBD',
          registered: webinar.registeredCount || 0,
          attendedCount: webinar.attendedCount || 0,
          status: derivedStatus.label,
          statusKey: derivedStatus.key,
          feedbackCount: webinar.feedbackCount || 0,
          registeredCount: webinar.registeredCount || 0,
          hasUploads: Boolean(webinar.hasUploads),
          uploadsComplete: Boolean(webinar.uploadsComplete),
          domain: webinar.domain,
          speaker: {
            name: webinar.speaker?.name || 'TBD',
            designation: webinar.speaker?.designation || 'TBD',
            passoutYear: webinar.speaker?.batch || 'TBD',
            department: webinar.speaker?.department || 'TBD',
            photo: resolveSpeakerPhotoUrl(webinar.speaker?.speakerPhoto || webinar.speaker?.photo),
            companyName: webinar.speaker?.companyName || 'TBD',
            email: webinar.speaker?.email || null
          },
          // Keep original data for modal
          webinarDate: webinar.webinarDate,
          deadline: webinar.deadline,
          time: webinar.time,
          venue: webinar.venue,
          meetingLink: rawMeetingLink,
          joinLink: resolvedJoinLink,
          alumniCity: webinar.alumniCity
        });

        return acc;
      }, {});

      setWebinars(groupedWebinars);
      setError(null);
    } catch (err) {
      console.error('Error fetching webinars:', err);
      setError('Failed to load webinars. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegistrations = async (email) => {
    if (!email) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/registrations/user/${encodeURIComponent(email)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user registrations');
      }

      const registrations = await response.json();
      const registeredIds = new Set(
        (registrations || [])
          .map((item) => item?.webinarId)
          .filter(Boolean)
          .map((id) => String(id))
      );
      setRegisteredWebinars(registeredIds);
    } catch (err) {
      console.error('Error fetching user registrations:', err);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchWebinars();
      fetchCurrentPhase();
      fetchPhases();
    }, 0);

    return () => clearTimeout(timeoutId);
    // The fetch functions are intentionally invoked once on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phases.length > 0 && selectedPhase === null) {
      const fallbackPhaseId = currentPhase?.phaseId ?? phases[phases.length - 1]?.phaseId ?? phases[0]?.phaseId;
      if (fallbackPhaseId !== undefined && fallbackPhaseId !== null) {
        const timeoutId = setTimeout(() => setSelectedPhase(Number(fallbackPhaseId)), 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [phases, currentPhase, selectedPhase]);

  useEffect(() => {
    const fetchUserInfo = () => {
      try {
        const email = localStorage.getItem('userEmail');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (email) {
          setUserEmail(email);
          setIsAdmin(isAdmin);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    const fetchCoordinators = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/coordinators`);
        if (response.ok) {
          const coordinatorsData = await response.json();
          setCoordinators(coordinatorsData);
        }
      } catch (error) {
        console.error('Error fetching coordinators:', error);
      }
    };

    fetchUserInfo();
    fetchCoordinators();
  }, []);

  // Update registrationEmail when userEmail is set
  useEffect(() => {
    if (userEmail) {
      const timeoutId = setTimeout(() => {
        setRegistrationEmail(userEmail);
        fetchUserRegistrations(userEmail);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [userEmail]);

  const phaseWebinars = useMemo(() => {
    const phaseId = selectedPhase ?? currentPhase?.phaseId;
    if (!phaseId) return {};

    const filtered = {};
    Object.entries(webinars).forEach(([month, monthWebinars]) => {
      const inSelectedPhase = [...monthWebinars]
        .filter((wb) => Number(wb.phaseId) === Number(phaseId))
        .sort((a, b) => new Date(b.webinarDate) - new Date(a.webinarDate));

      if (inSelectedPhase.length > 0) {
        filtered[month] = inSelectedPhase;
      }
    });

    return Object.fromEntries(
      Object.entries(filtered).sort(([, monthWebinarsA], [, monthWebinarsB]) => {
        const firstDateA = monthWebinarsA[0]?.webinarDate ? new Date(monthWebinarsA[0].webinarDate) : new Date(0);
        const firstDateB = monthWebinarsB[0]?.webinarDate ? new Date(monthWebinarsB[0].webinarDate) : new Date(0);
        return firstDateB - firstDateA;
      })
    );
  }, [webinars, currentPhase, selectedPhase]);

  /** ------------------ Webinar Card ------------------ */
  const WebinarCard = ({ webinar }) => {
    const posterContainerRef = useRef(null);
    const posterDownloadRef = useRef(null);
    const [posterScale, setPosterScale] = useState({ scale: 0.311 });
    const [isPosterDownloading, setIsPosterDownloading] = useState(false);

    const handlePosterDownload = async () => {
      const posterWrapper = posterDownloadRef.current;
      const poster = posterWrapper?.querySelector('.webinar-poster');
      if (!poster || isPosterDownloading) return;

      try {
        setIsPosterDownloading(true);
        // Capture the poster itself, not its scaled preview wrapper. Using the
        // normal canvas renderer keeps local logos and speaker photos in the
        // output; SVG/foreignObject capture exports a blank canvas in Chrome.
        const canvas = await html2canvas(poster, {
          backgroundColor: '#ffffff',
          scale: 1,
          width: 900,
          height: 1200,
          windowWidth: 1200,
          windowHeight: 1200,
          useCORS: true,
          imageTimeout: 15000,
          logging: false,
          onclone: (clonedDocument) => {
            const clonedWrapper = clonedDocument.getElementById(posterWrapper.id);
            const clonedPoster = clonedWrapper?.querySelector('.webinar-poster');
            if (!clonedWrapper || !clonedPoster) return;

            clonedWrapper.style.transform = 'none';

            // html2canvas 1.x cannot parse Tailwind 4's OKLCH/color-mix
            // values. Give its cloned poster only conventional CSS colors;
            // this does not change the poster the user sees on the page.
            clonedPoster.querySelectorAll('*').forEach((element) => {
              element.style.color = '#ffffff';
              element.style.setProperty('background', 'transparent', 'important');
              element.style.setProperty('background-color', 'transparent', 'important');
              element.style.setProperty('border-color', 'transparent', 'important');
              element.style.setProperty('box-shadow', 'none', 'important');
              element.style.setProperty('text-shadow', 'none', 'important');
              element.style.setProperty('filter', 'none', 'important');
              element.style.setProperty('backdrop-filter', 'none', 'important');
              element.style.setProperty('mix-blend-mode', 'normal', 'important');

              const classes = element.className || '';
              if (classes.includes('bg-white/80')) element.style.setProperty('background', 'rgba(255, 255, 255, 0.8)', 'important');
              else if (classes.includes('bg-white')) element.style.setProperty('background', '#ffffff', 'important');
              else if (classes.includes('bg-black/95')) element.style.setProperty('background', 'rgba(0, 0, 0, 0.95)', 'important');
              else if (classes.includes('bg-blue-200')) element.style.setProperty('background', '#bfdbfe', 'important');

              if (classes.includes('speaker-photo-placeholder')) {
                element.style.setProperty('border-color', '#ffffff', 'important');
              }

              if (classes.includes('association-title')) {
                element.style.setProperty('color', '#06204a', 'important');
              }

              if (classes.includes('text-black')) element.style.color = '#000000';
              else if (classes.includes('text-[#07419e]')) element.style.color = '#07419e';
              else if (classes.includes('text-[#06204A]')) element.style.color = '#06204a';
              else if (classes.includes('text-blue-900')) element.style.color = '#1e3a8a';
              else if (classes.includes('text-green-400')) element.style.color = '#4ade80';
              else if (classes.includes('text-cyan-200')) element.style.color = '#a5f3fc';
            });

            const posterColor = poster.style.backgroundColor || '#06204a';
            clonedPoster.style.setProperty('width', '900px', 'important');
            clonedPoster.style.setProperty('height', '1200px', 'important');
            clonedPoster.style.setProperty('background', posterColor, 'important');
            clonedPoster.style.setProperty('background-color', posterColor, 'important');
            clonedPoster.style.setProperty('color', '#ffffff', 'important');
          },
        });

        normalizePosterBackground(canvas, poster.style.backgroundColor);
        const bestBlob = await createPosterJpeg(canvas);
        if (!bestBlob) throw new Error('JPEG conversion failed');

        const safeTitle = String(webinar.title || 'webinar-poster')
          .trim()
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-|-$/g, '') || 'webinar-poster';
        saveAs(bestBlob, `${safeTitle}.jpg`);
        setPopup({ show: true, message: 'Poster download started.', type: 'success' });
      } catch (error) {
        console.error('Unable to download webinar poster:', error);
        setPopup({
          show: true,
          message: 'Unable to create the poster. Please refresh the page and try again.',
          type: 'error'
        });
      } finally {
        setIsPosterDownloading(false);
      }
    };

    useEffect(() => {
      const updateScale = () => {
        const container = posterContainerRef.current;
        if (!container) return;

        const containerWidth = container.offsetWidth;
        const posterWidth = 900;

        setPosterScale({
          scale: containerWidth / posterWidth
        });
      };

      updateScale();
      const timeoutId = setTimeout(updateScale, 0);

      const resizeObserver = new ResizeObserver(updateScale);
      if (posterContainerRef.current) {
        resizeObserver.observe(posterContainerRef.current);
      }
      window.addEventListener('resize', updateScale);

      return () => {
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateScale);
      };
    }, []);

    const isRegistered = registeredWebinars.has(String(webinar._id));
    const deadlineEnd = getDeadlineEnd(webinar.deadline);
    const isDeadlinePassed = deadlineEnd && new Date() > deadlineEnd;
    const isWithinOneWeek = deadlineEnd && (deadlineEnd - new Date()) <= (7 * 24 * 60 * 60 * 1000) && (deadlineEnd - new Date()) > 0;
    const feedbackWindow = (() => {
  if (!webinar.webinarDate || !webinar.time) return { enabled: false, closed: false };

  try {
    // Webinar date
    const webinarStart = new Date(webinar.webinarDate);

    // Parse time (supports "3:00 PM", "10 AM", "15:00")
    const match = webinar.time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);

    if (!match) return { enabled: false, closed: false };

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || "0", 10);
    const period = match[3]?.toUpperCase();

    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    webinarStart.setHours(hours, minutes, 0, 0);

    // Webinar duration = 1 hour
    const webinarEnd = new Date(webinarStart);
    webinarEnd.setHours(webinarEnd.getHours() + 1);

    // Feedback is available for one week after the webinar ends.
    const feedbackCloseTime = new Date(webinarEnd);
    feedbackCloseTime.setDate(feedbackCloseTime.getDate() + 7);
    const now = new Date();
    return {
      enabled: now >= webinarEnd && now <= feedbackCloseTime,
      closed: now > feedbackCloseTime
    };
  } catch (err) {
    console.error("Feedback time calculation failed:", err);
    return { enabled: false, closed: false };
  }
})();
    const isFeedbackEnabled = feedbackWindow.enabled;
    const isCertificateEnabled = webinar.attendedCount > 0;
    const isCoordinator = coordinators.some(
      coord => String(coord.email || '').trim().toLowerCase() === userEmail.trim().toLowerCase()
    );
    const canUpload = isCoordinator || isAdmin;
    const canViewStatus = !userEmail || isCoordinator || isAdmin;
    const isOnlineLink = Boolean(webinar.joinLink);
    const derivedStatus = getDerivedWebinarStatus(webinar);
    const statusKey = getStatusCssKey(derivedStatus.key);
    const statusLabel = derivedStatus.label;

    console.log('Rendering WebinarCard for webinar:', webinar.title, 'userEmail:', userEmail, 'isCoordinator:', isCoordinator, 'isAdmin:', isAdmin, 'canUpload:', canUpload);

    return (
      <div className="webinar1-card webinar-event-card">
        <div className="webinar-card-header-row">
          {canViewStatus && (
            <span className={`webinar-status-badge webinar-status-${statusKey}`}>
              {statusLabel}
            </span>
          )}

          {canUpload && (
            <button
              onClick={() => navigate(`/webinar-details/${webinar._id}/${encodeURIComponent(userEmail)}`, { state: { webinar } })}
              className="view-details-button"
              title="View Webinar Details"
            >
              <FiEye size={20} />
            </button>
          )}
        </div>

        {/* Card Content - Horizontal Layout */}
        <div className="webinar-card-content-row">
          {/* Left Side - Poster */}
          <div className="webinar-poster-column">
            <div className="webinar-poster-box" ref={posterContainerRef}>
              <div
                ref={posterDownloadRef}
                id={`webinar-poster-download-${webinar._id}`}
                style={{
                  transform: `scale(${posterScale.scale})`,
                  transformOrigin: 'top left'
                }}
              >
              <WebinarPoster
                desktopPreview
                alumniPhoto={webinar.speaker?.photo || null}
                webinarTopic={webinar.title}
                webinarDate={new Date(webinar.webinarDate).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
                webinarTime={webinar.time}
                webinarVenue={webinar.venue}
                alumniName={webinar.speaker.name}
                alumniDesignation={webinar.speaker.designation}
                alumniCompany={webinar.speaker?.companyName || 'TBD'}
                alumniCity={webinar.alumniCity}
                alumniBatch={webinar.speaker.passoutYear}
                alumniDepartment={webinar.speaker.department}
                webinarDomain={webinar.domain}
              />
              </div>
            </div>
            {canUpload && (
              <button
                type="button"
                className="webinar-poster-download-button"
                onClick={handlePosterDownload}
                disabled={isPosterDownloading}
              >
                {isPosterDownloading ? 'Preparing Poster...' : 'Download Poster'}
              </button>
            )}
          </div>

          {/* Right Side - Content */}
          <div className="webinar-card-body">
            <div className="mb-2 webinar-card-title-wrap">
              <h3 className="webinar-card-title">{webinar.title}</h3>
            </div>

            {/* Info Section */}
            <div className="webinar-card-info">
              <p className="text-gray-700">
                <span className="font-semibold">Date & Time:</span> {webinar.slot}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Deadline:</span> {webinar.formattedDeadline}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Registered:</span> {webinar.registered}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Domain:</span> {webinar.domain}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Join:</span>{" "}
                {isOnlineLink ? (
                  <a
                    href={webinar.joinLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 underline"
                  >
                    Click Here
                  </a>
                ) : (
                  <span className="text-gray-500">In Person</span>
                )}
              </p>
            </div>

            <div className="webinar-card-actions">
              <button
                onClick={() => !isRegistered && !isDeadlinePassed && isWithinOneWeek && setSelectedWebinar(webinar)}
                className={`submit-btn text-sm py-3 px-4 flex-1 ${
                  isRegistered || isDeadlinePassed || !isWithinOneWeek
                    ? 'opacity-50 cursor-not-allowed bg-gray-400'
                    : ''
                }`}
                disabled={isRegistered || isDeadlinePassed || !isWithinOneWeek}
              >
                {isRegistered
                  ? 'Registered'
                  : isDeadlinePassed
                  ? 'Deadline Passed'
                  : !isWithinOneWeek
                  ? 'Registration Soon'
                  : 'Register'}
              </button>

              <button
                onClick={() => {
                  if (!currentPhase || !currentPhase.phaseId) {
                    setPopup({
                      show: true,
                      message: 'Current phase is not set. Please try again later.',
                      type: 'error'
                    });
                    return;
                  }
                  navigate(
                    `/8?webinarId=${webinar._id}&topic=${encodeURIComponent(
                      webinar.title
                    )}&speaker=${encodeURIComponent(
                      webinar.speaker.name
                    )}&phaseId=${currentPhase.phaseId}&email=${encodeURIComponent(userEmail)}`
                  );
                }}
                className={`submit-btn text-sm py-3 px-4 flex-1 ${
                  !isFeedbackEnabled ? 'opacity-50 cursor-not-allowed bg-gray-400' : ''
                }`}
                disabled={!isFeedbackEnabled}
              >
                {isFeedbackEnabled ? 'Feedback' : (feedbackWindow.closed ? 'Feedback Closed' : 'Feedback Open Soon')}
              </button>
            </div>
          </div>
        </div>
        <div className="webinar-card-certificate">
          <button
            onClick={() => handleCertificateDownload(webinar)}
            className={`submit-btn text-sm py-2 px-4 w-full ${
              !isCertificateEnabled ? 'opacity-50 cursor-not-allowed bg-gray-400' : ''
            }`}
            disabled={!isCertificateEnabled}
          >
            {isCertificateEnabled ? 'Certificate' : 'Certificate Not Available'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`student-form-page webinar-events-page ${isAnyModalOpen ? 'modal-open' : ''}`}>

      {/* Background Animated Orbs */}
      <div className="background-orbs">
        <div className="orb orb-purple animation-delay-2000"></div>
        <div className="orb orb-blue animation-delay-4000"></div>
        <div className="orb orb-pink"></div>
      </div>

      {/* Main Container */}
      <div className="form-wrapper">
        <div>
          {/* Header */}
          <div className="form-header webinar-events-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ minWidth: '220px', flex: '1 1 auto' }}>
              <div className="icon-wrapper">
                  <FiBookOpen className="header-icon" />
              </div>
              <h1 className="form-title webinar-events-title">Webinar Events</h1>
              <p className="webinar-subtitle">
                Current Phase: {phaseLoading ? 'Loading...' : currentPhase?.displayText || 'Not Set'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {/* <label htmlFor="phase-select" style={{ fontWeight: 700, color: '#4b3f91', whiteSpace: 'nowrap' }}>Phase</label> */}
            <select
              id="phase-select"
              className="select-field"
              value={selectedPhase ?? ''}
              onChange={(e) => setSelectedPhase(Number(e.target.value))}
              style={{ minWidth: '140px', maxWidth: '140px', padding: '0.75rem 0.9rem', fontSize: '0.95rem' }}
            >
              <option value="" disabled>Select phase</option>
              {phases.map((phase) => (
                <option key={phase.phaseId} value={phase.phaseId}>
                  Phase {phase.phaseId}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-lg text-gray-600">Loading webinars...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-lg text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 submit-btn"
              >
                Try Again
              </button>
            </div>
          ) : (
            Object.keys(phaseWebinars).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg text-gray-600">No webinars available for the current phase.</p>
              </div>
            ) : (
              Object.entries(phaseWebinars).map(([month, monthWebinars]) => (
                <div key={month}>
                  <div className="webinar-month-row">
                    <h2 className="webinar-section-title">
                      {monthWebinars[0]?.webinarDate
                        ? new Date(monthWebinars[0].webinarDate).toLocaleString('default', { month: 'long', year: 'numeric' })
                        : month.charAt(0).toUpperCase() + month.slice(1)}
                    </h2>
                    {isAdmin && (
                      <button className="generate-btn" onClick={() => generateCircular(month)}>Generate Circular</button>
                    )}


                  </div>
                  <div className="webinar-events-grid">
                    {monthWebinars.map((wb, i) => (
                      <WebinarCard key={wb._id || i} webinar={wb} />
                    ))}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Webinar Detail Modal */}
      {selectedWebinar && (
        <WebinarDetail
          webinar={selectedWebinar}
          onClose={() => setSelectedWebinar(null)}
          registrationEmail={registrationEmail}
          onRegistrationEmailChange={setRegistrationEmail}
          registeredWebinars={registeredWebinars}
          onRegister={handleRegistration}
        />
      )}

      {/* Certificate Download Modal */}
      {selectedWebinarForCertificate && (
        <div className="fixed inset-0 bg-white/85 bg-opacity-30 flex items-center justify-center p-5 z-50">
          <div className="bg-gradient-to-br from-purple-50/70 via-pink-50/70 to-blue-50/70
                          rounded-2xl max-w-md w-full shadow-2xl relative overflow-y-auto
                          max-h-[90vh] webinar-modal-scroll-hidden p-8">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setCertificateEmail('');
                  setSelectedWebinarForCertificate(null);
                }}
                className="text-purple-900 hover:text-purple-800 text-2xl font-bold"
              >
                X
              </button>
            </div>
            <div className="form-header">
              <div className="icon-wrapper">
                <FiAward className="header-icon" />
              </div>
              <h1 className="text-2xl font-bold text-[#7d48b9]">Download Certificate</h1>
              <p className="webinar-subtitle">
                {selectedWebinarForCertificate.title}
              </p>
            </div>

            <div className="form-card max-w-4xl">
              <div className="form-fields">
              <div className="form-group">
                <label className="field-label">
                    <Mail className="field-icon" /> Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    name="certificateEmail"
                    value={certificateEmail}
                    onChange={(e) => setCertificateEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="input-field"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={downloadCertificate}
                    className="submit-btn"
                    disabled={certificateLoading}
                  >
                    {certificateLoading ? 'Preparing Certificate...' : 'Download Certificate'}
                  </button>
                </div>
              </div>
            </div>

            <p className="form-footer">Designed with 💜 for Alumni Network</p>
          </div>
        </div>
      )}

      {popup.show && (
        <Popup
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup({ show: false, message: '', type: 'success' })}
        />
      )}

      {/* Certificate Preview Modal */}
      {showCertificatePreview && certificateData && (
        <div className="fixed inset-0 bg-white/85 bg-opacity-30 flex items-center justify-center p-5 z-50">
          <div className="bg-gradient-to-br from-purple-50/70 via-pink-50/70 to-blue-50/70
                          rounded-2xl max-w-5xl w-full shadow-2xl relative overflow-y-auto
                          max-h-[90vh] webinar-modal-scroll-hidden p-8">
            <div className="flex justify-end mt-4 max-w-5xl">
              <button
                onClick={() => {
                  setShowCertificatePreview(false);
                  setCertificateData(null);
                }}
                className="text-purple-900 hover:text-purple-800 text-2xl font-bold"
              >
                X
              </button>
            </div>
            <div className="form-header">
              <div className="icon-wrapper">
                <FiAward className="header-icon" />
              </div>
              <p className="form-title flex justify-center mb-6">
                Congratulations on completing the webinar!
              </p>
              <div className="form-card">
                <div className="flex justify-center mb-6">
                  <WebinarCertificate
                    name={certificateData.name}
                    programTitle={certificateData.programTitle}
                    date={certificateData.date}
                    autoDownload={false}
                  />
                </div>
              </div>
            </div>

            <p className="form-footer">Designed with 💜 for Alumni Network</p>
          </div>
        </div>
      )}

      {/* Circular Preview Modal */}
      {showCircularPreview && circularData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50
             rounded-2xl max-w-5xl w-full shadow-2xl relative overflow-y-auto
             max-h-[90vh] webinar-modal-scroll-hidden p-8">
            <div className="flex justify-end mt-4 max-w-5xl">
              <button
                onClick={() => {
                  setShowCircularPreview(false);
                  setCircularData(null);
                  setCircularMonth('');
                }}
                className="text-purple-900 hover:text-purple-800 text-2xl font-bold"
              >
                X
              </button>
            </div>
            <div className="form-header">
              <div className="icon-wrapper">
                <FiBookOpen className="header-icon" />
              </div>
              <h1 className="text-2xl font-bold text-[#7d48b9] mb-4 tracking-wider">Webinar Circular Preview</h1>
              <p className="form-title flex justify-center mb-6">
                {circularMonth} Webinar Schedule
              </p>
            </div>

            <div className="form-card">
              <WebinarCircular
                date={`${new Date().getDate().toString().padStart(2, '0')}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getFullYear()}`}
                data={circularData}
                month={circularMonth}
                onClose={() => {
                  setShowCircularPreview(false);
                  setCircularData(null);
                  setCircularMonth('');
                }}
                onDownload={downloadCircular}
              />
            </div>

            <p className="form-footer">Designed with 💜 for Alumni Network</p>
          </div>
        </div>
      )}

    </div>
  );
}