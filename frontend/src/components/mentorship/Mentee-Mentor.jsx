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
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

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
    try {
      await Promise.all([
        fetchMentors(),
        fetchMentees(),
        fetchCurrentPhase()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/mentor-mentee/mentors`);
      const mentorData = res.data || [];
      
      // Sort mentors alphabetically by name
      const sortedMentors = [...mentorData].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setMentors(sortedMentors);
      console.log("Mentors loaded:", sortedMentors.length);
      console.log("Mentor data:", sortedMentors);
      
      // Update selected mentor info if currently selected
      if (formData.mentorName) {
        const updatedMentor = sortedMentors.find(m => m.user_id === formData.mentorName);
        if (updatedMentor) {
          console.log("Selected mentor updated:", updatedMentor);
        }
      }
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
      
      // Sort mentees alphabetically by name
      const sortedMentees = Array.isArray(menteesData) 
        ? [...menteesData].sort((a, b) => a.name.localeCompare(b.name))
        : [];
      
      setMentees(sortedMentees);
      console.log("Mentees loaded:", sortedMentees.length);
      
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
    
    // Update selected mentor slots when mentor changes
    if (name === "mentorName" && value) {
      const selectedMentor = mentors.find(m => m.user_id === value);
      if (selectedMentor) {
        setAssignmentMessage("");
        setShowSuccess(false);
      }
    } else if (name === "mentorName" && !value) {
      setAssignmentMessage("");
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.mentorName) newErrors.mentorName = "Mentor name is required";
    if (!formData.mentee1) newErrors.mentee1 = "At least 1 mentee is mandatory";
    if (!formData.phaseId) newErrors.phase = "No active phase available";
    
    // Check if selected mentor has available slots
    if (formData.mentorName) {
      const selectedMentor = mentors.find(m => m.user_id === formData.mentorName);
      if (selectedMentor && selectedMentor.isFullyAssigned) {
        newErrors.mentorName = "This mentor already has 3 mentees assigned";
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setAssignmentMessage("");
    setShowSuccess(false);

    try {
      const menteeIds = [formData.mentee1, formData.mentee2, formData.mentee3].filter(Boolean);

      console.log("Submitting assignment:", {
        mentor_user_id: formData.mentorName,
        mentee_user_ids: menteeIds,
        phaseId: formData.phaseId
      });

      const response = await axios.post(`${API_BASE_URL}/api/mentor-mentee/assign`, {
        mentor_user_id: formData.mentorName,
        mentee_user_ids: menteeIds,
        phaseId: formData.phaseId
      });

      console.log("Assignment response:", response.data);

      if (response.data.success) {
        const message = response.data.message || "Assignment successful";
        const totalMentees = response.data.totalMentees || 0;
        const availableSlots = response.data.availableSlots || 0;
        const isFullyAssigned = response.data.isFullyAssigned || false;
        
        let successMessage = "";
        if (isFullyAssigned) {
          successMessage = `✅ Mentor is now fully assigned with 3 mentees.`;
        } else if (availableSlots > 0) {
          successMessage = `✅ ${totalMentees}/3 mentees assigned. ${availableSlots} slot(s) remaining for this mentor.`;
        } else {
          successMessage = `✅ ${message}`;
        }
        
        // Add status update message
        if (response.data.mentorStatusUpdated) {
          successMessage += ` Mentor status updated to "assigned".`;
        }
        if (response.data.menteesStatusUpdated && response.data.menteesStatusUpdated.length > 0) {
          successMessage += ` ${response.data.menteesStatusUpdated.length} mentee(s) status updated to "assigned".`;
        }
        
        setAssignmentMessage(successMessage);
        setShowSuccess(true);
        setSubmitted(true);
        
        // Clear mentee fields but KEEP THE MENTOR SELECTED
        setFormData(prev => ({
          ...prev,
          mentee1: "",
          mentee2: "",
          mentee3: ""
        }));
        
        // IMPORTANT: Refresh mentors data immediately to get updated counts
        await fetchMentors();
        await fetchMentees();
        
        // After refresh, check if the mentor is still available
        if (formData.mentorName) {
          const updatedMentor = mentors.find(m => m.user_id === formData.mentorName);
          if (updatedMentor) {
            console.log("Updated mentor count:", updatedMentor.assignedMentees);
          }
        }
        
        setTimeout(() => {
          setSubmitted(false);
          setShowSuccess(false);
        }, 4000);
      } else {
        alert(response.data.message || "Error assigning mentor");
        setSubmitted(false);
      }
      
    } catch (err) {
      console.error("Assignment error:", err);
      const errorMessage = err.response?.data?.message || "Error assigning mentor. Please try again.";
      
      // Show more detailed error message if available
      if (err.response?.data?.availableSlots !== undefined) {
        alert(`${errorMessage}. Available slots: ${err.response.data.availableSlots}`);
      } else {
        alert(errorMessage);
      }
      setSubmitted(false);
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

  // Get selected mentor details from the updated mentors list
  const selectedMentor = formData.mentorName ? mentors.find(m => m.user_id === formData.mentorName) : null;

  return (
    <div className="form-wrapper">
      <button className="dashboard-btn" onClick={handleBackClick}>
        ← Go to Dashboard
      </button>

      <div className="form-container">
        <div className="form-header">
          <h1 className="form-title">Mentee-Mentor Assignment</h1>
          <p className="form-subtitle">Assign up to 3 mentees per mentor</p>
        </div>

        <div className="form-card">
          {showSuccess && assignmentMessage && (
            <div className="success-message-container">
              <div className="success-message">
                <div className="success-icon">✓</div>
                <div className="success-content">
                  <h3 className="success-title">Assignment {selectedMentor?.assignedMentees > 1 ? 'Updated' : 'Submitted'} Successfully!</h3>
                  <p className="success-text">
                   
                    <br />
                    <span style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
                    
                    </span>
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
                    {mentor.isFullyAssigned ? " (FULL)" : mentor.assignedMentees > 0 ? ` (${mentor.assignedMentees}/3)` : ""}
                  </option>
                ))}
              </select>
              {errors.mentorName && <span className="error-text">{errors.mentorName}</span>}
              
              {/* Show mentor status with assigned status */}
              {selectedMentor && (
                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                  <span style={{ 
                    color: selectedMentor.isFullyAssigned ? '#dc2626' : '#16a34a',
                    fontWeight: '500'
                  }}>
                    
                  </span>
                  {selectedMentor.assignedMentees > 0 && (
                    <span style={{ 
                      marginLeft: '12px',
                      fontSize: '12px',
                      color: '#6b7280',
                      backgroundColor: '#f3f4f6',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      Status: {selectedMentor.status || 'assigned'}
                    </span>
                  )}
                </div>
              )}
              
              {mentors.length === 0 && !loadingPhase && (
                <small className="info-text" style={{ color: "#10b981" }}>
                  ✓ All mentors have been fully assigned for this phase
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
                  disabled={submitting || submitted || selectedMentor?.isFullyAssigned}
                >
                  <option value="">-- Select Mentee --</option>
                  {mentees.map((mentee) => (
                    <option key={mentee.user_id} value={mentee.user_id}>
                      {mentee.name} ({mentee.email}) - {mentee.area_of_interest}
                      {mentee.status === 'assigned' ? ' (Assigned)' : ''}
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
              disabled={submitting || loadingPhase || submitted || mentors.length === 0 || mentees.length === 0 || selectedMentor?.isFullyAssigned}
            >
              {submitting ? (
                <>
                  <span className="loading-spinner"></span>
                  Submitting...
                </>
              ) : submitted ? (
                "Submitted!"
              ) : (
                selectedMentor?.assignedMentees > 0 ? "Add More Mentees" : "Assign Mentor"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}