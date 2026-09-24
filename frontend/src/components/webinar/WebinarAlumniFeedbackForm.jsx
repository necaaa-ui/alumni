import { User, Mail, GraduationCap, MessageSquare } from "lucide-react";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Common.css";
import Popup from './Popup';

// Use the deployed API path in production. Pointing to localhost here makes the
// alumni's browser request its own machine instead of the application server.
const isLocalDev = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = isLocalDev
  ? '/alumnimain'
  : (import.meta.env.VITE_API_BASE_URL || '/alumnimain').replace(/\/$/, '');

const WebinarAlumniFeedbackForm = () => {
  const { email: encodedEmail } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    webinar: "",
    rating1: "",
    rating2: "",
    feedback: "",
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

  // Fetch only attended webinars for this alumni speaker
  useEffect(() => {
    if (!formData.email) {
      setWebinars([]);
      return;
    }

    const fetchWebinars = async () => {
      setWebinarsLoading(true);
      setWebinarsError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/webinars`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        const normalizedEmail = formData.email.trim().toLowerCase();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const speakerAttendedWebinars = (Array.isArray(data) ? data : []).filter((item) => {
          const speakerEmail = String(item?.speaker?.email || "").trim().toLowerCase();
          const webinarDate = item?.webinarDate ? new Date(item.webinarDate) : null;
          // Keep this in sync with the submit API, which permits feedback on
          // the webinar date and for all earlier webinars.
          const isPastWebinar = webinarDate instanceof Date
            && !isNaN(webinarDate)
            && new Date(webinarDate.getFullYear(), webinarDate.getMonth(), webinarDate.getDate()) <= todayStart;
          return speakerEmail === normalizedEmail && isPastWebinar;
        });

        const uniqueTopics = [...new Set(speakerAttendedWebinars.map((item) => item.topic).filter(Boolean))];
        setWebinars(uniqueTopics);
      } catch (err) {
        console.error("Error fetching webinars:", err);
        setWebinarsError(err.message);
      } finally {
        setWebinarsLoading(false);
      }
    };

    fetchWebinars();
  }, [formData.email]);

  // 🔥 Auto-fill Name when email entered
  useEffect(() => {
    const fetchMember = async () => {
      if (!formData.email || formData.email.length < 5) return;

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/member-by-email?email=${encodeURIComponent(formData.email)}`
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
    if (name === 'feedback') {
      // Apply validation: Allow English letters, numbers, spaces, punctuation. Block emojis, other languages, line breaks, multi-line paste.
      const maxLength = 150;
      const filteredValue = value.replace(/[^\x20-\x7E]/g, '').slice(0, maxLength);
      setFormData(prev => ({
        ...prev,
        [name]: filteredValue
      }));
      // Clear error if now valid
      if (filteredValue.length <= maxLength) {
        setErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
      // Clear error for other fields if they have value
      if (value && errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    const newErrors = {};

    if (!formData.webinar) newErrors.webinar = "Webinar selection is required";
    if (!formData.rating1) newErrors.rating1 = "Rating for arrangements is required";
    if (!formData.rating2) newErrors.rating2 = "Rating for student involvement is required";
    if (!formData.feedback) newErrors.feedback = "Feedback is required";
    else if (formData.feedback.length > 150) newErrors.feedback = "Feedback must not exceed 150 characters";

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
          });
          setErrors({});
        } else {
          const errorData = await response.json();
          const backendMessage = errorData.message || 'Failed to submit feedback. Please try again.';
          const mappedMessage = backendMessage.includes('You must be registered for this webinar to submit feedback')
            ? 'Only the assigned speaker can submit feedback, after the webinar date.'
            : backendMessage;
          setPopup({ show: true, message: mappedMessage, type: 'error' });
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
          <div className="form-header">
            <div className="icon-wrapper">
              <GraduationCap className="header-icon" />
            </div>
            <h1 className="text-2xl font-bold text-[#7d48b9] mb-4 tracking-wider">Webinar Alumni Feedback Form</h1>
            <div className="webinar-subtitle">Provide your feedback for the attended webinar</div>
          </div>

          <div className="form-card">
            <div className="form-fields">

              {/* NAME */}
              <div className="form-group">
                <label className="field-label">
                  <User className="field-icon" /> Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Auto fetched from email..."
                  className="input-field"
                  readOnly
                />
                {errors.name && <div className="error-text">{errors.name}</div>}
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label className="field-label">
                  <Mail className="field-icon" /> Personal Email ID <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="input-field"
                  readOnly
                />
                {errors.email && <div className="error-text">{errors.email}</div>}
              </div>

              {/* WEBINAR */}
              <div className="form-group">
                <label className="field-label">
                  Select Webinar Attended <span className="required">*</span>
                </label>
                <select
                  name="webinar"
                  value={formData.webinar}
                  onChange={handleChange}
                  className="select-field"
                  disabled={webinarsLoading || webinars.length === 0}
                >
                  <option value="" disabled>
                    {webinarsLoading
                      ? 'Loading webinars...'
                      : webinarsError
                      ? 'Error loading webinars'
                      : webinars.length === 0
                      ? 'No attended webinars found'
                      : '-- Choose Webinar --'}
                  </option>
                  {webinars.map((topic, index) => (
                    <option key={index} value={topic}>{topic}</option>
                  ))}
                </select>
                {webinarsError && <div className="error-text">Failed to load webinars: {webinarsError}</div>}
                {errors.webinar && <div className="error-text">{errors.webinar}</div>}
              </div>

              {/* RATING 1 */}
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

              {/* RATING 2 */}
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

              {/* FEEDBACK */}
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

              {/* SUBMIT */}
              <button onClick={handleSubmit} className="submit-btn">
                Submit
              </button>

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
