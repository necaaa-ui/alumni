
import React, { useState, useEffect } from "react";
import { GraduationCap, User, Mail, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Popup from './Popup';
import "./Common.css";

export default function WebinarStudentFeedbackForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    webinar: "",
    speaker: "",
    q1: "",
    q2: "",
    feedback: "",
    phaseId: "",
    isRobot: false,
  });

  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });

  // Auto-fill Name when Email is typed
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!formData.email || formData.email.length < 5) return;

      try {
        const res = await fetch(
          `http://localhost:5000/api/member-by-email?email=${formData.email}`
        );
        const data = await res.json();

        console.log("Fetched member:", data);

        if (data?.found) {
          setFormData((prev) => ({
            ...prev,
            name: data.name || "",
          }));
        } else {
          console.log("No member found for entered email");
        }
      } catch (err) {
        console.error("Error fetching member:", err);
      }
    };

    fetchMemberDetails();
  }, [formData.email]);

  // Auto-fill webinar, speaker, phaseId, and email from URL params
  useEffect(() => {
    const topic = searchParams.get('topic');
    const speaker = searchParams.get('speaker');
    const phaseId = searchParams.get('phaseId');
    const email = searchParams.get('email');

    if (topic && speaker) {
      setFormData((prev) => ({
        ...prev,
        webinar: topic,
        speaker: speaker,
        phaseId: phaseId || "",
        ...(email && { email: email }),
      }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.isRobot) {
      setPopup({ show: true, message: 'Please verify that you are not a robot', type: 'error' });
      return;
    }

    if (
      !formData.webinar ||
      !formData.speaker ||
      !formData.q1 ||
      !formData.q2 ||
      !formData.feedback
    ) {
      setPopup({ show: true, message: 'Please fill all required fields', type: 'error' });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/submit-student-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          webinar: formData.webinar,
          speaker: formData.speaker,
          q1: parseInt(formData.q1),
          q2: parseInt(formData.q2),
          feedback: formData.feedback,
          phaseId: parseInt(formData.phaseId),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPopup({ show: true, message: 'Feedback submitted successfully! 🎉', type: 'success' });

        // Reset form data after successful submission
        setFormData({
          name: "",
          email: "",
          webinar: "",
          speaker: "",
          q1: "",
          q2: "",
          feedback: "",
          phaseId: "",
          isRobot: false,
        });
      } else {
        setPopup({ show: true, message: data.error || 'Failed to submit feedback', type: 'error' });
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setPopup({ show: true, message: 'Network error. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="student-form-page">
      <div className="background-orbs">
        <div className="orb orb-purple"></div>
        <div className="orb orb-blue animation-delay-2000"></div>
        <div className="orb orb-pink animation-delay-4000"></div>
      </div>

      <div className="form-wrapper">
        <div className="form-container">
          <button className="back-btn" onClick={() => navigate("/")}>
            <ArrowLeft className="back-btn-icon" /> Back to Dashboard
          </button>

          <div className="form-header">
            <div className="icon-wrapper">
              <GraduationCap className="header-icon" />
            </div>
            <h1 className="form-title">Student Feedback Form</h1>
            <p className="webinar-subtitle">
              Provide your feedback for the attended webinar
            </p>
          </div>

          <div className="form-card">
            <form className="form-fields" onSubmit={handleSubmit} noValidate>
              
              {/* Email */}
              <div className="form-group">
                <label>
                  <Mail className="field-icon" /> Personal Email ID{" "}
                  <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="input-field"
                  required
                />
              </div>

              {/* Name */}
              <div className="form-group">
                <label>
                  <User className="field-icon" /> Name{" "}
                  <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Auto fetched from email"
                  className="input-field"
                  required
                  readOnly
                />
              </div>

              {/* Webinar */}
              <div className="form-group">
                <label>Webinar Attended <span className="required">*</span></label>
                <input
                  type="text"
                  name="webinar"
                  value={formData.webinar}
                  onChange={handleChange}
                  placeholder="Auto filled from webinar card"
                  className="input-field"
                  readOnly
                />
              </div>

              {/* Speaker */}
              <div className="form-group">
                <label>Speaker <span className="required">*</span></label>
                <input
                  type="text"
                  name="speaker"
                  value={formData.speaker}
                  onChange={handleChange}
                  placeholder="Auto filled from webinar card"
                  className="input-field"
                  readOnly
                />
              </div>

              {/* Ratings */}
              <div className="form-group">
                <label>
                  1. Rate the quality of the webinar <span className="required">*</span>
                </label>
                <div className="radio-group">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <label key={val}>
                      <input type="radio" name="q1" value={val} onChange={handleChange} /> {val}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>
                  2. Rate the speaker <span className="required">*</span>
                </label>
                <div className="radio-group">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <label key={val}>
                      <input type="radio" name="q2" value={val} onChange={handleChange} /> {val}
                    </label>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div className="form-group">
                <label>
                  Additional feedback <span className="required">*</span>
                </label>
                <textarea
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleChange}
                  placeholder="Write your feedback..."
                  className="textarea-field"
                ></textarea>
              </div>

              {/* Robot Check */}
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  name="isRobot"
                  checked={formData.isRobot}
                  onChange={handleChange}
                  className="checkbox-field"
                />
                <label className="checkbox-label">I'm not a robot</label>
              </div>

              <button type="submit" className="submit-btn">
                Submit Feedback
              </button>

            </form>
          </div>

          <p className="form-footer">Designed with 💜 for Alumni Network</p>
        </div>
      </div>

      {popup.show && (
        <Popup
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
}
