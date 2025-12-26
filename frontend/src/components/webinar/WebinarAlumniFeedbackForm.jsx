import { User, Mail, GraduationCap, MessageSquare, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Common.css";
import Popup from './Popup';

// Add API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const WebinarAlumniFeedbackForm = () => {
  const navigate = useNavigate();
  const { email: encodedEmail } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    webinar: "",
    rating1: "",
    rating2: "",
    feedback: "",
    isRobot: false,
  });

  const [errors, setErrors] = useState({});
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });
  const [webinars, setWebinars] = useState([]);
  const [webinarsLoading, setWebinarsLoading] = useState(true);
  const [webinarsError, setWebinarsError] = useState(null);

  // Decode email from URL params and set in formData
  useEffect(() => {
    if (encodedEmail) {
      try {
        const email = atob(encodedEmail);
        setFormData(prev => ({
          ...prev,
          email: email
        }));
      } catch (error) {
        console.error('Error decoding email:', error);
      }
    }
  }, [encodedEmail]);

  // Fetch webinars from topic approvals
  useEffect(() => {
    const fetchWebinars = async () => {
      setWebinarsLoading(true);
      setWebinarsError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/topic-approvals`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        // Extract topics from the response
        const topics = data.map(item => item.topic);
        setWebinars(topics);
      } catch (err) {
        console.error("Error fetching webinars:", err);
        setWebinarsError(err.message);
      } finally {
        setWebinarsLoading(false);
      }
    };

    fetchWebinars();
  }, []);

  // 🔥 Auto-fill Name + Email when email entered
  useEffect(() => {
    const fetchMember = async () => {
      if (!formData.email || formData.email.length < 5) return;

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/member-by-email?email=${formData.email}`
        );
        const data = await res.json();

        console.log("Fetched member:", data);

        if (data?.found) {
          setFormData((prev) => ({
            ...prev,
            name: data.name || "",
          }));
        } else {
          console.log("No matching alumni found");
        }
      } catch (err) {
        console.error("Error fetching member:", err);
      }
    };

    fetchMember();
  }, [formData.email]);

  // Form change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Submit handler
  const handleSubmit = async () => {
    const newErrors = {};

    if (!formData.isRobot) {
      setPopup({ show: true, message: 'Please verify that you are not a robot', type: 'error' });
      return;
    }

    if (!formData.webinar) newErrors.webinar = "Webinar selection is required";
    if (!formData.rating1) newErrors.rating1 = "Rating for arrangements is required";
    if (!formData.rating2) newErrors.rating2 = "Rating for student involvement is required";
    if (!formData.feedback) newErrors.feedback = "Feedback is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        const feedbackData = {
          name: formData.name,
          email: formData.email,
          webinarTopic: formData.webinar,
          arrangementsRating: formData.rating1,
          studentParticipationRating: formData.rating2,
          feedback: formData.feedback,
        };

        const response = await fetch(`${API_BASE_URL}/api/alumni-feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedbackData),
        });

        if (response.ok) {
          setPopup({ show: true, message: 'Feedback submitted successfully! 🎉', type: 'success' });

          // Reset form data after successful submission
          setFormData({
            name: "",
            email: "",
            webinar: "",
            rating1: "",
            rating2: "",
            feedback: "",
            isRobot: false,
          });
          setErrors({});
        } else {
          const errorData = await response.json();
          setPopup({ show: true, message: errorData.message || 'Failed to submit feedback. Please try again.', type: 'error' });
        }
      } catch (error) {
        console.error('Error submitting feedback:', error);
        setPopup({ show: true, message: 'Network error. Please check your connection and try again.', type: 'error' });
      }
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
        <div>

          <button className="back-btn" onClick={() => navigate("/")}>
            <ArrowLeft className="back-btn-icon" /> Back to Dashboard
          </button>

          <div className="form-header">
            <div className="icon-wrapper">
              <GraduationCap className="header-icon" />
            </div>
            <h1 className="form-title">Webinar Alumni Feedback Form</h1>
            <p className="webinar-subtitle">Provide your feedback for the attended webinar</p>
          </div>

          <div className="form-card">
            <div className="form-fields">

              {/* Email */}
              <div className="form-group">
                <label className="field-label">
                  <Mail className="field-icon" /> Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="input-field"
                />
              </div>

              {/* Name Auto-Filled */}
              <div className="form-group">
                <label className="field-label">
                  <User className="field-icon" /> Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Auto fetched from email"
                  className="input-field"
                  readOnly
                />
              </div>

              {/* Webinar */}
              <div className="form-group">
                <label className="field-label">Select Webinar Attended <span className="required">*</span></label>
                <select
                  name="webinar"
                  value={formData.webinar}
                  onChange={handleChange}
                  className="select-field"
                  disabled={webinarsLoading}
                >
                  <option value="" disabled>
                    {webinarsLoading ? 'Loading webinars...' : webinarsError ? 'Error loading webinars' : '-- Choose Webinar --'}
                  </option>
                  {webinars.map((topic, index) => (
                    <option key={index} value={topic}>{topic}</option>
                  ))}
                </select>
                {webinarsError && <div className="error-text">Failed to load webinars: {webinarsError}</div>}
                {errors.webinar && <div className="error-text">{errors.webinar}</div>}
              </div>

              {/* Rating 1 */}
              <div className="form-group">
                <label className="field-label">
                  1. How would you rate the arrangements? <span className="required">*</span>
                </label>
                <select
                  name="rating1"
                  value={formData.rating1}
                  onChange={handleChange}
                  className="select-field"
                >
                  <option value="" disabled>-- Select --</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Poor">Poor</option>
                </select>
                {errors.rating1 && <div className="error-text">{errors.rating1}</div>}
              </div>

              {/* Rating 2 */}
              <div className="form-group">
                <label className="field-label">
                  2. Rate student participation <span className="required">*</span>
                </label>
                <select
                  name="rating2"
                  value={formData.rating2}
                  onChange={handleChange}
                  className="select-field"
                >
                  <option value="" disabled>-- Select --</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Poor">Poor</option>
                </select>
                {errors.rating2 && <div className="error-text">{errors.rating2}</div>}
              </div>

              {/* Feedback */}
              <div className="form-group">
                <label className="field-label">
                  <MessageSquare className="field-icon" /> Share your experience <span className="required">*</span>
                </label>
                <textarea
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleChange}
                  placeholder="Write your feedback here..."
                  rows="4"
                  className="textarea-field"
                ></textarea>
                {errors.feedback && <div className="error-text">{errors.feedback}</div>}
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

              <button onClick={handleSubmit} className="submit-btn">Submit Feedback</button>

            </div>
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
};

export default WebinarAlumniFeedbackForm;