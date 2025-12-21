import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MentorshipSchedulingForm.css';

export default function MentorshipSchedulingForm() {
  const [formData, setFormData] = useState({
    mentorName: '',
    mentorEmail: '',
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
    numberOfMeetings: 1
  });

  const [assignedMentees, setAssignedMentees] = useState([]);
  const [generatedDates, setGeneratedDates] = useState([]);
  const [customDates, setCustomDates] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === "mentorEmail" && value.length > 5) fetchMentorData(value);
  };

  const fetchMentorData = async (email) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/meetings/mentor-details?email=${email.trim()}`);

      const mentor = res.data.mentor || {};
      const assigned = res.data.assignedMentees || [];

      setFormData(prev => ({
        ...prev,
        mentorName: mentor.name || '',
        mentorId: mentor._id || '',
        commencementDate: res.data.commencement_date || '',
        endDate: res.data.end_date || '',
        menteeEmails: assigned.map(m => (m.basic?.email_id || m.email || '')) // safe fallback
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

  const removeMentee = (email) => {
    setFormData(prev => ({ ...prev, menteeEmails: prev.menteeEmails.filter(e => e !== email) }));
  };

  // UPDATED: Auto-generate meeting dates - Evenly distributed across months
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
      current.setDate(current.getDate() + 7); // Next week same day
    }
    
    // 2. If we have preferred days, distribute them evenly across the timeline
    if (allPreferredDays.length > 0) {
      if (numberOfMeetings === 1) {
        // Just use the first date
        dates = [allPreferredDays[0]];
      } else if (numberOfMeetings >= allPreferredDays.length) {
        // If we need more meetings than available days, use all
        dates = allPreferredDays.slice(0, numberOfMeetings);
      } else {
        // Evenly distribute across the timeline
        // This ensures we pick dates from different months
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

  const handleCustomDateChange = (index, value) => {
    const updated = [...customDates];
    updated[index] = value;
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

    customDates.forEach((d, i) => { if (!d) newErrors[`customDate${i}`] = "Required"; });

    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const selectedMentees = assignedMentees.filter(m => formData.menteeEmails.includes(m.email));
      if (!selectedMentees.length) throw new Error("Selected mentees not found");

      const allDates = [
        ...generatedDates,
        ...customDates.map(d => new Date(d))
      ].map(d => new Date(d).toISOString());

      await axios.post("http://localhost:5000/api/meetings/schedule", {
        mentor_user_id: formData.mentorId,
        mentee_user_ids: selectedMentees.map(m => m._id),
        meeting_dates: allDates,
        meeting_time: formData.meetingTime,
        duration_minutes: parseInt(formData.duration),
        platform: formData.platform,
        meeting_link: formData.meetingLink,
        agenda: formData.agenda,
        preferred_day: formData.preferredDay,
        number_of_meetings: formData.numberOfMeetings
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          mentorName: '',
          mentorEmail: '',
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
          numberOfMeetings: 1
        });
        setAssignedMentees([]);
        setGeneratedDates([]);
        setCustomDates([]);
      }, 2500);

    } catch (error) {
      alert(error.response?.data?.message || error.message || "Meeting scheduling failed.");
    }
  };

  return (
    <div className="form-wrapper">
      {/* Floating Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      
      {/* ADDED: Dashboard Button */}
      <button className="dashboard-btn" onClick={() => (window.location.href = "/dashboard")}>
        ← Go to Dashboard
      </button>

      <div className="form-container">
        <h1 className="form-title">Mentorship Scheduling</h1>
        <p className="form-subtitle">Manage mentees for the mentor</p>

        <div className="form-card">
          {submitted && <div className="success-message">✓ Meeting Scheduled</div>}

          {/* Mentor Email & Name */}
          <div className="form-group">
            <label className="label">Mentor Email *</label>
            <input 
              type="email" 
              name="mentorEmail" 
              value={formData.mentorEmail} 
              onChange={handleChange} 
              className={`input ${errors.mentorEmail ? "input-error" : ""}`} 
            />
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

          {/* Commencement & End Date */}
          <div className="form-group">
            <label className="label">Commencement Date *</label>
            <input 
              type="date" 
              name="commencementDate" 
              value={formData.commencementDate} 
              onChange={handleChange} 
              className={`input ${errors.commencementDate ? "input-error" : ""}`} 
            />
            {errors.commencementDate && <span className="error-text">{errors.commencementDate}</span>}
          </div>

          <div className="form-group">
            <label className="label">End Date *</label>
            <input 
              type="date" 
              name="endDate" 
              value={formData.endDate} 
              onChange={handleChange} 
              className={`input ${errors.endDate ? "input-error" : ""}`} 
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

          {/* Custom Dates */}
          {customDates.length > 0 && customDates.map((_, i) => (
            <div key={i} className="form-group">
              <label className="label">Custom Date #{i+1} *</label>
              <input 
                type="date" 
                value={customDates[i]} 
                onChange={e => handleCustomDateChange(i, e.target.value)} 
                className={`input ${errors[`customDate${i}`] ? 'input-error' : ''}`} 
              />
              {errors[`customDate${i}`] && <span className="error-text">{errors[`customDate${i}`]}</span>}
            </div>
          ))}

          {/* Assigned Mentees */}
          <div className="form-group">
            <label className="label">Assigned Mentees *</label>
            {assignedMentees.length === 0 && <p className="no-mentees-text">No mentees assigned to this mentor.</p>}
            <div className="selected-mentees">
              {assignedMentees.filter(m => formData.menteeEmails.includes(m.email)).map(m => (
                <span key={m._id} className="selected-mentee">
                  {m.name} ({m.email})
                  <span className="cross-symbol" onClick={() => removeMentee(m.email)}>×</span>
                </span>
              ))}
            </div>
            {errors.menteeEmails && <span className="error-text">{errors.menteeEmails}</span>}
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
            />
          </div>

          <div className="form-group">
            <label className="label">Duration (minutes) *</label>
            <input 
              type="number" 
              name="duration" 
              value={formData.duration} 
              onChange={handleChange} 
              className={`input ${errors.duration ? 'input-error' : ''}`} 
            />
          </div>

          <div className="form-group">
            <label className="label">Platform *</label>
            <select 
              name="platform" 
              value={formData.platform} 
              onChange={handleChange} 
              className={`select ${errors.platform ? 'input-error' : ''}`}
            >
              <option value="">-- Select Platform --</option>
              <option value="zoom">Zoom</option>
              <option value="google-meet">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Meeting Link *</label>
            <input 
              type="url" 
              name="meetingLink" 
              value={formData.meetingLink} 
              onChange={handleChange} 
              className={`input ${errors.meetingLink ? 'input-error' : ''}`} 
            />
          </div>

          <div className="form-group">
            <label className="label">Agenda *</label>
            <textarea 
              name="agenda" 
              value={formData.agenda} 
              onChange={handleChange} 
              className={`textarea ${errors.agenda ? 'input-error' : ''}`} 
              rows="5"
            />
          </div>

          <button onClick={handleSubmit} className="submit-btn">
            Schedule Meeting
          </button>
        </div>
      </div>
    </div>
  );
}