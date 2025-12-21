import React, { useState, useEffect, useRef } from "react";
import "./MenteeRegistration.css";

export default function MenteeRegistrationForm() {
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    branch: "",
    batch: "",
    contactNumber: "",
    areaOfInterest: "",
    description: "",
    phaseId: null,
    phaseName: "", // auto-filled Phase Name
  });

  const [phases, setPhases] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailFetched, setEmailFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailTimeoutRef = useRef(null);

  useEffect(() => {
    fetchPhases();
    return () => {
      if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    };
  }, []);

  // Fetch all phases and determine current active phase
  const fetchPhases = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/phase");
      const data = await res.json();
      if (res.ok && data.phases) {
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
        }
      }
    } catch (err) {
      console.error("Failed to fetch phases:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "email") {
      setEmailFetched(false);
      setErrors((prev) => ({ ...prev, email: "" }));

      if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);

      const trimmed = value.trim();
      if (!trimmed) {
        setFormData((prev) => ({
          ...prev,
          fullName: "",
          branch: "",
          batch: "",
          contactNumber: "",
        }));
        return;
      }

      emailTimeoutRef.current = setTimeout(() => {
        if (/\S+@\S+\.\S+/.test(trimmed)) {
          fetchUserByEmail(trimmed.toLowerCase());
        }
      }, 600);
    }
  };

  const fetchUserByEmail = async (email) => {
    try {
      setLoadingEmail(true);
      const res = await fetch(
        `http://localhost:5000/api/users/get-by-email?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();

      if (res.ok && data.user) {
        setFormData((prev) => ({
          ...prev,
          fullName: data.user.fullName || "Name not found",
          branch: data.user.branch || "Not specified",
          batch: data.user.batch || "Not specified",
          contactNumber: data.user.mobile || "Not provided",
        }));
        setEmailFetched(true);
      } else {
        setErrors((prev) => ({
          ...prev,
          email: data.message || "Email not found in members database",
        }));
        setEmailFetched(false);
        setFormData((prev) => ({
          ...prev,
          fullName: "",
          branch: "",
          batch: "",
          contactNumber: "",
        }));
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        email: "Connection failed. Is backend running?",
      }));
    } finally {
      setLoadingEmail(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.fullName) newErrors.fullName = "Full name not found";
    if (!formData.branch || formData.branch === "Not specified") newErrors.branch = "Branch not found";
    if (!formData.batch || formData.batch === "Not specified") newErrors.batch = "Batch not found";
    if (!formData.contactNumber || formData.contactNumber === "Not provided")
      newErrors.contactNumber = "Contact number not found";
    if (!formData.areaOfInterest) newErrors.areaOfInterest = "Please select an area";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!formData.phaseId) {
      alert("No active phase found. Cannot submit.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("http://localhost:5000/api/mentee/requests/mentee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          area_of_interest: formData.areaOfInterest,
          description: formData.description.trim(),
          phaseId: formData.phaseId,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setFormData({
            email: "",
            fullName: "",
            branch: "",
            batch: "",
            contactNumber: "",
            areaOfInterest: "",
            description: "",
            phaseId: null,
            phaseName: "",
          });
          setErrors({});
          setEmailFetched(false);
          setSubmitted(false);
        }, 2500);
      } else {
        alert(result.message || "Failed to submit. Try again.");
      }
    } catch (err) {
      alert("No internet or server down. Check backend.");
    } finally {
      setSubmitting(false);
    }
  };

return (
  <div className="form-wrapper">
    <button className="dashboard-btn" onClick={() => (window.location.href = "/dashboard")}>
      ← Go to Dashboard
    </button>

    <div className="form-container">
      <div className="form-header">
        <h1 className="form-title">Mentee Registration</h1>
        <p className="form-subtitle">Only registered alumni can apply</p>
      </div>

      <div className="form-card">
        {submitted && <div className="success-message">Registration submitted successfully!</div>}

        <div className="form-content">
          {/* Email */}
          <div className="form-group">
            <label className="label">College Email <span className="required">*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. chocka.nec@gmail.com"
              className={`input ${errors.email ? "input-error" : ""}`}
              disabled={submitting}
            />
            {loadingEmail && <small className="loading-text">Searching in members database...</small>}
            {errors.email && <span className="error-text">{errors.email}</span>}
            {emailFetched && !errors.email && (
              <small style={{ color: "#8b5cf6", fontWeight: "600" }}>✓ Found in database!</small>
            )}
          </div>

          {/* Auto-filled Phase Name */}
          <div className="form-group">
            <label className="label">Current Phase</label>
            <input
              type="text"
              value={formData.phaseName}
              disabled
              className="input disabled-input"
            />
          </div>

          {/* Auto-filled user details */}
          <div className="form-row">
            <div className="form-group">
              <label className="label">Full Name</label>
              <input type="text" value={formData.fullName} disabled className="input disabled-input" />
            </div>
            <div className="form-group">
              <label className="label">Branch</label>
              <input type="text" value={formData.branch} disabled className="input disabled-input" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Batch</label>
              <input type="text" value={formData.batch} disabled className="input disabled-input" />
            </div>
            <div className="form-group">
              <label className="label">Contact</label>
              <input type="text" value={formData.contactNumber} disabled className="input disabled-input" />
            </div>
          </div>

          {/* Area of Interest */}
          <div className="form-group">
            <label className="label">Area of Interest <span className="required">*</span></label>
            <select
              name="areaOfInterest"
              value={formData.areaOfInterest}
              onChange={handleChange}
              className={`select ${errors.areaOfInterest ? "input-error" : ""}`}
              disabled={submitting}
            >
              <option value="">-- Select one --</option>
              <option value="web-development">Web Development</option>
              <option value="data-science">Data Science</option>
              <option value="machine-learning">Machine Learning</option>
              <option value="cloud-computing">Cloud Computing</option>
              <option value="cybersecurity">Cybersecurity</option>
              <option value="app-development">App Development</option>
              <option value="devops">DevOps</option>
            </select>
            {errors.areaOfInterest && <span className="error-text">{errors.areaOfInterest}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="label">Your Goals & Background <span className="required">*</span></label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What do you want to learn? What's your current level? Any projects?"
              rows="5"
              className={`textarea ${errors.description ? "input-error" : ""}`}
              disabled={submitting}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={submitting || loadingEmail || submitted}
          >
            {submitting ? (
              <>
                <span className="loading-spinner"></span>
                Submitting...
              </>
            ) : submitted ? (
              "Submitted!"
            ) : (
              "Submit Request"
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
// ==================================================