import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Common.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function GuestLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/guest-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'Guest login failed');
        return;
      }
      localStorage.setItem('guestToken', data.token);
      localStorage.setItem('guestEmail', data.email);
      localStorage.setItem('userRole', 'guest');
      navigate('/webinar-guest-dashboard');
    } catch (requestError) {
      console.error('Guest login failed:', requestError);
      setError('Unable to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-form-page">
      <div className="form-wrapper">
        <div className="form-card" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="form-header">
            <h1 className="form-title">Guest Login</h1>
            <p className="webinar-subtitle">View webinar events and public details</p>
          </div>
          <form className="form-fields" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="guest-email">Email</label>
              <input id="guest-email" className="input-field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="guest-password">Password</label>
              <input id="guest-password" className="input-field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button className="submit-btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in as Guest'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
