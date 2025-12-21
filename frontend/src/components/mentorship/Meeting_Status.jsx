import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './MeetingStatus.css';

export default function MeetingStatusUpdateForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mentorEmailParam = searchParams.get('mentorEmail');
  const scheduledDateParam = searchParams.get('scheduledDate');
  const menteeEmailParam = searchParams.get('menteeEmail');

  const [formData, setFormData] = useState({
    mentorEmail: mentorEmailParam || '',
    menteeEmail: menteeEmailParam || '',
    scheduledDate: scheduledDateParam || '',
    meetingStatus: '',
    meetingMinutes: '',
    postponedReason: ''
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [menteeId, setMenteeId] = useState('');

  // ================================
  // FETCH MENTEE _id FROM EMAIL
  // ================================
  useEffect(() => {
    if (!mentorEmailParam || !scheduledDateParam || !menteeEmailParam) {
      alert("Missing required information. Redirecting to dashboard.");
      navigate("/scheduled_dashboard");
      return;
    }

    const fetchMenteeId = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/meeting-status/mentee/by-email?email=${encodeURIComponent(menteeEmailParam)}`
        );

        if (!res.data || !res.data._id) {
          throw new Error("Mentee not found");
        }

        setMenteeId(res.data._id);
      } catch (err) {
        console.error("❌ Error fetching mentee ID:", err);
        alert("Mentee not found. Redirecting to dashboard.");
        navigate("/scheduled_dashboard");
      }
    };

    fetchMenteeId();
  }, [mentorEmailParam, scheduledDateParam, menteeEmailParam, navigate]);

  // ================================
  // HANDLE INPUT CHANGE
  // ================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // ================================
  // VALIDATION
  // ================================
  const validate = () => {
    const newErrors = {};
    if (!formData.meetingStatus) newErrors.meetingStatus = "Select meeting status";

    if (formData.meetingStatus === "Completed" && !formData.meetingMinutes)
      newErrors.meetingMinutes = "Meeting minutes required";

    if (formData.meetingStatus === "Postponed" && !formData.postponedReason)
      newErrors.postponedReason = "Reason required";

    return newErrors;
  };

  // ================================
  // SUBMIT UPDATED STATUS
  // ================================
  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!menteeId) {
      alert("Mentee ID missing. Cannot submit.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/meeting-status/update", {
        mentorEmail: formData.mentorEmail,
        menteeIds: [menteeId],
        meetingId: searchParams.get('meetingId'), // pass meetingId from URL
        status: formData.meetingStatus,
        meetingMinutes: formData.meetingMinutes || "",
        postponedReason: formData.postponedReason || ""
      });

      setSubmitted(true);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      console.error("❌ Update failed:", err);
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="form-wrapper">
      <button onClick={() => navigate('/dashboard')} className="back-btn-corner">
        ← Back
      </button>

      <div className="form-container">
        <h1>Update Meeting Status</h1>
        {submitted && <div className="success-message">✓ Updated Successfully</div>}

        <div className="form-group">
          <label>Mentor Email *</label>
          <input type="email" value={formData.mentorEmail} readOnly className="input" />
        </div>

        <div className="form-group">
          <label>Mentee Email *</label>
          <input type="email" value={formData.menteeEmail} readOnly className="input" />
        </div>

        <div className="form-group">
          <label>Scheduled Date *</label>
          <input
            type="text"
            value={new Date(formData.scheduledDate).toLocaleDateString()}
            readOnly
            className="input"
          />
        </div>

        <div className="form-group">
          <label>Meeting Status *</label>
          <select
            name="meetingStatus"
            value={formData.meetingStatus}
            onChange={handleChange}
            className="select"
          >
            <option value="">-- Select --</option>
            <option value="Completed">Completed</option>
            <option value="Postponed">Postponed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="In Progress">In Progress</option>
          </select>
          {errors.meetingStatus && <p className="error-text">{errors.meetingStatus}</p>}
        </div>

        {formData.meetingStatus === "Completed" && (
          <div className="form-group">
            <label>Meeting Minutes *</label>
            <textarea
              name="meetingMinutes"
              value={formData.meetingMinutes}
              onChange={handleChange}
              className="textarea"
            />
            {errors.meetingMinutes && <p className="error-text">{errors.meetingMinutes}</p>}
          </div>
        )}

        {formData.meetingStatus === "Postponed" && (
          <div className="form-group">
            <label>Postponed Reason *</label>
            <textarea
              name="postponedReason"
              value={formData.postponedReason}
              onChange={handleChange}
              className="textarea"
            />
            {errors.postponedReason && <p className="error-text">{errors.postponedReason}</p>}
          </div>
        )}

        <button onClick={handleSubmit} className="submit-btn" disabled={!formData.meetingStatus}>
          Update Status
        </button>
      </div>
    </div>
  );
}
