import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");

    if (!email.trim()) {
      return setError("Email is required");
    }

    setLoading(true);

    try {
      let role = "";

      if (email.toLowerCase() === "rampriya@gmail.com") {
        role = "coordinator";
      } 
      else if (email.toLowerCase() === "admin@gmail.com") {
        role = "admin";
      } 
      else {
        const res = await axios.post("http://localhost:5000/api/auth/login", { email });

        if (!res.data.success) {
          setError(res.data.message || "Login failed");
          setLoading(false);
          return;
        }

        role = res.data.role;
      }

      localStorage.setItem("userEmail", email);
      localStorage.setItem("userRole", role);

      console.log("Login successful:", { email, role });

      if (role === "admin") {
        navigate("/admin_dashboard");
      } else if (role === "coordinator") {
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }

    setLoading(false);
  };

  return (
    <div className="dashboard-wrapper">
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      
      <div className="login-container">
        <div className="login-glass-box">
          <h1 className="login-title">Mentorship Login</h1>
          <p className="login-subtitle">Access the NEC Mentorship System</p>

          <div className="form-divider"></div>

          <div className="form-field-group">
            <label className="form-label">
              Email Address *
              <span className="form-hint">Enter your registered email</span>
            </label>
            <input
              type="email"
              placeholder="Enter your email address..."
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="checkbox-group">
            <input 
              type="checkbox" 
              id="robotCheck" 
              className="checkbox-input"
              defaultChecked
            />
            <label htmlFor="robotCheck" className="checkbox-label">
              I'm not a robot
            </label>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="login-submit-btn"
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Logging in...
              </>
            ) : (
              "Login to Dashboard"
            )}
          </button>

          <div className="form-footer">
            <p className="footer-text">NEC Mentorship System</p>
          </div>
        </div>
      </div>
    </div>
  );
}