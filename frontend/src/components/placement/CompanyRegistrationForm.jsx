import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Plus, XCircle } from 'lucide-react';
import './CompanyRegistrationForm.css';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CompanyRegistrationForm = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    isAlumniCompany: false,
    jobRole: '',
    requiredSkills: [],
    ctcOffered: '',
    location: '',
    deadline: '',
    applicationLink: '',
    jobDescription: '',
  });
  
  const [currentSkill, setCurrentSkill] = useState('');
  const [poster, setPoster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [deadlineError, setDeadlineError] = useState('');
  const skillInputRef = useRef(null);

  // Get current date and time in required format (YYYY-MM-DDTHH:mm)
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Validate deadline date
  const validateDeadline = (deadlineValue) => {
    if (!deadlineValue) {
      setDeadlineError('Deadline is required');
      return false;
    }

    const selectedDate = new Date(deadlineValue);
    const currentDate = new Date();

    // Remove milliseconds for accurate comparison
    selectedDate.setMilliseconds(0);
    currentDate.setMilliseconds(0);

    if (selectedDate <= currentDate) {
      setDeadlineError('Deadline must be a future date and time');
      return false;
    }

    // Optional: Add minimum days validation
    const minDays = 1; // At least 1 day from now
    const minDate = new Date(currentDate);
    minDate.setDate(currentDate.getDate() + minDays);
    
    if (selectedDate < minDate) {
      setDeadlineError(`Deadline must be at least ${minDays} day(s) from now`);
      return false;
    }

    // Optional: Add maximum days validation (e.g., not more than 1 year)
    const maxDays = 365;
    const maxDate = new Date(currentDate);
    maxDate.setDate(currentDate.getDate() + maxDays);
    
    if (selectedDate > maxDate) {
      setDeadlineError(`Deadline cannot be more than ${maxDays} days from now`);
      return false;
    }

    setDeadlineError('');
    return true;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'deadline') {
      setFormData(prev => ({ ...prev, [name]: value }));
      validateDeadline(value);
    } else if (type === 'radio') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle skill input
  const handleSkillInputChange = (e) => {
    setCurrentSkill(e.target.value);
  };

  // Add skill on Enter, Comma, or Tab
  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addSkill();
    }
  };

  // Add new skill tag
  const addSkill = () => {
    const skill = currentSkill.trim();
    if (skill && !formData.requiredSkills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, skill]
      }));
      setCurrentSkill('');
    }
  };

  // Remove skill tag
  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(skill => skill !== skillToRemove)
    }));
  };

  // Add skill on button click
  const handleAddSkillClick = () => {
    addSkill();
    skillInputRef.current?.focus();
  };

  const handleFileChange = (e) => {
    setPoster(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    // Validate deadline before submission
    if (!validateDeadline(formData.deadline)) {
      setMessage({ 
        text: 'Please fix the deadline error before submitting!', 
        type: 'error' 
      });
      setLoading(false);
      return;
    }

    // Check if at least one skill is added
    if (formData.requiredSkills.length === 0) {
      setMessage({ 
        text: 'Please add at least one required skill!', 
        type: 'error' 
      });
      skillInputRef.current?.focus();
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      
      // Convert requiredSkills array to comma-separated string
      const skillsetString = formData.requiredSkills.join(', ');
      
      // Add all form data
      Object.keys(formData).forEach(key => {
        if (key === 'requiredSkills') {
          formDataToSend.append(key, skillsetString);
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      if (poster) {
        formDataToSend.append('poster', poster);
      }

      console.log('Sending form data:', Object.fromEntries(formDataToSend));

      const response = await axios.post(
        `${API_BASE_URL}/api/company/register`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Response:', response.data);
      
      if (response.data.success) {
        setMessage({ 
          text: 'Company registered successfully!', 
          type: 'success' 
        });
        
        // Reset form completely
        setFormData({
          companyName: '',
          isAlumniCompany: false,
          jobRole: '',
          requiredSkills: [],
          ctcOffered: '',
          location: '',
          deadline: '',
          applicationLink: '',
          jobDescription: '',
        });
        setCurrentSkill('');
        setPoster(null);
        setDeadlineError('');
        
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        setMessage({ 
          text: error.response.data.message || 'Error registering company', 
          type: 'error' 
        });
      } else if (error.request) {
        setMessage({ 
          text: 'No response from server. Please check if backend is running.', 
          type: 'error' 
        });
      } else {
        setMessage({ 
          text: 'Error setting up request: ' + error.message, 
          type: 'error' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Set min attribute for datetime input
  const minDateTime = getCurrentDateTime();

  return (
    <div className="form-container">
      <div className="form-wrapper">
        {/* Header */}
        <div className="form-header">
          <div className="form-icon">🏢</div>
          <h2 className="form-title">Add New Company</h2>
          <p className="form-subtitle">
            Register a new company and job role for campus placements
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`message-alert ${message.type === 'success' ? 'message-success' : 'message-error'}`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label className="form-label">
                <span className="form-label-icon">🏢</span>
                Company Name <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Enter company name"
                required
                className="form-input"
                disabled={loading}
              />
            </div>
            <div>
              <label className="form-label">
                <span className="form-label-icon">💼</span>
                Job Role <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                name="jobRole"
                value={formData.jobRole}
                onChange={handleChange}
                placeholder="Enter job role"
                required
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Alumni Company Radio Button */}
          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">🎓</span>
              Alumni Company? <span className="required-asterisk">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="isAlumniCompany"
                  value="true"
                  checked={formData.isAlumniCompany === true}
                  onChange={handleChange}
                  disabled={loading}
                  className="radio-input"
                />
                <span>Yes</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="isAlumniCompany"
                  value="false"
                  checked={formData.isAlumniCompany === false}
                  onChange={handleChange}
                  disabled={loading}
                  className="radio-input"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* Skillset with Tags */}
          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">⚡</span>
              Required Skills <span className="required-asterisk">*</span>
            </label>
            
            {/* Skills Tags Container */}
            <div className="skills-tags-container">
              {formData.requiredSkills.map((skill, index) => (
                <div key={index} className="skill-tag">
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="skill-tag-remove"
                    disabled={loading}
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Skill Input with Add Button */}
            <div className="skill-input-wrapper">
              <input
                ref={skillInputRef}
                type="text"
                value={currentSkill}
                onChange={handleSkillInputChange}
                onKeyDown={handleSkillKeyDown}
                className="form-input skill-input"
                placeholder="Type a skill and press Enter or comma"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAddSkillClick}
                className="add-skill-button"
                disabled={loading || !currentSkill.trim()}
              >
                <Plus size={18} />
              </button>
            </div>
            <p className="input-hint">
              Press Enter, Tab, or comma to add skill. Click on skill to remove.
            </p>
          </div>

          <div className="form-grid">
            <div>
              <label className="form-label">
                <span className="form-label-icon">💰</span>
                CTC Offered <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                name="ctcOffered"
                value={formData.ctcOffered}
                onChange={handleChange}
                placeholder="e.g., 8 LPA"
                required
                className="form-input"
                disabled={loading}
              />
            </div>
            <div>
              <label className="form-label">
                <span className="form-label-icon">📍</span>
                Location <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Job location"
                required
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="form-label">
                <span className="form-label-icon">📅</span>
                Application Deadline <span className="required-asterisk">*</span>
              </label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                min={minDateTime}
                required
                className={`form-input ${deadlineError ? 'input-error' : ''}`}
                disabled={loading}
              />
              {deadlineError && (
                <div className="error-message">
                  ⚠️ {deadlineError}
                </div>
              )}
              <p className="input-hint">
                Select a future date and time (at least 1 day from now)
              </p>
            </div>
            <div>
              <label className="form-label">
                <span className="form-label-icon">🔗</span>
                Application Link <span className="required-asterisk">*</span>
              </label>
              <input
                type="url"
                name="applicationLink"
                value={formData.applicationLink}
                onChange={handleChange}
                placeholder="Apply / registration link"
                required
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">📝</span>
              Job Description <span className="required-asterisk">*</span>
            </label>
            <textarea
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleChange}
              placeholder="Enter detailed job description..."
              rows="4"
              required
              className="form-textarea"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">🖼️</span>
              Company Poster
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="file-input"
              disabled={loading}
            />
            <p className="file-hint">
              Drag and drop or click to upload poster / brochure (Max 5MB)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || deadlineError}
            className={`submit-button ${deadlineError ? 'button-disabled' : ''}`}
          >
            {loading ? 'Registering...' : 'Add Company'}
          </button>
        </form>

        <div className="form-footer">
          {loading && 'Processing... Please wait'}
        </div>
      </div>
    </div>
  );
};

export default CompanyRegistrationForm;