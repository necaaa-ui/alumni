import React, { useState, useEffect } from "react";
import axios from "axios";
import "./MentorMentee.css";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function MenteeMentorAssignment() {
  const [formData, setFormData] = useState({
    mentorName: "",
    phaseId: null,
    phaseName: "",
    mentee1: "",
    mentee2: "",
    mentee3: ""
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [loadingPhase, setLoadingPhase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (submitted) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [submitted]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMentors(),
      fetchMentees(),
      fetchCurrentPhase()
    ]);
    setLoading(false);
  };

  const fetchMentors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/mentor-mentee/mentors`);
      setMentors(res.data || []);
      console.log("Mentors loaded:", res.data.length);
    } catch (err) {
      console.error("Error fetching mentors:", err);
      setMentors([]);
    }
  };

  const fetchMentees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/mentor-mentee/mentees`);
      
      let menteesData = res.data;
      
      if (typeof menteesData === 'string') {
        try {
          if (menteesData.startsWith('"') && menteesData.endsWith('"')) {
            menteesData = menteesData.substring(1, menteesData.length - 1);
          }
          menteesData = JSON.parse(menteesData);
        } catch (parseError) {
          console.error("Error parsing mentees data:", parseError);
          menteesData = [];
        }
      }
      
      setMentees(Array.isArray(menteesData) ? menteesData : []);
      console.log("Mentees loaded:", menteesData.length);
      
    } catch (err) {
      console.error("Error fetching mentees:", err);
      setMentees([]);
    }
  };

  const fetchCurrentPhase = async () => {
    setLoadingPhase(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/phase`);
      const phases = res.data.phases || [];
      const currentPhase = phases.find(
        (p) => new Date(p.startDate) <= new Date() && new Date() <= new Date(p.endDate)
      );
      if (currentPhase) {
        setFormData(prev => ({
          ...prev,
          phaseId: currentPhase.phaseId,
          phaseName: `${currentPhase.name} (${new Date(currentPhase.startDate).toLocaleDateString()} - ${new Date(currentPhase.endDate).toLocaleDateString()})`
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          phaseId: null,
          phaseName: "No active phase"
        }));
      }
    } catch (err) {
      console.error("Failed to fetch phases:", err);
    } finally {
      setLoadingPhase(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    
    // Auto-clear mentee selections if mentor changes
    if (name === "mentorName") {
      setFormData(prev => ({
        ...prev,
        mentee1: "",
        mentee2: "",
        mentee3: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.mentorName) newErrors.mentorName = "Mentor name is required";
    if (!formData.mentee1) newErrors.mentee1 = "At least 1 mentee is mandatory";
    if (!formData.phaseId) newErrors.phase = "No active phase available";
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      const menteeIds = [formData.mentee1, formData.mentee2, formData.mentee3].filter(Boolean);

      const response = await axios.post(`${API_BASE_URL}/api/mentor-mentee/assign`, {
        mentor_user_id: formData.mentorName,
        mentee_user_ids: menteeIds,
        phaseId: formData.phaseId
      });

      if (response.data.success) {
        setSubmitted(true);
        
        // Clear the form
        setFormData(prev => ({
          ...prev,
          mentorName: "",
          mentee1: "",
          mentee2: "",
          mentee3: ""
        }));
        
        // Refresh all data after assignment
        setTimeout(() => {
          fetchAllData();
        }, 500);
        
        setTimeout(() => {
          setSubmitted(false);
        }, 2500);
      } else {
        alert(response.data.message || "Error assigning mentor");
      }
      
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Error assigning mentor. Please try again.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackClick = () => {
    navigate("/14");
  };

  if (loading) {
    return (
      <div className="form-wrapper">
        <button className="dashboard-btn" onClick={handleBackClick}>
          ← Go to Dashboard
        </button>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-wrapper">
      <button className="dashboard-btn" onClick={handleBackClick}>
        ← Go to Dashboard
      </button>

      <div className="form-container">
        <div className="form-header">
          <h1 className="form-title">Mentee-Mentor Assignment</h1>
          <p className="form-subtitle">Assign mentees to mentors</p>
        </div>

        <div className="form-card">
          {submitted && (
            <div className="success-message-container">
              <div className="success-message">
                <div className="success-icon">✓</div>
                <div className="success-content">
                  <h3 className="success-title">Assignment Submitted Successfully!</h3>
                  <p className="success-text">
                    The mentees have been successfully assigned to the mentor.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="form-content">
            {/* Mentor dropdown */}
            <div className="form-group">
              <label className="label">Mentor Name <span className="required">*</span></label>
              <select
                name="mentorName"
                value={formData.mentorName}
                onChange={handleChange}
                className={`select ${errors.mentorName ? "input-error" : ""}`}
                disabled={submitting || submitted}
              >
                <option value="">-- Select Mentor --</option>
                {mentors.map((mentor) => (
                  <option key={mentor.user_id} value={mentor.user_id}>
                    {mentor.name} ({mentor.email}) - {mentor.areas_of_interest?.join(", ") || "No interests"}
                    
                  </option>
                ))}
              </select>
              {errors.mentorName && <span className="error-text">{errors.mentorName}</span>}
              {mentors.length === 0 && !loadingPhase && (
                <small className="info-text" style={{ color: "#10b981" }}>
                  ✓ No mentors found for this phase
                </small>
              )}
            </div>

            {/* Auto-filled Phase */}
            <div className="form-group">
              <label className="label">Phase <span className="required">*</span></label>
              <input
                type="text"
                value={formData.phaseName}
                readOnly
                className="input readonly-input"
              />
              {errors.phase && <span className="error-text">{errors.phase}</span>}
            </div>

            {/* Mentee dropdowns */}
            {[1, 2, 3].map((i) => (
              <div className="form-group" key={i}>
                <label className="label">
                  Mentee {i} {i === 1 ? <span className="required">*</span> : <span className="optional-text">(Optional)</span>}
                </label>
                <select
                  name={`mentee${i}`}
                  value={formData[`mentee${i}`]}
                  onChange={handleChange}
                  className={`select ${i === 1 && errors.mentee1 ? "input-error" : ""}`}
                  disabled={submitting || submitted}
                >
                  <option value="">-- Select Mentee --</option>
                  {mentees.map((mentee) => (
                    <option key={mentee.user_id} value={mentee.user_id}>
                      {mentee.name} ({mentee.email}) - {mentee.area_of_interest}
                    </option>
                  ))}
                </select>
                {i === 1 && errors.mentee1 && <span className="error-text">{errors.mentee1}</span>}
              </div>
            ))}

            {mentees.length === 0 && !loading && (
              <div className="info-message" style={{ padding: '10px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '15px' }}>
                <p style={{ color: '#92400e', margin: 0 }}>
                  ⚠️ No unassigned mentees found. All mentees may have been assigned already.
                </p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              className="submit-btn"
              disabled={submitting || loadingPhase || submitted || mentors.length === 0 || mentees.length === 0}
            >
              {submitting ? (
                <>
                  <span className="loading-spinner"></span>
                  Submitting...
                </>
              ) : submitted ? (
                "Submitted!"
              ) : (
                "Assign Mentor"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}