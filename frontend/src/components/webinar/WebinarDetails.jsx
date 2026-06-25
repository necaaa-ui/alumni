import React, { useState, useEffect } from  'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './Common.css';
import { FiBookOpen } from "react-icons/fi";
import { Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';
import WebinarCompletedDetailsForm from './WebinarCompletedDetailsForm';
import ConfirmationDialog from './ConfirmationDialog';
import Popup from './Popup';

// Add API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function WebinarDetails() {
  const { id, encodedUserEmail } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const userEmail = decodeURIComponent(encodedUserEmail);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    topic: '',
    domain: '',
    webinarDate: '',
    time: '',
    venue: '',
    meetingLink: '',
    alumniCity: '',
    speaker: {
      name: '',
      email: '',
      designation: '',
      companyName: '',
      department: '',
      batch: '',
    }
  });


  const [webinar, setWebinar] = useState(location.state?.webinar || null);
  const [registrations, setRegistrations] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(!webinar);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [popup, setPopup] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);


  const handleDeleteWebinar = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/webinars/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPopup({ message: 'Webinar deleted successfully!', type: 'success' });
        setTimeout(() => {
          navigate(`/4?email=${encodeURIComponent(userEmail)}`);
        }, 2000);
      } else {
        setPopup({ message: 'Failed to delete webinar.', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting webinar:', error);
      setPopup({ message: 'An error occurred while deleting the webinar.', type: 'error' });
    }
    setShowDeleteDialog(false);
  };

  const exportRegistrationData = () => {
    const exportData = registrations.map((registration, index) => ({
      'Serial Number': index + 1,
      'Student Name': registration.userDetails?.name || 'N/A',
      'Student Email': registration.email || 'N/A',
      'Student Department': registration.userDetails?.department || 'N/A',
      'Student Batch': registration.userDetails?.batch || 'N/A'
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Webinar Registrations');
    const fileName = `webinar_registrations_${webinar?.topic?.replace(/\s+/g, '_') || id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportFeedbackData = () => {
    const exportData = feedback.map((item, index) => ({
      'Serial Number': index + 1,
      'Student Name': item.student?.name || 'N/A',
      'Student Email': item.student?.email || 'N/A',
      'Student Department': item.student?.department || 'N/A',
      'Student Batch': item.student?.batch || 'N/A',
      'Feedback': item.feedback || 'No feedback provided'
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Webinar Feedback');
    const fileName = `webinar_feedback_${webinar?.topic?.replace(/\s+/g, '_') || id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'registration':
        return (
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="text-xl font-semibold text-gray-800">
                Registered Students ({registrations.length})
              </h2>
              <button
                type="button"
                onClick={exportRegistrationData}
                className="submit1-btn"
                style={{ backgroundImage: 'linear-gradient(90deg, #16a34a 0%, #14b8a6 100%)', color: 'white', padding: '6px 12px', borderRadius: '10px', minWidth: '80px' }}
              >
                Export
              </button>
            </div>

            <div>
                <table style={{ width: "810px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#eee", paddingTop: "15px", paddingBottom: "15px" }}>
                    <th style={{  width: "250px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Student Name</th>
                    <th style={{  width: "250px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Student Email</th>
                    <th style={{  width: "180px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Student  Department </th>
                    <th style={{  width: "180px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Student Batch</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 py-12">
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        No registrations found for this webinar.
                      </td>
                    </tr>
                  ) : (
                    registrations.map((registration, index) => (
                      <tr key={registration._id || index} className="hover:bg-gray-50">
                        <td className="px-8 py-12 whitespace-nowrap text-lg font-medium text-gray-900 text-center">
                          {registration.userDetails?.name || 'N/A'}
                        </td>
                        <td className="px-8 py-12 whitespace-nowrap text-lg text-gray-500 text-center">
                          {registration.email}
                        </td>
                        <td className="px-8 py-12 whitespace-nowrap text-lg text-gray-500 text-center">
                          {registration.userDetails?.department || 'N/A'}
                        </td>
                        <td className="px-8 py-12 whitespace-nowrap text-lg text-gray-500 text-center">
                          {(() => {
                            console.log('Registration data:', registration);
                            console.log('UserDetails:', registration.userDetails);
                            console.log('Batch value:', registration.userDetails?.batch);
                            return registration.userDetails?.batch || 'N/A';
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'feedback':
        return (
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="text-xl font-semibold text-gray-800">
                Student Feedback ({feedback.length})
              </h2>
              <button
                type="button"
                onClick={exportFeedbackData}
                className="submit1-btn"
                style={{ backgroundImage: 'linear-gradient(90deg, #16a34a 0%, #14b8a6 100%)', color: 'white', padding: '6px 12px', borderRadius: '10px', minWidth: '80px' }}
              >
                Export
              </button>
            </div>

            <div>
                <table style={{ width: "810px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#eee", paddingTop: "15px", paddingBottom: "15px" }}>
                    <th style={{  width: "250px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Student Name</th>
                    <th style={{  width: "250px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Student Email</th>
                    <th style={{  width: "180px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Student Department</th>
                    <th style={{  width: "180px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Student Batch</th>
                    <th style={{  width: "420px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Feedback</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedback.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                        No feedback found for this webinar.
                      </td>
                    </tr>
                  ) : (
                    feedback.map((item, index) => (
                      <tr key={item._id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-6 whitespace-nowrap text-lg font-medium text-gray-900 text-center mb-2">
                          {item.student?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-lg text-gray-500 text-center">
                          {item.student?.email || 'N/A'}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-lg text-gray-500 text-center">
                          {item.student?.department || 'N/A'}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-lg text-gray-500 text-center">
                          {item.student?.batch || 'N/A'}
                        </td>
                        <td className="px-6 py-6 text-sm text-gray-500 text-center">
                          {item.feedback || 'No feedback provided'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'uploads':
        return <WebinarCompletedDetailsForm />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!webinar) {
      // Only fetch if webinar data wasn't passed via state
      const fetchData = async () => {
        try {
          // Fetch webinar details
          const webinarResponse = await fetch(`${API_BASE_URL}/api/webinars/${id}`);
          if (!webinarResponse.ok) {
            throw new Error('Failed to fetch webinar details');
          }
          const webinarData = await webinarResponse.json();
          setWebinar(webinarData);
        } catch (err) {
          console.error('Error fetching webinar details:', err);
          setError('Failed to load webinar details. Please try again later.');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else {
      setLoading(false);
    }

    // Fetch registrations with member details
    const fetchRegistrations = async () => {
      try {
        const registrationsResponse = await fetch(`${API_BASE_URL}/api/registrations/webinar/${id}/details`);
        if (!registrationsResponse.ok) {
          throw new Error('Failed to fetch registrations');
        }
        const registrationsData = await registrationsResponse.json();
        setRegistrations(registrationsData);
      } catch (err) {
        console.error('Error fetching registrations:', err);
      }
    };

    fetchRegistrations();

    // Fetch feedback with member details (student feedback only)
    const fetchFeedback = async () => {
      try {
        // First get webinar details to get the topic
        let webinarTopic = webinar?.topic;
        if (!webinarTopic) {
          const webinarResponse = await fetch(`${API_BASE_URL}/api/webinars/${id}`);
          if (webinarResponse.ok) {
            const webinarData = await webinarResponse.json();
            webinarTopic = webinarData.topic;
          }
        }

        // Fetch student feedback by webinar topic
        const studentFeedbackResponse = await fetch(`${API_BASE_URL}/api/student-feedback/webinar/${encodeURIComponent(webinarTopic)}`);
        let studentFeedbackData = [];
        if (studentFeedbackResponse.ok) {
          studentFeedbackData = await studentFeedbackResponse.json();
        }

        // Format feedback data
        const formattedFeedback = studentFeedbackData.map((item) => ({
          ...item,
          student: {
            name: item.name,
            email: item.email,
            department: item.department,
            batch: item.batch
          }
        }));

        setFeedback(formattedFeedback);
      } catch (err) {
        console.error('Error fetching feedback:', err);
      }
    };

    fetchFeedback();
  }, [id, webinar]);

  if (loading) {
    return (
      <div className="student-form-page">
        <div className="text-center py-8">
          <p className="text-lg text-gray-600">Loading webinar details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-form-page">
        <div className="text-center py-8">
          <p className="text-lg text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 submit-btn"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-form-page">
      {/* Background Animated Orbs */}
      <div className="background-orbs">
        <div className="orb orb-purple animation-delay-2000"></div>
        <div className="orb orb-blue animation-delay-4000"></div>
        <div className="orb orb-pink"></div>
      </div>

      {/* Main Container */}
      <div className="form-wrapper">
        <div>
          {/* Header */}
          <div className="form-header">
            <div className="icon-wrapper">
              <FiBookOpen className="header-icon" />
            </div>
            <h1 className="text-2xl font-bold text-[#7d48b9] mb-4 tracking-wider">Webinar Details</h1>
            <p className="webinar-subtitle">
              {webinar.topic}
            </p>
          </div>

          {/* Delete Button */}
      <div style={{ textAlign: 'right', margin: '20px 20px' }}>
            {/* Edit Webinar Button (visible on eye/details page) */}
            <button
              className="edit-btn"
              onClick={() => {
                if (!webinar) return;
                setEditForm({
                  topic: webinar.topic || '',
                  domain: webinar.domain || '',
                  webinarDate: webinar.webinarDate ? new Date(webinar.webinarDate).toISOString().slice(0, 10) : '',
                  time: webinar.time || '',
                  venue: webinar.venue || '',
                  meetingLink: webinar.meetingLink || '',
                  alumniCity: webinar.alumniCity || '',
                  speaker: {
                    name: webinar.speaker?.name || '',
                    email: webinar.speaker?.email || '',
                    designation: webinar.speaker?.designation || '',
                    companyName: webinar.speaker?.companyName || '',
                    department: webinar.speaker?.department || '',
                    batch: webinar.speaker?.batch || ''
                  }
                });
                setShowEditDialog(true);
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '16px',
                marginRight: '12px'
              }}
            >
              <SquarePen size={16} />
              Edit Webinar
            </button>

            <button
              className="delete-btn"
              onClick={() => setShowDeleteDialog(true)}

              style={{

                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '10px',
                borderRadius: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '16px'
              }}
            >
              <Trash2 size={16} />
              {/* Delete Webinar */}
            </button>
          </div>


          {/* Buttons Section */}
          <div className="admin-buttons">
            <button className="submit1-btn" onClick={() => setActiveView('registration')}>Webinar Registration Details</button>
            <button className="submit1-btn" onClick={() => setActiveView('feedback')}>Webinar Feedback Details</button>
            <button className="submit1-btn" onClick={() => setActiveView('uploads')}>Webinar Uploads</button>
          </div>

          {/* Content Area */}
          <div className="content-area">
            {renderContent()}
          </div>

          <p className="form-footer">Designed with 💜 for Alumni Network</p>
        </div>
      </div>

      <ConfirmationDialog
        message="Are you sure you want to delete this webinar? This action cannot be undone."
        onConfirm={handleDeleteWebinar}
        onCancel={() => setShowDeleteDialog(false)}
        isOpen={showDeleteDialog}
      />

      {popup && (
        <Popup
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup(null)}
        />
      )}

      {/* Edit Webinar Dialog */}
      {showEditDialog && webinar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh] p-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowEditDialog(false)}
                className="text-purple-900 hover:text-purple-800 text-2xl font-bold"
              >
                X
              </button>
            </div>

            <h2 className="form-title mb-4">Edit Webinar</h2>

            <div className="form-card">
              <div
                className="form-fields"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
              >
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Topic</label>
                  <input
                    className="input-field"
                    value={editForm.topic}
                    onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 1' }}>
                  <label>Domain</label>
                  <input
                    className="input-field"
                    value={editForm.domain}
                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={editForm.webinarDate}
                    onChange={(e) => setEditForm({ ...editForm, webinarDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    className="input-field"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Venue</label>
                  <input
                    className="input-field"
                    value={editForm.venue}
                    onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Meeting Link</label>
                  <input
                    className="input-field"
                    value={editForm.meetingLink}
                    onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Alumni City</label>
                  <input
                    className="input-field"
                    value={editForm.alumniCity}
                    onChange={(e) => setEditForm({ ...editForm, alumniCity: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '6px' }}>
                  <h3 style={{ fontWeight: 800, color: '#4b3f91' }}>Speaker Details</h3>
                </div>

                <div className="form-group">
                  <label>Speaker Name</label>
                  <input
                    className="input-field"
                    value={editForm.speaker.name}
                    onChange={(e) => setEditForm({ ...editForm, speaker: { ...editForm.speaker, name: e.target.value } })}
                  />
                </div>

                <div className="form-group">
                  <label>Speaker Email</label>
                  <input
                    className="input-field"
                    value={editForm.speaker.email}
                    onChange={(e) => setEditForm({ ...editForm, speaker: { ...editForm.speaker, email: e.target.value } })}
                  />
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <input
                    className="input-field"
                    value={editForm.speaker.designation}
                    onChange={(e) => setEditForm({ ...editForm, speaker: { ...editForm.speaker, designation: e.target.value } })}
                  />
                </div>

                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    className="input-field"
                    value={editForm.speaker.companyName}
                    onChange={(e) => setEditForm({ ...editForm, speaker: { ...editForm.speaker, companyName: e.target.value } })}
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    className="input-field"
                    value={editForm.speaker.department}
                    onChange={(e) => setEditForm({ ...editForm, speaker: { ...editForm.speaker, department: e.target.value } })}
                  />
                </div>

                <div className="form-group">
                  <label>Batch</label>
                  <input
                    className="input-field"
                    value={editForm.speaker.batch}
                    onChange={(e) => setEditForm({ ...editForm, speaker: { ...editForm.speaker, batch: e.target.value } })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    className="submit1-btn"
                    style={{ backgroundColor: '#4b3f91', color: 'white', opacity: savingEdit ? 0.7 : 1 }}
                    onClick={async () => {
                      try {
                        setSavingEdit(true);
                        if (!webinar?._id) {
                          setPopup({ message: 'Webinar id missing.', type: 'error' });
                          return;
                        }

                        const payload = {
                          topic: editForm.topic,
                          domain: editForm.domain,
                          webinarDate: editForm.webinarDate,
                          time: editForm.time,
                          venue: editForm.venue,
                          meetingLink: editForm.meetingLink,
                          alumniCity: editForm.alumniCity,
                          speaker: {
                            name: editForm.speaker.name,
                            email: editForm.speaker.email,
                            designation: editForm.speaker.designation,
                            companyName: editForm.speaker.companyName,
                            department: editForm.speaker.department,
                            batch: editForm.speaker.batch,
                          }
                        };

                        console.log('PUT /api/webinars/:id/main payload:', payload);

                        const res = await fetch(`${API_BASE_URL}/api/webinars/${webinar._id}/main`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload)
                        });

                        const data = await res.json().catch(() => ({}));

                        if (!res.ok) {
                          setPopup({ message: data?.error || 'Failed to save changes', type: 'error' });
                          return;
                        }

                        setPopup({ message: 'Webinar updated successfully!', type: 'success' });
                        // Update local webinar state so UI reflects changes
                        setWebinar(data?.data || webinar);
                        setShowEditDialog(false);
                      } catch (e) {
                        console.error('Save webinar error:', e);
                        setPopup({ message: 'Failed to save changes', type: 'error' });
                      } finally {
                        setSavingEdit(false);
                      }
                    }}
                    disabled={savingEdit}
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>


                <button
                  className="submit1-btn"
                  style={{ backgroundColor: '#9ca3af', color: 'white' }}
                  onClick={() => setShowEditDialog(false)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}