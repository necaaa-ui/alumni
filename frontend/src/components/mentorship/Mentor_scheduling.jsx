import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MentorshipSchedulingForm.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function MentorshipSchedulingForm() {
  const navigate = useNavigate();
  
  // Get email and role from localStorage
  const getUserInfo = () => {
    const storedEmail = localStorage.getItem('userEmail');
    const storedRole = localStorage.getItem('userRole'); // 'mentor' or 'mentee'
    return { email: storedEmail || "", role: storedRole || "mentor" }; // Default to mentor
  };

  const { email: storedEmail, role: storedRole } = getUserInfo();
  const isMentor = storedRole === 'mentor';
  const isMentee = storedRole === 'mentee';

  const [formData, setFormData] = useState({
    mentorName: '',
    mentorEmail: isMentor ? storedEmail : '', // Only pre-fill if mentor
    mentorId: '',
    menteeEmails: [],
    commencementDate: '',
    endDate: '',
    meetingTime: '',
    duration: '',
    platform: '',
    meetingLink: '',
    agenda: '',
    preferredDay: '',
    numberOfMeetings: 1,
    phaseId: null,
    phaseName: ''
  });

  const [assignedMentees, setAssignedMentees] = useState([]);
  const [generatedDates, setGeneratedDates] = useState([]);
  const [customDates, setCustomDates] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [phases, setPhases] = useState([]);
  const [loadingPhase, setLoadingPhase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMentor, setLoadingMentor] = useState(false);
  const [dateValidation, setDateValidation] = useState({
    commencementDateValid: false,
    endDateValid: false
  });

  const emailTimeoutRef = useRef(null);

  // Auto-scroll to top when submitted
  useEffect(() => {
    if (submitted) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [submitted]);

  // Fetch data based on user role on component mount
  useEffect(() => {
    if (storedEmail && storedEmail.trim()) {
      const trimmedEmail = storedEmail.toLowerCase().trim();
      if (/\S+@\S+\.\S+/.test(trimmedEmail)) {
        setTimeout(() => {
          if (isMentor) {
            fetchMentorData(trimmedEmail);
          } else if (isMentee) {
            fetchMentorByMenteeEmail(trimmedEmail);
          }
        }, 100);
      }
    }
  }, [storedEmail, isMentor, isMentee]);

  // Fetch phases on component mount
  useEffect(() => {
    fetchPhases();
    return () => {
      if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    };
  }, []);

  // Fetch all phases and determine current active phase
  const fetchPhases = async () => {
    try {
      setLoadingPhase(true);
      const res = await axios.get(`${API_BASE_URL}/api/phase`);
      const data = res.data;
      if (data.phases) {
        setPhases(data.phases);
        const currentPhase = data.phases.find(
          (p) => new Date(p.startDate) <= new Date() && new Date() <= new Date(p.endDate)
        );
        if (currentPhase) {
          setFormData((prev) => ({
            ...prev,
            phaseId: currentPhase.phaseId,
            phaseName: `${currentPhase.name} (${new Date(currentPhase.startDate).toLocaleDateString()} - ${new Date(currentPhase.endDate).toLocaleDateString()})`,
          }));
        } else {
          console.warn("No active phase found");
        }
      }
    } catch (err) {
      console.error("Failed to fetch phases:", err);
    } finally {
      setLoadingPhase(false);
    }
  };

  // Fetch mentor by mentee email (NEW FUNCTION)
  const fetchMentorByMenteeEmail = async (menteeEmail) => {
    try {
      setLoadingMentor(true);
      const res = await axios.get(`${API_BASE_URL}/api/meetings/mentor-by-mentee?email=${menteeEmail}`);
      
      const mentor = res.data.mentor || {};
      const assigned = res.data.assignedMentees || [];
      
      setFormData(prev => ({
        ...prev,
        mentorName: mentor.name || '',
        mentorEmail: mentor.email || '',
        mentorId: mentor._id || '',
        commencementDate: res.data.commencement_date || '',
        endDate: res.data.end_date || '',
        menteeEmails: assigned.map(m => (m.basic?.email_id || m.email || ''))
      }));

      const mentees = assigned.map(m => ({
        _id: m._id || m.id || '',
        name: m.basic?.name || m.name || 'Unknown',
        email: m.basic?.email_id || m.email || '',
        areaOfInterest: m.area_of_interest || m.areas_of_interest || ''
      }));

      setAssignedMentees(mentees);
      
    } catch (error) {
      console.error("Failed to fetch mentor by mentee email:", error);
      setAssignedMentees([]);
      setFormData(prev => ({
        ...prev,
        mentorName: '',
        mentorEmail: '',
        mentorId: '',
        commencementDate: '',
        endDate: '',
        menteeEmails: []
      }));
    } finally {
      setLoadingMentor(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    // Add real-time date validations
    if (name === "commencementDate" && value) {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const selectedDate = new Date(value);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < currentDate) {
        setErrors(prev => ({ 
          ...prev, 
          commencementDate: "Commencement date must be today or a future date" 
        }));
        setDateValidation(prev => ({ ...prev, commencementDateValid: false }));
      } else {
        setErrors(prev => ({ ...prev, commencementDate: '' }));
        setDateValidation(prev => ({ ...prev, commencementDateValid: true }));
      }
    }
    
    if (name === "endDate" && value && formData.commencementDate) {
      const commencementDate = new Date(formData.commencementDate);
      const endDate = new Date(value);
      commencementDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      if (endDate <= commencementDate) {
        setErrors(prev => ({ 
          ...prev, 
          endDate: "End date must be after commencement date" 
        }));
        setDateValidation(prev => ({ ...prev, endDateValid: false }));
      } else {
        setErrors(prev => ({ ...prev, endDate: '' }));
        setDateValidation(prev => ({ ...prev, endDateValid: true }));
      }
    }
    
    // Add real-time URL validation for meeting link
    if (name === "meetingLink" && value) {
      const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\- .\/?%&=]*)?$/;
      if (!urlPattern.test(value)) {
        setErrors(prev => ({ 
          ...prev, 
          meetingLink: "Please enter a valid URL (e.g., https://meet.google.com/abc-xyz)" 
        }));
      } else {
        setErrors(prev => ({ ...prev, meetingLink: '' }));
      }
    }

    // Only allow email lookup if user is mentor (mentees can't change mentor email)
    if (name === "mentorEmail" && value.length > 5 && isMentor) {
      if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
      emailTimeoutRef.current = setTimeout(() => {
        fetchMentorData(value.trim());
      }, 600);
    }
  };

  const fetchMentorData = async (email) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/meetings/mentor-details?email=${email}`);

      const mentor = res.data.mentor || {};
      const assigned = res.data.assignedMentees || [];

      setFormData(prev => ({
        ...prev,
        mentorName: mentor.name || '',
        mentorId: mentor._id || '',
        commencementDate: res.data.commencement_date || '',
        endDate: res.data.end_date || '',
        menteeEmails: assigned.map(m => (m.basic?.email_id || m.email || ''))
      }));

      const mentees = assigned.map(m => ({
        _id: m._id || m.id || '',
        name: m.basic?.name || m.name || 'Unknown',
        email: m.basic?.email_id || m.email || '',
        areaOfInterest: m.area_of_interest || m.areas_of_interest || ''
      }));

      setAssignedMentees(mentees);

    } catch (error) {
      console.error("Mentor not found", error);
      setAssignedMentees([]);
      setFormData(prev => ({
        ...prev,
        mentorName: '',
        mentorId: '',
        commencementDate: '',
        endDate: '',
        menteeEmails: []
      }));
    }
  };

  // ✅ UPDATED: Handle mentee checkbox selection
  const handleMenteeCheckboxChange = (menteeEmail) => {
    setFormData(prev => {
      const currentEmails = [...prev.menteeEmails];
      if (currentEmails.includes(menteeEmail)) {
        // Remove if already selected
        return { ...prev, menteeEmails: currentEmails.filter(email => email !== menteeEmail) };
      } else {
        // Add if not selected
        return { ...prev, menteeEmails: [...currentEmails, menteeEmail] };
      }
    });
    
    // Clear error when at least one mentee is selected
    if (errors.menteeEmails && formData.menteeEmails.length === 0) {
      setErrors(prev => ({ ...prev, menteeEmails: '' }));
    }
  };

  // Auto-generate meeting dates - Evenly distributed across months
  useEffect(() => {
    const { commencementDate, endDate, preferredDay, numberOfMeetings } = formData;
    if (!commencementDate || !endDate || !preferredDay || !numberOfMeetings) {
      setGeneratedDates([]);
      setCustomDates([]);
      return;
    }

    const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const start = new Date(commencementDate);
    const end = new Date(endDate);
    const preferredDayIndex = dayMap[preferredDay];
    
    let dates = [];
    
    // 1. Find ALL preferred days within the date range
    let allPreferredDays = [];
    let current = new Date(start);
    
    // Find first preferred day on/after commencement
    const dayOffset = (preferredDayIndex - current.getDay() + 7) % 7;
    current.setDate(current.getDate() + dayOffset);
    
    // Collect all preferred days until end date
    while (current <= end) {
      allPreferredDays.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    
    // 2. If we have preferred days, distribute them evenly across the timeline
    if (allPreferredDays.length > 0) {
      if (numberOfMeetings === 1) {
        dates = [allPreferredDays[0]];
      } else if (numberOfMeetings >= allPreferredDays.length) {
        dates = allPreferredDays.slice(0, numberOfMeetings);
      } else {
        const step = (allPreferredDays.length - 1) / (numberOfMeetings - 1);
        for (let i = 0; i < numberOfMeetings; i++) {
          const index = Math.round(i * step);
          if (index < allPreferredDays.length) {
            dates.push(allPreferredDays[index]);
          }
        }
      }
    }
    
    setGeneratedDates(dates);
    setCustomDates(Array(Math.max(0, numberOfMeetings - dates.length)).fill(''));
  }, [formData.commencementDate, formData.endDate, formData.preferredDay, formData.numberOfMeetings]);

  // Validate custom date is within range
  const handleCustomDateChange = (index, value) => {
    const updated = [...customDates];
    updated[index] = value;
    
    // Validate the custom date is within commencement and end date
    if (value && formData.commencementDate && formData.endDate) {
      const selectedDate = new Date(value);
      const commencementDate = new Date(formData.commencementDate);
      const endDate = new Date(formData.endDate);
      
      // Reset hours to compare dates only
      selectedDate.setHours(0, 0, 0, 0);
      commencementDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < commencementDate) {
        setErrors(prev => ({ 
          ...prev, 
          [`customDate${index}`]: `Date must be on or after ${commencementDate.toLocaleDateString()}` 
        }));
      } else if (selectedDate > endDate) {
        setErrors(prev => ({ 
          ...prev, 
          [`customDate${index}`]: `Date must be on or before ${endDate.toLocaleDateString()}` 
        }));
      } else {
        setErrors(prev => ({ ...prev, [`customDate${index}`]: '' }));
      }
    }
    
    setCustomDates(updated);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.mentorEmail) newErrors.mentorEmail = "Mentor email is required";
    if (!formData.mentorId) newErrors.mentorId = "Valid mentor required";
    if (!formData.menteeEmails.length) newErrors.menteeEmails = "Select at least 1 mentee";
    if (!formData.commencementDate) newErrors.commencementDate = "Commencement date required";
    if (!formData.endDate) newErrors.endDate = "End date required";
    if (!formData.meetingTime) newErrors.meetingTime = "Meeting time required";
    if (!formData.duration) newErrors.duration = "Duration required";
    if (!formData.platform) newErrors.platform = "Platform required";
    if (!formData.meetingLink) newErrors.meetingLink = "Meeting link required";
    if (!formData.agenda) newErrors.agenda = "Agenda required";
    if (!formData.preferredDay) newErrors.preferredDay = "Preferred day required";
    if (!formData.numberOfMeetings || formData.numberOfMeetings < 1) newErrors.numberOfMeetings = "Enter valid number of meetings";
    if (!formData.phaseId) newErrors.phaseId = "No active phase found";

    // Add date validations
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const commencementDate = new Date(formData.commencementDate);
    commencementDate.setHours(0, 0, 0, 0);
    const endDate = new Date(formData.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    if (formData.commencementDate && commencementDate < currentDate) {
      newErrors.commencementDate = "Commencement date must be today or a future date";
    }
    
    if (formData.commencementDate && formData.endDate && endDate <= commencementDate) {
      newErrors.endDate = "End date must be after commencement date";
    }
    
    // Add URL format validation for meeting link
    if (formData.meetingLink) {
      const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\- .\/?%&=]*)?$/;
      if (!urlPattern.test(formData.meetingLink)) {
        newErrors.meetingLink = "Please enter a valid URL (e.g., https://meet.google.com/abc-xyz)";
      }
    }

    // Validate custom dates are within range
    customDates.forEach((d, i) => { 
      if (!d) {
        newErrors[`customDate${i}`] = "Required";
      } else if (formData.commencementDate && formData.endDate) {
        const selectedDate = new Date(d);
        const commencementDate = new Date(formData.commencementDate);
        const endDate = new Date(formData.endDate);
        selectedDate.setHours(0, 0, 0, 0);
        commencementDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < commencementDate) {
          newErrors[`customDate${i}`] = `Date must be on or after ${commencementDate.toLocaleDateString()}`;
        } else if (selectedDate > endDate) {
          newErrors[`customDate${i}`] = `Date must be on or before ${endDate.toLocaleDateString()}`;
        }
      }
    });

    return newErrors;
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    // Check if all required fields are filled
    const requiredFields = [
      formData.mentorEmail,
      formData.mentorId,
      formData.menteeEmails.length > 0,
      formData.commencementDate,
      formData.endDate,
      formData.meetingTime,
      formData.duration,
      formData.platform,
      formData.meetingLink,
      formData.agenda,
      formData.preferredDay,
      formData.numberOfMeetings > 0,
      formData.phaseId
    ];

    const allRequiredFilled = requiredFields.every(field => field);
    
    // Check if there are any errors
    const hasErrors = Object.keys(errors).some(key => errors[key] !== '');
    
    // Check date validations
    const isCommencementValid = dateValidation.commencementDateValid || !formData.commencementDate;
    const isEndDateValid = dateValidation.endDateValid || !formData.endDate;
    
    // Check if date fields have errors
    const hasDateErrors = errors.commencementDate || errors.endDate;
    
    return allRequiredFilled && !hasErrors && !hasDateErrors && isCommencementValid && isEndDateValid;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Phase validation before submission
    if (!formData.phaseId) {
      alert("No active phase found. Cannot schedule meeting.");
      return;
    }

    setSubmitting(true);

    try {
      const selectedMentees = assignedMentees.filter(m => formData.menteeEmails.includes(m.email));
      if (!selectedMentees.length) throw new Error("Selected mentees not found");

      const allDates = [
        ...generatedDates,
        ...customDates.map(d => new Date(d))
      ].map(d => new Date(d).toISOString());

      await axios.post(`${API_BASE_URL}/api/meetings/schedule`, {
        mentor_user_id: formData.mentorId,
        mentee_user_ids: selectedMentees.map(m => m._id),
        meeting_dates: allDates,
        meeting_time: formData.meetingTime,
        duration_minutes: parseInt(formData.duration),
        platform: formData.platform,
        meeting_link: formData.meetingLink,
        agenda: formData.agenda,
        preferred_day: formData.preferredDay,
        number_of_meetings: formData.numberOfMeetings,
        phaseId: formData.phaseId
      });

      setSubmitted(true);
      // ✅ AUTO REDIRECT TO '/14' AFTER 2.5 SECONDS
      setTimeout(() => {
        // Get email from stored email or localStorage
        const userEmail = storedEmail || localStorage.getItem('userEmail');
        
        if (userEmail) {
          // Navigate to dashboard with email parameter
          navigate(`/14?email=${encodeURIComponent(userEmail)}`);
        } else {
          navigate('/14');
        }
      }, 2500);

    } catch (error) {
      alert(error.response?.data?.message || error.message || "Meeting scheduling failed.");
      setSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  const handleGoBack = () => {
    navigate('/14');
  };

  // Get min date for custom date picker (commencement date or today)
  const getCustomDateMin = () => {
    if (formData.commencementDate) {
      return formData.commencementDate;
    }
    return today;
  };

  // Get max date for custom date picker (end date)
  const getCustomDateMax = () => {
    if (formData.endDate) {
      return formData.endDate;
    }
    return '';
  };

  return (
    <div className="form-wrapper">
      {/* Floating Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      
      {/* Dashboard Button */}
      <button className="dashboard-btn" onClick={handleGoBack}>
        ← Back to Dashboard
      </button>

      <div className="form-container">
        <div className="form-header">
          <h1 className="form-title">Mentorship Scheduling</h1>
          <p className="form-subtitle">
            {isMentor 
              ? `Scheduling as mentor: ${storedEmail}` 
              : isMentee 
                ? `Viewing schedule for mentor: ${formData.mentorName || 'Loading...'}` 
                : "Manage mentorship scheduling"
            }
          </p>
          {isMentee && loadingMentor && (
            <small className="info-text">Loading mentor information...</small>
          )}
        </div>

        <div className="form-card">
          {/* Enhanced Success Message */}
          {submitted && (
            <div className="success-message-container">
              <div className="success-message">
                <div className="success-icon">✓</div>
                <div className="success-content">
                  <h3 className="success-title">Meeting Scheduled Successfully!</h3>
                  <p className="success-text">
                    Your mentorship sessions have been scheduled. Mentees will be notified about the meetings.
                  </p>
                  <p className="redirect-text">
                    Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Phase Field */}
          <div className="form-group">
            <label className="label">Current Phase *</label>
            {loadingPhase ? (
              <div className="loading-phase">
                <small>Loading phase information...</small>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={formData.phaseName || "No active phase found"}
                  disabled
                  className={`input disabled-input ${!formData.phaseId ? 'input-warning' : ''}`}
                />
                {errors.phaseId && <span className="error-text">{errors.phaseId}</span>}
                {formData.phaseId && (
                  <small style={{ color: "#8b5cf6", fontWeight: "600" }}>
                    ✓ Active phase selected
                  </small>
                )}
              </>
            )}
          </div>

          {/* Mentor Email - Read-only for mentees, editable for mentors */}
          <div className="form-group">
            <label className="label">Mentor Email *</label>
            <input 
              type="email" 
              name="mentorEmail" 
              value={formData.mentorEmail} 
              onChange={handleChange} 
              className={`input ${errors.mentorEmail ? "input-error" : ""} ${(isMentee || (isMentor && storedEmail)) ? 'disabled-input' : ''}`}
              disabled={submitting || submitted || isMentee || (isMentor && !!storedEmail)}
              readOnly={isMentee || (isMentor && !!storedEmail)}
              placeholder="Enter mentor's email"
            />
            {isMentor && storedEmail && (
              <small className="info-text">Your mentor email (read-only)</small>
            )}
            {isMentee && (
              <small className="info-text">Your mentor's email (auto-filled)</small>
            )}
            {errors.mentorEmail && <span className="error-text">{errors.mentorEmail}</span>}
          </div>

          <div className="form-group">
            <label className="label">Mentor Name</label>
            <input 
              type="text" 
              name="mentorName" 
              value={formData.mentorName} 
              disabled 
              className="input disabled-input" 
            />
          </div>

          {/* Commencement Date - must be today or future */}
          <div className="form-group">
            <label className="label">Commencement Date *</label>
            <input 
              type="date" 
              name="commencementDate" 
              value={formData.commencementDate} 
              onChange={handleChange} 
              className={`input ${errors.commencementDate ? "input-error" : ""}`} 
              min={today}
              disabled={submitting || submitted}
            />
            {errors.commencementDate && <span className="error-text">{errors.commencementDate}</span>}
            
          </div>

          {/* End Date - must be after commencement */}
          <div className="form-group">
            <label className="label">End Date *</label>
            <input 
              type="date" 
              name="endDate" 
              value={formData.endDate} 
              onChange={handleChange} 
              className={`input ${errors.endDate ? "input-error" : ""}`} 
              min={formData.commencementDate || today}
              disabled={submitting || submitted}
            />
            {errors.endDate && <span className="error-text">{errors.endDate}</span>}
            
          </div>

          {/* Preferred Day & Number of Meetings */}
          <div className="form-group">
            <label className="label">Preferred Day *</label>
            <select 
              name="preferredDay" 
              value={formData.preferredDay} 
              onChange={handleChange} 
              className={`select ${errors.preferredDay ? 'input-error' : ''}`}
              disabled={submitting || submitted}
            >
              <option value="">-- Select Day --</option>
              {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.preferredDay && <span className="error-text">{errors.preferredDay}</span>}
          </div>

          <div className="form-group">
            <label className="label">Number of Meetings *</label>
            <input 
              type="number" 
              name="numberOfMeetings" 
              min="1" 
              value={formData.numberOfMeetings} 
              onChange={handleChange} 
              className={`input ${errors.numberOfMeetings ? 'input-error' : ''}`} 
              disabled={submitting || submitted}
            />
            {errors.numberOfMeetings && <span className="error-text">{errors.numberOfMeetings}</span>}
          </div>

          {/* Suggested Dates */}
          {generatedDates.length > 0 && (
            <div className="form-group">
              <label className="label">Suggested Dates (Evenly Distributed)</label>
              <div className="dates-grid">
                {generatedDates.map((d, i) => (
                  <div key={i} className="date-badge">
                    {new Date(d).toLocaleDateString('en-US', { 
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                    <div className="date-month">
                      {new Date(d).toLocaleDateString('en-US', { month: 'long' })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="date-info-text">
               {new Date(formData.commencementDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to {new Date(formData.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Custom Dates with range validation */}
          {customDates.length > 0 && customDates.map((_, i) => (
            <div key={i} className="form-group">
              <label className="label">Custom Date #{i+1} *</label>
              <input 
                type="date" 
                value={customDates[i]} 
                onChange={e => handleCustomDateChange(i, e.target.value)} 
                className={`input ${errors[`customDate${i}`] ? 'input-error' : ''}`} 
                min={getCustomDateMin()}
                max={getCustomDateMax()}
                disabled={submitting || submitted || !formData.commencementDate || !formData.endDate}
              />
              {errors[`customDate${i}`] && <span className="error-text">{errors[`customDate${i}`]}</span>}
              {formData.commencementDate && formData.endDate && (
                <small className="info-text">
                  Date must be between {new Date(formData.commencementDate).toLocaleDateString()} and {new Date(formData.endDate).toLocaleDateString()}
                </small>
              )}
            </div>
          ))}

          {/* ✅ UPDATED: Assigned Mentees as Checkboxes */}
          <div className="form-group">
            <label className="label">Assigned Mentees *</label>
            {assignedMentees.length === 0 && (
              <p className="no-mentees-text">No mentees assigned to this mentor.</p>
            )}
            {isMentee && assignedMentees.length > 0 && (
              <small className="info-text">
                You are included in this list as: {storedEmail}
              </small>
            )}
            
            {/* Checkbox list for mentees */}
            {assignedMentees.length > 0 && (
              <div className="mentees-checkbox-list">
                {assignedMentees.map((mentee) => (
                  <label key={mentee._id} className="mentee-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.menteeEmails.includes(mentee.email)}
                      onChange={() => handleMenteeCheckboxChange(mentee.email)}
                      disabled={submitting || submitted}
                      className="mentee-checkbox"
                    />
                    <span className="mentee-checkbox-text">
                      <strong>{mentee.name}</strong> ({mentee.email})
                      {mentee.email === storedEmail && isMentee && (
                        <span className="you-badge-checkbox"> (You)</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
            
            {errors.menteeEmails && <span className="error-text">{errors.menteeEmails}</span>}
            
            {formData.menteeEmails.length > 0 && (
              <small className="info-text success-text">
                ✓ {formData.menteeEmails.length} mentee(s) selected
              </small>
            )}
          </div>

          {/* Meeting Details */}
          <div className="form-group">
            <label className="label">Meeting Time *</label>
            <input 
              type="time" 
              name="meetingTime" 
              value={formData.meetingTime} 
              onChange={handleChange} 
              className={`input ${errors.meetingTime ? 'input-error' : ''}`} 
              disabled={submitting || submitted}
            />
            {errors.meetingTime && <span className="error-text">{errors.meetingTime}</span>}
          </div>

          <div className="form-group">
            <label className="label">Duration (minutes) *</label>
            <input 
              type="number" 
              name="duration" 
              value={formData.duration} 
              onChange={handleChange} 
              className={`input ${errors.duration ? 'input-error' : ''}`} 
              disabled={submitting || submitted}
            />
            {errors.duration && <span className="error-text">{errors.duration}</span>}
          </div>

          <div className="form-group">
            <label className="label">Platform *</label>
            <select 
              name="platform" 
              value={formData.platform} 
              onChange={handleChange} 
              className={`select ${errors.platform ? 'input-error' : ''}`}
              disabled={submitting || submitted}
            >
              <option value="">-- Select Platform --</option>
              <option value="zoom">Zoom</option>
              <option value="google-meet">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
            </select>
            {errors.platform && <span className="error-text">{errors.platform}</span>}
          </div>

          <div className="form-group">
            <label className="label">Meeting Link *</label>
            <input 
              type="url" 
              name="meetingLink" 
              value={formData.meetingLink} 
              onChange={handleChange} 
              className={`input ${errors.meetingLink ? 'input-error' : ''}`} 
              placeholder="https://meet.google.com/abc-xyz"
              disabled={submitting || submitted}
            />
            {errors.meetingLink && <span className="error-text">{errors.meetingLink}</span>}
          </div>

          <div className="form-group">
            <label className="label">Agenda *</label>
            <textarea 
              name="agenda" 
              value={formData.agenda} 
              onChange={handleChange} 
              className={`textarea ${errors.agenda ? 'input-error' : ''}`} 
              rows="5"
              disabled={submitting || submitted}
            />
            {errors.agenda && <span className="error-text">{errors.agenda}</span>}
          </div>

          <button 
            onClick={handleSubmit} 
            className="submit-btn"
            disabled={!isFormValid() || submitting || submitted || !formData.phaseId}
          >
            {submitting ? (
              <>
                <span className="loading-spinner"></span>
                Scheduling...
              </>
            ) : submitted ? (
              "Redirecting..."
            ) : !formData.phaseId ? (
              "No Active Phase"
            ) : !isFormValid() ? (
              "All Fields Required"
            ) : (
              "Schedule Meeting"
            )}
          </button>
          
          {!isFormValid() && !submitting && !submitted && formData.phaseId && (
            <small className="warning-text" style={{ display: 'block', marginTop: '8px', textAlign: 'center' }}>
              Please fill all required fields
            </small>
          )}
        </div>
      </div>
    </div>
  );
}