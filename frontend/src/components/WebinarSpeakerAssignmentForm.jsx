import { Building2, Clock, Compass, Globe, Upload, Calendar, X ,User,ArrowLeft, MapPin} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import './Common.css';
import Popup from './Popup';

const typeOptions = [
  { value: "Full Stack Development", label: "FULL STACK DEVELOPMENT" },
  { value: "Cloud Computing", label: "CLOUD COMPUTING" },
  { value: "Artificial Intelligence & Data Science", label: "ARTIFICIAL INTELLIGENCE & DATA SCIENCE" },
  { value: "Robotic and Automation", label: "ROBOTIC AND AUTOMATION" },
  { value: "Electrical Power System", label: "ELECTRICAL POWER SYSTEM" },
  { value: "Embedded Systems", label: "EMBEDDED SYSTEMS" },
  { value: "Structural Engineering", label: "STRUCTURAL ENGINEERING" }
];

export default function WebinarSpeakerAssignmentForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '', name: '', department: '', batch: '', designation: '', companyName: '', speakerPhoto: null, domain: '', topic: '', webinarVenue: 'NEC Auditorium, Kovilpatti', alumniCity: 'Chennai', meetingLink: ''
  });
  const [slots, setSlots] = useState([{ deadline: '2024-12-15', webinarDate: '', time: '9:30-10:30' }]);
  const [showPoster, setShowPoster] = useState(false);
  const [photoURL, setPhotoURL] = useState(null);
  const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    if (formData.speakerPhoto) {
      const url = URL.createObjectURL(formData.speakerPhoto);
      setPhotoURL(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [formData.speakerPhoto]);

  useEffect(() => {
    const fetchTopics = async () => {
      if (!formData.domain) {
        setTopics([]);
        return;
      }
      try {
        const response = await fetch(`http://localhost:5000/api/topic-approvals`);
        const data = await response.json();
        console.log('Fetched topic approvals:', data);
        console.log('formData.domain:', formData.domain);
        const filteredTopics = data.filter(topic => {
          const topicDomainNormalized = topic.domain.toLowerCase().replace(/\s*\([^)]*\)\s*$/, '');
          const formDomainNormalized = formData.domain.toLowerCase().replace(/\s*\([^)]*\)\s*$/, '');
          const domainMatch = topicDomainNormalized === formDomainNormalized;
          const approvalMatch = topic.approval === 'Approved' || topic.approval === 'On Hold';
          console.log(`Topic: ${topic.topic}, domain: ${topic.domain}, approval: ${topic.approval}, domainMatch: ${domainMatch}, approvalMatch: ${approvalMatch}`);
          return domainMatch && approvalMatch;
        });
        console.log('Filtered topics:', filteredTopics);
        setTopics(filteredTopics);
      } catch (error) {
        console.error('Error fetching topics:', error);
      }
    };
    fetchTopics();
  }, [formData.domain]);

  useEffect(() => {
    const fetchCurrentPhase = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/current-phase');
        const data = await response.json();
        if (data.found) {
          setCurrentPhase(data);
          setFormData(prev => ({ ...prev, phaseId: data.phaseId }));
        }
      } catch (error) {
        console.error('Error fetching current phase:', error);
      }
    };
    fetchCurrentPhase();
  }, []);

  useEffect(() => {
    if (currentPhase && currentPhase.domains) {
      const phaseDomains = currentPhase.domains.map(domain => ({
        value: domain.domain,
        label: domain.domain.toUpperCase()
      }));
      setDomains(phaseDomains);
    } else {
      // If no current phase, use static domains
      setDomains(typeOptions.map(option => ({
        value: option.value,
        label: option.label
      })));
    }
  }, [currentPhase]);

  const handleChange = e => {
    const { name, value, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleSlotChange = (index, field, value) => {
    const updated = [...slots];
    updated[index][field] = value;

    // If webinarDate is changed, ensure deadline is before it
    if (field === 'webinarDate' && updated[index].deadline && new Date(updated[index].deadline) >= new Date(value)) {
      updated[index].deadline = ''; // Reset deadline if it's not before the new webinar date
    }

    setSlots(updated);
  };

  const removeSlot = index => setSlots(slots.filter((_, i) => i !== index));

  const fetchMemberDetails = async (email) => {
    if (!email) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/member-by-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (data.found) {
        setFormData(prev => ({
          ...prev,
          name: data.name,
          department: data.department,
          batch: data.batch
        }));
      } else {
        setPopup({ show: true, message: 'Alumni not found with this email', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching member details:', error);
      setPopup({ show: true, message: 'Error fetching alumni details', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.name || !formData.department || !formData.batch || !formData.designation ||
        !formData.companyName || !formData.speakerPhoto || !formData.domain || !formData.topic ||
        !formData.meetingLink || slots.some(s => !s.deadline || !s.webinarDate || !s.time)) {
      setPopup({ show: true, message: 'Please fill all required fields', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('designation', formData.designation);
      formDataToSend.append('companyName', formData.companyName);
      formDataToSend.append('alumniCity', formData.alumniCity);
      formDataToSend.append('domain', formData.domain);
      formDataToSend.append('topic', formData.topic);
      formDataToSend.append('webinarVenue', formData.webinarVenue);
      formDataToSend.append('meetingLink', formData.meetingLink);
      formDataToSend.append('speakerPhoto', formData.speakerPhoto);
      formDataToSend.append('phaseId', formData.phaseId);
      formDataToSend.append('slots', JSON.stringify(slots));

      const response = await fetch('http://localhost:5000/api/assign-speaker', {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        setPopup({ show: true, message: 'Speaker assigned successfully! 🎉', type: 'success' });
      } else {
        const errorData = await response.json();
        setPopup({ show: true, message: errorData.error || 'Error assigning speaker', type: 'error' });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setPopup({ show: true, message: 'Error assigning speaker', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePoster = () => {
    if (!formData.name || !formData.department || !formData.batch || !formData.designation ||
        !formData.companyName || !formData.speakerPhoto || !formData.domain || !formData.topic ||
        slots.some(s => !s.deadline || !s.webinarDate || !s.time)) {
      alert("Please fill all required fields before generating the poster");
      return;
    }
    setShowPoster(!showPoster);
  };

  return (
    <div className="student-form-page">
      {/* Background Orbs */}
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
              <Building2 className="header-icon" />
            </div>
            <h1 className="form-title">Speaker Assignment Form</h1>
            {currentPhase && (
              <p className="current-phase">Current Phase: {currentPhase.phaseId}</p>
            )}
          </div>
          <div className="form-card">
            <div className="form-fields">
              <h2 className="section-heading">Speaker Details</h2>
                <div className="form-row" style={{ display: "flex", gap: "20px" }}>
                  
                  {/* Email Field */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>
                      <User className="field-icon" /> Email <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={(e) => fetchMemberDetails(e.target.value)}
                      placeholder="Enter alumni email"
                      className="input-field"
                    />
                    {loading && (
                      <p className="text-sm text-gray-500 mt-1">Fetching details...</p>
                    )}
                  </div>

                  {/* Name Field */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>
                      <User className="field-icon" /> Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter name"
                      className="input-field"
                    />
                  </div>

                </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-group">
                  <label>
                    <Building2 className="field-icon" /> Department <span className="required">*</span>
                  </label>
                  <input type="text" name="department" value={formData.department} readOnly className="input-field bg-gray-100" />
                </div>
                <div className="form-group">
                  <label>
                    <Globe className="field-icon" /> Batch <span className="required">*</span>
                  </label>
                  <input type="text" name="batch" value={formData.batch} readOnly className="input-field bg-gray-100" />
                </div>

              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-group">
                  <label>
                    <Compass className="field-icon" /> Designation <span className="required">*</span>
                  </label>
                  <input type="text" name="designation" value={formData.designation} onChange={handleChange} placeholder="Enter designation" className="input-field" />
                </div>
                                <div className="form-group">
                  <label>
                    <Building2 className="field-icon" /> Company Name <span className="required">*</span>
                  </label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Enter company name" className="input-field" />
                </div>
              </div>
              

              {/* Company + Photo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-group">
                  <label>
                    <Globe className="field-icon" /> Alumni City <span className="required">*</span>
                  </label>
                  <input type="text" name="alumniCity" value={formData.alumniCity} onChange={handleChange} placeholder="Enter city" className="input-field" />
                </div>
                <div className="form-group">
                  <label>
                    <Upload className="field-icon" /> Speaker Photo <span className="required">*</span>
                  </label>
                  <input type="file" name="speakerPhoto" id="speaker-photo-upload" accept="image/*" className="input-field hidden" onChange={handleChange} />
                  <label htmlFor="speaker-photo-upload" className="input-field cursor-pointer flex items-center gap-2">
                    <Upload className="field-icon" /> {formData.speakerPhoto ? formData.speakerPhoto.name : "Choose photo or drag here"}
                  </label>
                </div>
              </div>

              {/* Domain */}
              <h2 className="section-heading">Webinar Details</h2>
              <div className="form-group">
                <label>
                  <Globe className="field-icon" /> Domain <span className="required">*</span>
                </label>

                <select
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select Domain</option>
                  {domains.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Webinar Topic */}
              <div className="form-group">
                <label>
                  <Building2 className="field-icon" /> Webinar Topic <span className="required">*</span>
                </label>

                <select
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select Webinar Topic</option>
                  {topics.map(topic => (
                    <option key={topic._id} value={topic.topic}>{topic.topic}</option>
                  ))}
                </select>
              </div>

              {/* Webinar Venue and Alumni City */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-group">
                  <label>
                    <MapPin className="field-icon" /> Webinar Venue <span className="required">*</span>
                  </label>
                  <input type="text" name="webinarVenue" value={formData.webinarVenue} onChange={handleChange} placeholder="Enter venue" className="input-field" />
                </div>
                {/* Meeting Link */}
              <div className="form-group">
                <label>
                  <Globe className="field-icon" /> Meeting Link (if Online) or else enter In Person <span className="required">*</span>
                </label>
                <input type="url" name="meetingLink" value={formData.meetingLink} onChange={handleChange} placeholder="Enter meeting link" className="input-field" />
              </div>
              </div>
              {/* Assign Slot */}
              <h2 className="section-heading">Assign Slot</h2>
              {slots.map((slot, i) => (
                <div key={i} className="form-card relative grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <button type="button" onClick={() => removeSlot(i)} className="remove-slot absolute top-2 right-2">
                    <X className="field-icon" />
                  </button>
                  <div className="form-group">
                    <label>
                      <Calendar className="field-icon" /> WebinarDate <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      value={slot.webinarDate}
                      onChange={e => handleSlotChange(i, "webinarDate", e.target.value)}
                      placeholder="Select date"
                      className="input-field"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <Calendar className="field-icon" /> Deadline <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      value={slot.deadline}
                      onChange={e => handleSlotChange(i, "deadline", e.target.value)}
                      placeholder="Select date"
                      className="input-field"
                      min={new Date().toISOString().split('T')[0]}
                      max={slot.webinarDate || undefined}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <Clock className="field-icon" /> Time <span className="required">*</span>
                    </label>
                    <select value={slot.time} onChange={e => handleSlotChange(i, "time", e.target.value)} className="input-field">
                      <option value="">Select time slot</option>
                      <option value="9:30-10:30">9:30-10:30</option>
                      <option value="10:30-11:30">10:30-11:30</option>
                      <option value="11:30-12:30">11:30-12:30</option>
                      <option value="12:30-1:30">12:30-1:30</option>
                      <option value="1:30-2:30">1:30-2:30</option>
                      <option value="2:30-3:30">2:30-3:30</option>
                      <option value="3:30-4:30">3:30-4:30</option>
                    </select>
                  </div>
                </div>
              ))}

              {/* Buttons */}
              <button onClick={handleSubmit} className="submit-btn">Assign Speaker</button>
            </div>
          </div>

          <p className="form-footer">Designed with 💜 for Alumni Network</p>

          {showPoster && (
            <div className="mt-8 flex justify-center">
              <WebinarPoster
                alumniPhoto={photoURL}
                webinarTopic={formData.domain}
                webinarDate={slots[0]?.webinarDate || ''}
                webinarTime={slots[0]?.time || ''}
                webinarVenue={formData.webinarVenue}
                alumniName={formData.name}
                alumniDesignation={formData.designation}
                alumniCompany={formData.companyName}
                alumniCity={formData.alumniCity}
                alumniBatch={formData.batch}
                alumniDepartment={formData.department}
              />
            </div>
          )}

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
