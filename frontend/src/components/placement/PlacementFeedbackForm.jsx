// Frontend - PlacementFeedbackForm.js
import React, { useState } from "react";
import axios from "axios";
import "./PlacementFeedbackForm.css";

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const PlacementFeedbackForm = () => {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [autoData, setAutoData] = useState({
    userId: "",        // MongoDB _id as string
    name: "",
    batch: "",
    mobile: "",
  });
  const [loading, setLoading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Function to validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Fetch user details from backend
  const fetchUserDetails = async (emailValue) => {
    // Validate email format
    if (!isValidEmail(emailValue)) {
      setAutoData({ userId: "", name: "", batch: "", mobile: "" });
      return;
    }

    try {
      setLoading(true);
      
      // Encode email to handle special characters
      const encodedEmail = encodeURIComponent(emailValue);
      
      const res = await axios.get(
        `${API_BASE_URL}/api/members/email/${encodedEmail}`
      );

      console.log("Backend response:", res.data);

      if (res.data.success && res.data.member) {
        // Get MongoDB _id as string
        const userId = res.data.member._id;
        
        if (!userId) {
          alert("User ID not found!");
          setAutoData({ userId: "", name: "", batch: "", mobile: "" });
          return;
        }

        setAutoData({
          userId: userId, // MongoDB _id string
          name: res.data.member.name || "",
          batch: res.data.member.batch || "",
          mobile: res.data.member.mobile || "",
        });
      } else {
        setAutoData({ userId: "", name: "", batch: "", mobile: "" });
        alert("User not found with this email!");
      }
    } catch (err) {
      console.log("Error fetching user:", err);
      setAutoData({ userId: "", name: "", batch: "", mobile: "" });
      
      if (err.response && err.response.status === 404) {
        alert("User not found with this email!");
      } else {
        alert("Error fetching user details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle email input with debounce
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    if (typingTimeout) clearTimeout(typingTimeout);

    // Only fetch if email looks valid (has @ and .)
    if (value.includes("@") && value.includes(".") && value.length > 5) {
      setTypingTimeout(
        setTimeout(() => {
          fetchUserDetails(value);
        }, 500) // Increased delay to 500ms
      );
    } else {
      // Clear data if email is not valid
      setAutoData({ userId: "", name: "", batch: "", mobile: "" });
    }
  };

  // Submit feedback
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!feedback.trim()) {
      alert("Please enter feedback!");
      return;
    }

    if (!autoData.userId) {
      alert("Please enter a valid email to fetch user details!");
      return;
    }

    try {
      // Submit feedback with MongoDB _id as string
      const response = await axios.post(
        `${API_BASE_URL}/api/feedback/submit-feedback`,
        {
          user_id: autoData.userId, // MongoDB _id as string
          feedback_text: feedback
        }
      );

      console.log("Submission response:", response.data);

      if (response.data.success) {
        alert(`Feedback submitted successfully! Feedback ID: ${response.data.feedback.feedback_id}`);
        
        // Reset form
        setEmail("");
        setFeedback("");
        setAutoData({ userId: "", name: "", batch: "", mobile: "" });
      } else {
        alert("Failed to submit feedback: " + response.data.message);
      }
    } catch (err) {
      console.error("Full error:", err);
      
      if (err.response) {
        console.error("Server response error:", err.response.data);
        alert(`Error ${err.response.status}: ${err.response.data.message || "Server error"}`);
      } else if (err.request) {
        console.error("No response received:", err.request);
        alert("No response from server. Check your network.");
      } else {
        console.error("Request setup error:", err.message);
        alert("Error setting up request: " + err.message);
      }
    }
  };

  return (
    <div className="feedback-container">
      <div className="feedback-wrapper">
        <div className="feedback-header">
          <div className="feedback-icon">⭐</div>
          <h2 className="feedback-title">Coordinator Feedback</h2>
          <p className="feedback-subtitle">
            Help us improve by sharing feedback on this placement experience
          </p>
        </div>

        {/* Email input */}
        <div className="feedback-field">
          <label className="feedback-label">
            <span className="feedback-label-icon">📧</span>
            Enter Email ID <span className="required-star">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter complete email (e.g., user@domain.com)"
            className="feedback-input"
            required
          />
          {loading && <p style={{ color: "blue", fontSize: "14px", marginTop: "5px" }}>Fetching user details...</p>}
          {email && !isValidEmail(email) && (
            <p style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>
              Please enter a valid email address
            </p>
          )}
        </div>

        {/* Auto-filled fields */}
        <div className="feedback-grid">
          <div className="feedback-field">
            <label className="feedback-label">Applicant ID </label>
            <input
              type="text"
              value={autoData.userId}
              disabled
              className="feedback-input-disabled"
              title="This is MongoDB _id stored in database"
            />
          </div>
          <div className="feedback-field">
            <label className="feedback-label">Name</label>
            <input
              type="text"
              value={autoData.name}
              disabled
              className="feedback-input-disabled"
            />
          </div>
          <div className="feedback-field">
            <label className="feedback-label">Batch</label>
            <input
              type="text"
              value={autoData.batch}
              disabled
              className="feedback-input-disabled"
            />
          </div>
          <div className="feedback-field">
            <label className="feedback-label">Mobile</label>
            <input
              type="text"
              value={autoData.mobile}
              disabled
              className="feedback-input-disabled"
            />
          </div>
        </div>

        {/* Feedback section */}
        <div className="feedback-section">
          <label className="feedback-label">
            <span className="feedback-label-icon">💬</span>
            Feedback <span className="required-star">*</span>
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write your detailed feedback here..."
            rows="4"
            className="feedback-textarea"
            required
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          className="feedback-submit-button"
          disabled={!autoData.userId || !feedback.trim()}
        >
          Submit Feedback
        </button>
      </div>
    </div>
  );
};

export default PlacementFeedbackForm;