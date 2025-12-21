import React, { useState, useEffect, useRef } from "react";
import "./MentorRegistration.css";

export default function MentorRegistrationForm() {
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    designation: "",
    currentCompany: "",
    branch: "",
    passedOutYear: "",
    contactNumber: "",
    areaOfInterest: [],
    customInterest: "",
    supportDescription: "",
    phaseId: "",
    phaseName: "", // auto-filled Phase Name
  });

  const [phases, setPhases] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailFetched, setEmailFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Fetch all phases and determine current active phase
  const fetchPhases = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/phase");
      const data = await res.json();
      if (res.ok && data.phases) {
        setPhases(data.phases);
        const now = new Date();
        const currentPhase = data.phases.find(
          (p) => new Date(p.startDate) <= now && now <= new Date(p.endDate)
        );
        if (currentPhase) {
          setFormData((prev) => ({
            ...prev,
            phaseId: currentPhase.phaseId,
            phaseName: `${currentPhase.name} (${new Date(
              currentPhase.startDate
            ).toLocaleDateString()} - ${new Date(currentPhase.endDate).toLocaleDateString()})`,
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

    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));

    if (name === "email") {
      setEmailFetched(false);
      setErrors((prev) => ({ ...prev, email: "" }));

      if (debounceRef.current) clearTimeout(debounceRef.current);

      const trimmed = value.trim();
      if (!trimmed) return;

      debounceRef.current = setTimeout(() => {
        if (/\S+@\S+\.\S+/.test(trimmed)) {
          fetchUserByEmail(trimmed.toLowerCase());
        }
      }, 700);
    }
  };

  const fetchUserByEmail = async (email) => {
    try {
      setLoadingEmail(true);
      const res = await fetch(
        `http://localhost:5000/api/mentor/fetch-user?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const userData = data.user;

        setFormData((prev) => ({
          ...prev,
          fullName: userData.fullName || "",
          branch: userData.branch || "",
          passedOutYear: userData.batch || "",
          contactNumber: userData.mobile || "Not provided",
          designation: userData.designation || "Not provided",
          currentCompany: userData.currentCompany || "Not provided",
        }));
        setEmailFetched(true);

        // Fetch current phase after email fetch
        fetchPhases();
      } else {
        setErrors((p) => ({
          ...p,
          email: data.message || "No alumni record found",
        }));
        setEmailFetched(false);
        setFormData((prev) => ({
          ...prev,
          fullName: "",
          branch: "",
          passedOutYear: "",
          contactNumber: "",
        }));
      }
    } catch (err) {
      setErrors((p) => ({ ...p, email: "Server not responding" }));
      setEmailFetched(false);
    } finally {
      setLoadingEmail(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.areaOfInterest.length)
      newErrors.areaOfInterest = "Area of interest is required";
    if (!formData.supportDescription.trim())
      newErrors.supportDescription = "Support description is required";
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
      const res = await fetch("http://localhost:5000/api/mentor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          areaOfInterest: formData.areaOfInterest,
          phaseId: formData.phaseId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setFormData((prev) => ({
            email: "",
            fullName: "",
            designation: "",
            currentCompany: "",
            branch: "",
            passedOutYear: "",
            contactNumber: "",
            areaOfInterest: [],
            customInterest: "",
            supportDescription: "",
            phaseId: prev.phaseId,
            phaseName: prev.phaseName, // keep auto-filled phase
          }));
          setSubmitted(false);
          setEmailFetched(false);
        }, 2500);
      } else {
        alert(data.message || "Failed to submit. Try again.");
      }
    } catch (e) {
      alert("Backend offline. Check server.");
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
        <h1 className="form-title">Mentor Registration</h1>

        <div className="form-card">
          {submitted && <div className="success-message">✓ Mentor registration submitted!</div>}

          <div className="form-content">
            {/* EMAIL */}
            <div className="form-group">
              <label className="label" htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@nec.edu.in"
                className={`input ${errors.email ? "input-error" : ""}`}
              />
              {loadingEmail && <small>Searching alumni database...</small>}
              {errors.email && <span className="error-text">{errors.email}</span>}
              {emailFetched && !errors.email && (
                <small style={{ color: "#10b981" }}>✔ Found in alumni records</small>
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

            {/* Autofill section */}
            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  className="input disabled-input"
                  value={formData.fullName}
                  disabled
                  placeholder="Full Name"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="branch">Branch</label>
                <input
                  id="branch"
                  className="input disabled-input"
                  value={formData.branch}
                  disabled
                  placeholder="Branch"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="passedOutYear">Batch</label>
                <input
                  id="passedOutYear"
                  className="input disabled-input"
                  value={formData.passedOutYear}
                  disabled
                  placeholder="Batch"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="contactNumber">Contact</label>
                <input
                  id="contactNumber"
                  className="input disabled-input"
                  value={formData.contactNumber}
                  disabled
                  placeholder="Contact"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label" htmlFor="designation">Designation</label>
                <input
                  id="designation"
                  className="input disabled-input"
                  value={formData.designation}
                  disabled
                  placeholder="Designation"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="currentCompany">Company</label>
                <input
                  id="currentCompany"
                  className="input disabled-input"
                  value={formData.currentCompany}
                  disabled
                  placeholder="Company"
                />
              </div>
            </div>

            {/* Area of interest */}
            <div className="form-group">
              <label className="label">Area of Interest *</label>
              <select
                className={`select ${errors.areaOfInterest ? "input-error" : ""}`}
                value=""
                onChange={(e) => {
                  const selected = e.target.value;
                  if (!selected) return;
                  setFormData((prev) => {
                    if (!prev.areaOfInterest.includes(selected)) {
                      return { ...prev, areaOfInterest: [...prev.areaOfInterest, selected] };
                    }
                    return prev;
                  });
                }}
              >
                <option value="">-- Select or add below --</option>
                <option value="Web Development">Web Development</option>
                <option value="Data Science">Data Science</option>
                <option value="Cloud Computing">Cloud Computing</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="App Development">App Development</option>
                <option value="DevOps">DevOps</option>
              </select>

              <div style={{ marginTop: "0.5rem" }}>
                {formData.areaOfInterest.map((interest) => (
                  <div
                    key={interest}
                    className="selected-chip"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0.3rem 0.5rem",
                      margin: "0.2rem",
                      borderRadius: "0.25rem",
                      backgroundColor: "#f3f4f6",
                      fontSize: "0.875rem",
                    }}
                  >
                    {interest}
                    <button
                      type="button"
                      style={{
                        marginLeft: "0.3rem",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          areaOfInterest: prev.areaOfInterest.filter((i) => i !== interest),
                        }))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Add custom interest"
                  value={formData.customInterest}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customInterest: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="submit-btn"
                  style={{ padding: "0.4rem 0.7rem" }}
                  onClick={() => {
                    const interest = formData.customInterest.trim();
                    if (!interest) return;
                    setFormData((prev) => {
                      if (!prev.areaOfInterest.includes(interest)) {
                        return {
                          ...prev,
                          areaOfInterest: [...prev.areaOfInterest, interest],
                          customInterest: "",
                        };
                      }
                      return { ...prev, customInterest: "" };
                    });
                  }}
                >
                  Add
                </button>
              </div>

              {errors.areaOfInterest && (
                <span className="error-text">{errors.areaOfInterest}</span>
              )}
            </div>

            {/* Support Description */}
            <div className="form-group">
              <label className="label" htmlFor="supportDescription">
                Support Description *
              </label>
              <textarea
                id="supportDescription"
                name="supportDescription"
                value={formData.supportDescription}
                onChange={handleChange}
                placeholder="How will you support mentees?"
                rows="4"
                className={`textarea ${errors.supportDescription ? "input-error" : ""}`}
              />
              {errors.supportDescription && (
                <span className="error-text">{errors.supportDescription}</span>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="submit-btn"
              disabled={submitting || loadingEmail || submitted}
            >
              {submitting ? "Submitting..." : submitted ? "Submitted!" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
