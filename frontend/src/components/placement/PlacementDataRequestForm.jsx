import React, { useState } from 'react';
import { User, Mail, Phone, GraduationCap, MapPin, Zap, Building2, Clock, DollarSign, MessageSquare, Paperclip, CheckCircle, AlertCircle, X, Loader2, XCircle } from 'lucide-react';
import './AlumniJobRequestForm.css';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function AlumniJobRequestForm() {
  const [formData, setFormData] = useState({
    email: '',
    location: '',
    skillset: [], // Changed to array for tags
    company: '',
    experience: '',
    ctc: '', // Now optional
    message: '',
    attachment: null,
    isRobot: false
  });

  const [skillInput, setSkillInput] = useState(''); // Separate state for skill input

  // Separate state for display-only fields
  const [displayData, setDisplayData] = useState({
    name: '',
    contact: '',
    batch: ''
  });

  const [userId, setUserId] = useState(null);
  const [toaster, setToaster] = useState({
    show: false,
    type: '',
    message: ''
  });

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    }));
  };

  const handleSkillInputChange = (e) => {
    setSkillInput(e.target.value);
  };

  const handleSkillInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    }
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.skillset.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skillset: [...prev.skillset, skill]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skillset: prev.skillset.filter(skill => skill !== skillToRemove)
    }));
  };

  const showToaster = (type, message) => {
    setToaster({ show: true, type, message });
    setTimeout(() => {
      setToaster({ show: false, type: '', message: '' });
    }, 3000);
  };

  const handleEmailBlur = async () => {
    const email = formData.email.trim();
    if (!email) return;

    setIsAutoFilling(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/members/email/${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success && data.member) {
        setUserId(data.member._id);
        
        setDisplayData({
          name: data.member.name || '',
          contact: data.member.mobile || '',
          batch: data.member.batch || ''
        });
        
        showToaster("success", "✨ User details auto-filled successfully!");
      } else {
        showToaster("error", "❌ User not found in database. Please use registered email.");
        setUserId(null);
        setDisplayData({ name: '', contact: '', batch: '' });
      }
    } catch (err) {
      console.error('Auto-fill error:', err);
      showToaster("error", "Auto-fill not available. Please check your connection.");
      setUserId(null);
      setDisplayData({ name: '', contact: '', batch: '' });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.isRobot) {
      showToaster('error', 'Please verify that you are not a robot!');
      return;
    }

    if (!userId) {
      showToaster('error', 'Please use a registered email address!');
      return;
    }

    // Validate required fields (excluding CTC)
    const requiredFields = ['email', 'location', 'company', 'experience', 'message'];
    const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');
    
    if (missingFields.length > 0) {
      showToaster('error', `Please fill all required fields!`);
      return;
    }

    // Validate skillset has at least one skill
    if (formData.skillset.length === 0) {
      showToaster('error', 'Please add at least one skill!');
      return;
    }

    if (!formData.attachment) {
      showToaster('error', 'Please upload your resume!');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      
      // Send skillset as comma-separated string or array
      formDataToSend.append('userId', userId);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('skillset', JSON.stringify(formData.skillset)); // Send as JSON string
      formDataToSend.append('company', formData.company);
      formDataToSend.append('experience', formData.experience);
      
      // CTC is optional - only append if it has value
      if (formData.ctc && formData.ctc.trim() !== '') {
        formDataToSend.append('ctc', formData.ctc);
      }
      
      formDataToSend.append('message', formData.message);
      formDataToSend.append('attachment', formData.attachment);

      const response = await fetch(`${API_BASE_URL}/api/job-requests`, {
        method: 'POST',
        body: formDataToSend,
      });

      let result;
      
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        showToaster('error', 'Server response error. Please try again.');
        return;
      }

      if (response.ok && result.success) {
        showToaster('success', '🎉 Job request submitted successfully!');
        
        // Reset form
        setTimeout(() => {
          setFormData({
            email: '',
            location: '',
            skillset: [],
            company: '',
            experience: '',
            ctc: '',
            message: '',
            attachment: null,
            isRobot: false
          });
          setSkillInput('');
          setDisplayData({ name: '', contact: '', batch: '' });
          setUserId(null);
          
          // Reset file input
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.value = '';
        }, 1000);
      } else {
        showToaster('error', result.message || `Failed to submit: ${response.status}`);
      }
    } catch (err) {
      console.error('Submit error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        showToaster('error', 'Cannot connect to server. Make sure backend is running on port 5000.');
      } else {
        showToaster('error', 'An error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="placement-form-container">
      {/* Animated Background Orbs */}
      <div className="background-orb orb-1"></div>
      <div className="background-orb orb-2"></div>
      <div className="background-orb orb-3"></div>

      {/* Toaster Notification */}
      {toaster.show && (
        <div className={`toaster ${toaster.type}`}>
          <div className="toaster-content">
            {toaster.type === 'success' ? (
              <CheckCircle className="toaster-icon" />
            ) : (
              <AlertCircle className="toaster-icon" />
            )}
            <span className="toaster-message">{toaster.message}</span>
            <button
              onClick={() => setToaster({ show: false, type: '', message: '' })}
              className="toaster-close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="form-wrapper">
        {/* Header */}
        <div className="form-header">
          <div className="form-icon">
            <GraduationCap size={32} />
          </div>
          <h1 className="form-title">Alumni Job Request Form</h1>
          <p className="form-subtitle">Fill out all the Experience form</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div className="form-card">
            {/* Email - First field for auto-fill */}
            <div className="form-group">
              <label className="form-label">
                <Mail size={18} className="label-icon" />
                Personal Email ID <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  className="form-input"
                  placeholder="your.email@example.com"
                  required
                  disabled={isSubmitting}
                />
                {isAutoFilling && (
                  <Loader2 className="input-icon loading" size={20} />
                )}
              </div>
              <p className="input-hint">
                {isAutoFilling ? "🔄 Fetching user details..." : "✨ Your details will auto-fill if you're in our database"}
              </p>
            </div>

            {/* Display-only fields (auto-filled, not saved) */}
            {displayData.name && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <User size={18} className="label-icon" />
                    Name (Auto-filled)
                  </label>
                  <input
                    type="text"
                    value={displayData.name}
                    className="form-input"
                    disabled
                    style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Phone size={18} className="label-icon" />
                      Contact No (Auto-filled)
                    </label>
                    <input
                      type="tel"
                      value={displayData.contact}
                      className="form-input"
                      disabled
                      style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <GraduationCap size={18} className="label-icon" />
                      Batch (Auto-filled)
                    </label>
                    <input
                      type="text"
                      value={displayData.batch}
                      className="form-input"
                      disabled
                      style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Preferred Location */}
            <div className="form-group">
              <label className="form-label">
                <MapPin size={18} className="label-icon" />
                Preferred Location <span className="required">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="form-input"
                placeholder="Bangalore, India"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Skillset as Tags */}
            <div className="form-group">
              <label className="form-label">
                <Zap size={18} className="label-icon" />
                Skillset <span className="required">*</span>
                <span className="skill-count">({formData.skillset.length} added)</span>
              </label>
              
              {/* Skills Tags Container */}
              <div className="skills-tags-container">
                {formData.skillset.map((skill, index) => (
                  <div key={index} className="skill-tag">
                    <span className="skill-tag-text">{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="skill-tag-remove"
                      disabled={isSubmitting}
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Skills Input */}
              <div className="skill-input-wrapper">
                <input
                  type="text"
                  value={skillInput}
                  onChange={handleSkillInputChange}
                  onKeyDown={handleSkillInputKeyDown}
                  className="form-input skill-input"
                  placeholder="Type a skill and press Enter or comma (e.g., 'React, Node.js')"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="skill-add-button"
                  disabled={isSubmitting || !skillInput.trim()}
                >
                  Add
                </button>
              </div>
              <p className="input-hint">
                💡 Press Enter or comma to add a skill. Add at least one skill.
              </p>
            </div>

            {/* Current Company */}
            <div className="form-group">
              <label className="form-label">
                <Building2 size={18} className="label-icon" />
                Target Company <span className="required">*</span>
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="form-input"
                placeholder="Tech Corp Inc."
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Experience & CTC */}
            <div className="form-group-row">
              <div className="form-group">
                <label className="form-label">
                  <Clock size={18} className="label-icon" />
                  Years of Experience <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="3 years"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <DollarSign size={18} className="label-icon" />
                  Current CTC (Optional)
                </label>
                <input
                  type="text"
                  name="ctc"
                  value={formData.ctc}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="₹12 LPA (Optional)"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Message */}
            <div className="form-group">
              <label className="form-label">
                <MessageSquare size={18} className="label-icon" />
                Message <span className="required">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Tell us about your job requirements..."
                rows="4"
                required
                disabled={isSubmitting}
              ></textarea>
            </div>

            {/* Attachment */}
            <div className="form-group">
              <label className="form-label">
                <Paperclip size={18} className="label-icon" />
                Resume Attachment <span className="required">*</span>
              </label>
              <input
                type="file"
                name="attachment"
                onChange={handleChange}
                className="form-file"
                accept=".pdf,.doc,.docx"
                required
                disabled={isSubmitting}
              />
              {formData.attachment && (
                <p className="file-hint">
                  📄 Selected: {formData.attachment.name}
                </p>
              )}
              <p className="file-hint">
                Upload your resume (PDF, DOC, DOCX) - Max 5MB
              </p>
            </div>

            {/* Robot Checkbox */}
            <div className="checkbox-wrapper">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isRobot"
                  checked={formData.isRobot}
                  onChange={handleChange}
                  className="checkbox-input"
                  required
                  disabled={isSubmitting}
                />
                I'm not a robot
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting || !userId}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  Submitting...
                </>
              ) : (
                'Submit Job Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}