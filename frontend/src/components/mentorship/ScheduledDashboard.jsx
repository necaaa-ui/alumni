// -----------------------------------------------------------
// SCHEDULED DASHBOARD — THEMED VERSION
// Updated to match the provided theme design system
// -----------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './ScheduledDashboard.css';

export default function ScheduledDashboard() {
  const [meetings, setMeetings] = useState([]);
  const [submittedMentees, setSubmittedMentees] = useState({});
  const [statusesMap, setStatusesMap] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [userRole, setUserRole] = useState(''); // Added userRole state
  const [editModalOpen, setEditModalOpen] = useState(false); // Edit modal state
  const [selectedMeeting, setSelectedMeeting] = useState(null); // Selected meeting for editing
  const [editFormData, setEditFormData] = useState({}); // Form data for editing
  const [mentorMeetings, setMentorMeetings] = useState([]); // All meetings for mentor dropdown

  const navigate = useNavigate();
  const { email } = useParams();

  useEffect(() => {
    // Get user role from localStorage
    const storedRole = localStorage.getItem('userRole') || '';
    setUserRole(storedRole);
    
    if (email) {
      fetchScheduledData(email);
      preloadStatuses();
      preloadApprovalStatuses();
      
      // If user is mentor, fetch all their meetings for the dropdown
      if (storedRole.toLowerCase() === 'mentor') {
        fetchAllMeetingsForMentor(email);
      }
    }
  }, [email]);

  // Fetch all meetings for mentor (for dropdown selection) - SIMPLIFIED VERSION
  const fetchAllMeetingsForMentor = async (mentorEmail) => {
    try {
      // Get mentor details including their ID
      const mentorRes = await axios.get(`http://localhost:5000/api/meetings/mentor-details?email=${encodeURIComponent(mentorEmail)}`);
      
      if (!mentorRes.data.mentor?._id) {
        console.log("No mentor ID found");
        return;
      }
      
      const mentorId = mentorRes.data.mentor._id;
      
      // Fetch all meetings for this mentor
      const meetingsRes = await axios.get(`http://localhost:5000/api/meetings/scheduled/${encodeURIComponent(mentorEmail)}`);
      
      if (meetingsRes.data?.meetings?.length > 0) {
        // Flatten the meetings array to get individual date entries
        const flattenedMeetings = meetingsRes.data.meetings.flatMap(meeting => 
          (meeting.dates || []).map(dateEntry => ({
            meeting_id: dateEntry.meeting_id || dateEntry._id,
            date: dateEntry.date,
            time: meeting.time,
            duration_minutes: meeting.duration_minutes || meeting.duration || 60,
            platform: meeting.platform,
            meeting_link: meeting.meeting_link,
            agenda: meeting.agenda,
            mentees: meeting.mentees || []
          }))
        );
        
        // Filter out entries without meeting_id
        const validMeetings = flattenedMeetings.filter(m => m.meeting_id);
        setMentorMeetings(validMeetings);
        
        console.log("Fetched mentor meetings:", validMeetings.length);
      } else {
        console.log("No meetings found for mentor");
        setMentorMeetings([]);
      }
    } catch (err) {
      console.error("Failed to fetch mentor meetings:", err);
      // Fallback: Try to get meetings from the current meetings state
      if (meetings.length > 0) {
        const mentorUserMeetings = meetings.filter(m => 
          m.mentor.email.toLowerCase() === email.toLowerCase()
        );
        
        const flattened = mentorUserMeetings.map(m => ({
          meeting_id: m.meetingId,
          date: m.date,
          time: m.time,
          duration_minutes: parseInt(m.duration) || 60,
          platform: m.platform,
          meeting_link: m.meeting_link,
          agenda: m.agenda,
          mentees: m.mentees
        }));
        
        setMentorMeetings(flattened);
        console.log("Using fallback meetings:", flattened.length);
      } else {
        setMentorMeetings([]);
      }
    }
  };

  const fetchScheduledData = async (userEmail) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/meetings/scheduled/${encodeURIComponent(userEmail)}`
      );
      const data = res.data;

      if (!data?.meetings?.length) {
        setMeetings([]);
        return;
      }

      const normalized = data.meetings.flatMap((meeting) => {
        const mentorObj = meeting.mentor || { _id: null, name: "Mentor", email: "-" };

        const menteeList = (meeting.mentees || []).map((mt) => ({
          _id: mt._id || null,
          name: mt.name || mt.basic?.name || "Mentee",
          email: mt.email || mt.basic?.email_id || "-"
        }));

        return (meeting.dates || []).map((d) => ({
          mentor: { _id: mentorObj._id, name: mentorObj.name, email: mentorObj.email },
          mentees: Array.from(new Map(menteeList.map((mt) => [mt._id || mt.email, mt])).values()),
          date: d?.date ? new Date(d.date).toISOString() : null,
          meetingId: String(d?.meeting_id || d?._id || `${meeting._id}_${Date.now()}`),
          time: meeting.time || "",
          duration: meeting.duration_minutes || meeting.duration || "60",
          platform: meeting.platform || "-",
          meeting_link: meeting.meeting_link || "",
          agenda: meeting.agenda || "-"
        }));
      });

      setMeetings(normalized);
    } catch (err) {
      console.error("Failed to fetch scheduled data", err);
      setMeetings([]);
    }
  };

  const preloadStatuses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/meeting-status/all");
      const statuses = res.data.statuses || [];

      const map = {};
      statuses.forEach((s) => {
        const mId = String(s.meeting_id);
        const menteeId = String(s.mentee_user_id);
        if (!map[mId]) map[mId] = [];
        map[mId].push(menteeId);
      });

      setSubmittedMentees(map);
    } catch (err) {
      console.error("Failed to preload statuses", err);
    }
  };

  const preloadApprovalStatuses = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/meeting-status/all");
      const statuses = res.data.statuses || [];

      const map = {};
      statuses.forEach((s) => {
        const mId = String(s.meeting_id);
        if (!map[mId]) map[mId] = [];
        map[mId].push(s);
      });

      setStatusesMap(map);
    } catch (err) {
      console.error("Failed to preload approval statuses", err);
    }
  };

  const parseDateTime = (dateStr, timeStr) => {
    if (!dateStr) return { dateFormatted: "-", timeFormatted: "-" };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { dateFormatted: "-", timeFormatted: "-" };

    return {
      dateFormatted: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      timeFormatted: timeStr
        ? new Date(`1970-01-01T${timeStr}`).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          })
        : "-"
    };
  };

  // Check if user is mentor
  const isMentor = () => {
    return userRole.toLowerCase() === 'mentor';
  };

  // Handle Edit button click
  const handleEditButtonClick = () => {
    // First try to fetch meetings if array is empty
    if (mentorMeetings.length === 0 && email && isMentor()) {
      fetchAllMeetingsForMentor(email);
    }
    
    setEditModalOpen(true);
    
    // Pre-select the first meeting if available
    if (mentorMeetings.length > 0 && !selectedMeeting) {
      const firstMeeting = mentorMeetings[0];
      setSelectedMeeting(firstMeeting);
      setEditFormData({
        meeting_date: firstMeeting.date ? new Date(firstMeeting.date).toISOString().split('T')[0] : "",
        meeting_time: firstMeeting.time || ""
      });
    }
  };

  // Handle meeting selection from dropdown
  const handleMeetingSelect = (e) => {
    const meetingId = e.target.value;
    if (!meetingId) {
      setSelectedMeeting(null);
      setEditFormData({});
      return;
    }
    
    const meeting = mentorMeetings.find(m => String(m.meeting_id) === String(meetingId));
    if (meeting) {
      setSelectedMeeting(meeting);
      setEditFormData({
        meeting_date: meeting.date ? new Date(meeting.date).toISOString().split('T')[0] : "",
        meeting_time: meeting.time || ""
      });
    }
  };

  // Handle form input changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit updated meeting data - SIMPLIFIED (only date and time)
  const handleEditSubmit = async () => {
    if (!selectedMeeting || !selectedMeeting.meeting_id) {
      alert('Please select a meeting to edit');
      return;
    }

    try {
      const meetingId = selectedMeeting.meeting_id;
      console.log('Updating meeting date/time:', meetingId, editFormData);
      
      // Send only date and time
      const updateData = {
        meeting_date: editFormData.meeting_date,
        meeting_time: editFormData.meeting_time
      };
      
      await axios.put(`http://localhost:5000/api/meetings/meeting/${meetingId}`, updateData);
      
      alert('Meeting date/time updated successfully!');
      setEditModalOpen(false);
      
      // Refresh data
      if (email) {
        fetchScheduledData(email);
        fetchAllMeetingsForMentor(email);
      }
    } catch (error) {
      console.error('Failed to update meeting:', error);
      alert('Failed to update meeting: ' + (error.response?.data?.message || error.message));
    }
  };

  const goToUpdate = (mentor, dateStr, meetingTime, mentees, meetingId) => {
    if (!mentor?._id) return alert("Invalid mentor");
    if (!meetingId) return alert("Meeting ID missing");

    const menteeEmail = mentees?.[0]?.email;
    if (!menteeEmail) return alert("Invalid mentee");

    const dateObj = new Date(dateStr);
    if (meetingTime) {
      const [h, m] = meetingTime.split(":");
      dateObj.setHours(h, m);
    }

    navigate(
      `/meeting_updatation?mentorId=${encodeURIComponent(mentor._id)}` +
        `&mentorEmail=${encodeURIComponent(mentor.email)}` +
        `&menteeEmail=${encodeURIComponent(menteeEmail)}` +
        `&scheduledDate=${encodeURIComponent(dateObj.toISOString())}` +
        `&meetingTime=${encodeURIComponent(meetingTime || "")}` +
        `&meetingId=${encodeURIComponent(meetingId)}`
    );
  };

  const handleMinutesAction = async (statusId, action) => {
    try {
      setActionLoadingId(statusId);
      await axios.post("http://localhost:5000/api/meeting-status/approve-reject", {
        statusId,
        action
      });

      alert(`Minutes ${action} successfully`);
      preloadStatuses();
      preloadApprovalStatuses();
    } catch (err) {
      console.error("Minutes update failed", err);
      alert("Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    const meetingStatuses = statusesMap[m.meetingId] || [];
    let overallStatus = "Pending";

    if (meetingStatuses.some(s => s.status === "Completed")) overallStatus = "Completed";
    else if (meetingStatuses.some(s => s.status === "Postponed")) overallStatus = "Postponed";
    else if (meetingStatuses.some(s => s.status === "Cancelled")) overallStatus = "Cancelled";

    const statusMatch = statusFilter === 'All' || overallStatus === statusFilter;
    const dateMatch = dateFilter === 'All' || (m.date && m.date.startsWith(dateFilter));

    return statusMatch && dateMatch;
  });

  const uniqueDates = Array.from(
    new Set(meetings.map((m) => m.date?.slice(0, 10)).filter(Boolean))
  );

  return (
    <div className="dashboard-wrapper">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Home Button */}
      <button className="home-button" onClick={() => navigate("/dashboard")}>
        <span className="tab-icon">🏠</span>
        <span className="tab-text">Dashboard</span>
      </button>

      {/* EDIT BUTTON - Only visible to mentors */}
      {isMentor() && (
        <button 
          className="edit-meeting-button" 
          onClick={handleEditButtonClick}
          title="Edit Meeting Date and Time"
        >
          <span className="edit-icon">✏️</span>
          <span className="edit-text">Edit Meeting</span>
        </button>
      )}

      {/* Edit Meeting Modal - SIMPLIFIED (Only Date and Time) */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Meeting Date & Time</h2>
              <button className="modal-close" onClick={() => setEditModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Select Meeting:</label>
                <select 
                  className="meeting-select"
                  onChange={handleMeetingSelect}
                  value={selectedMeeting?.meeting_id || ""}
                >
                  <option value="">-- Select a meeting --</option>
                  {mentorMeetings.length === 0 ? (
                    <option value="" disabled>Loading meetings...</option>
                  ) : (
                    mentorMeetings.map((meeting, index) => {
                      const meetingDate = meeting.date ? new Date(meeting.date) : new Date();
                      const formattedDate = meetingDate.toLocaleDateString();
                      const menteeCount = meeting.mentees?.length || 0;
                      
                      return (
                        <option key={meeting.meeting_id || `meeting-${index}`} value={meeting.meeting_id}>
                          {formattedDate} at {meeting.time || "TBD"} 
                        </option>
                      );
                    })
                  )}
                </select>
                {mentorMeetings.length === 0 && (
                  <p className="no-meetings-text">No meetings found for this mentor. Schedule meetings first.</p>
                )}
              </div>

              {selectedMeeting && (
                <>
                  <div className="meeting-preview">
                    <h4>Current Meeting Details:</h4>
                    <p><strong>Current Date:</strong> {selectedMeeting.date ? new Date(selectedMeeting.date).toLocaleDateString() : "Not set"}</p>
                    <p><strong>Current Time:</strong> {selectedMeeting.time || "Not set"}</p>
               
                  </div>

                  <div className="form-group">
                    <label>New Date:</label>
                    <input
                      type="date"
                      name="meeting_date"
                      value={editFormData.meeting_date || ""}
                      onChange={handleEditFormChange}
                      className="edit-input"
                      min={new Date().toISOString().split('T')[0]} // Optional: restrict to future dates
                    />
                  </div>

                  <div className="form-group">
                    <label>New Time:</label>
                    <input
                      type="time"
                      name="meeting_time"
                      value={editFormData.meeting_time || ""}
                      onChange={handleEditFormChange}
                      className="edit-input"
                    />
                  </div>

                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => setEditModalOpen(false)}>
                      Cancel
                    </button>
                    <button className="save-btn" onClick={handleEditSubmit}>
                      Update Date & Time
                    </button>
                  </div>
                </>
              )}

              {!selectedMeeting && mentorMeetings.length > 0 && (
                <div className="select-meeting-prompt">
                  <p>Please select a meeting from the dropdown above to edit its date and time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-container">
        <h1>Scheduled Mentorship Dashboard</h1>

        {/* Filters */}
        <div className="filters">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="Completed">Completed</option>
            <option value="Postponed">Postponed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Pending">Pending</option>
          </select>

          <label>Date:</label>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="All">All</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {filteredMeetings.length === 0 ? (
          <div className="glass-card" style={{textAlign: 'center', padding: '40px'}}>
            <p>No scheduled meetings found for {email}</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {filteredMeetings.map((m) => {
              const { dateFormatted, timeFormatted } = parseDateTime(m.date, m.time);
              const mentorEmail = m.mentor.email;
              const isMentorUser = email?.toLowerCase() === mentorEmail?.toLowerCase();

              const meetingStatuses = statusesMap[m.meetingId] || [];

              let approvalBadge = null;
              const pendingStatus = meetingStatuses.find((s) => s.statusApproval === "Pending");
              const approvedStatus = meetingStatuses.find((s) => s.statusApproval === "Approved");
              const rejectedStatus = meetingStatuses.find((s) => s.statusApproval === "Rejected");

              if (pendingStatus) approvalBadge = pendingStatus.statusApproval;
              if (approvedStatus) approvalBadge = approvedStatus.statusApproval;
              if (rejectedStatus) approvalBadge = rejectedStatus.statusApproval;

              const targetMentee = isMentorUser
                ? m.mentees[0]
                : m.mentees.find((mt) => mt.email?.toLowerCase() === email?.toLowerCase());

              const isSubmitted =
                !isMentorUser && submittedMentees[m.meetingId]?.includes(targetMentee?._id);

             const isUpdateDisabled = approvalBadge === "Approved";

              const mentorMinutes = isMentorUser
                ? meetingStatuses.filter((s) => s.statusApproval !== "Rejected")
                : [];

              const menteeMinutes = !isMentorUser
                ? meetingStatuses.filter((s) => s.statusApproval === "Approved")
                : [];

              return (
                <div key={m.meetingId} className="mentor-card glass-card">
                  {approvalBadge && (
                    <div className={`approval-badge ${approvalBadge.toLowerCase()}`}>
                      {approvalBadge}
                    </div>
                  )}

                  <div className="mentor-header card-header">
                    <div className="mentor-avatar">
                      {m.mentor.name[0]}
                    </div>
                    <div className="mentor-info">
                      <h2>{m.mentor.name}</h2>
                      <p>{mentorEmail}</p>
                    </div>
                  </div>

                  <div className="mentees-container">
                    <h4>Mentees:</h4>
                    {m.mentees.map((mt) => (
                      <p key={mt._id || mt.email}>
                        {mt.name} ({mt.email})
                      </p>
                    ))}
                  </div>

                  <div className="meeting-block">
                    <p><strong>Date:</strong> {dateFormatted}</p>
                    <p><strong>Time:</strong> {timeFormatted}</p>
                    <p><strong>Duration:</strong> {m.duration} minutes</p>
                    <p><strong>Platform:</strong> {m.platform}</p>
                    <p><strong>Meeting Link:</strong> {m.meeting_link || "Not provided"}</p>
                    <p><strong>Agenda:</strong> {m.agenda}</p>

                    {targetMentee && (
                      <button
                        className="update-meeting-btn"
                        disabled={isUpdateDisabled}
                        title={isUpdateDisabled ? "Already submitted or approved" : ""}
                        onClick={() =>
                          goToUpdate(m.mentor, m.date, m.time, [targetMentee], m.meetingId)
                        }
                      >
                        Update Meeting
                      </button>
                    )}

                    {mentorMinutes.length > 0 && (
                      <div className="meeting-minutes-section">
                        {mentorMinutes.map((s) => (
                          <div key={s._id} className="minutes-card">
                            <p><strong>Status:</strong> <span className="status-indicator status-completed">{s.status}</span></p>
                            <p><strong>Minutes:</strong> {s.meeting_minutes}</p>

                            {isMentorUser && s.statusApproval === "Pending" && (
                              <div className="action-buttons">
                                <button
                                  className="approve-btn"
                                  disabled={actionLoadingId === s._id}
                                  onClick={() => handleMinutesAction(s._id, "Approved")}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  className="reject-btn"
                                  disabled={actionLoadingId === s._id}
                                  onClick={() => handleMinutesAction(s._id, "Rejected")}
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {menteeMinutes.length > 0 && (
                      <div className="meeting-minutes-section">
                        {menteeMinutes.map((s) => (
                          <div key={s._id} className="minutes-card">
                            <p><strong>Status:</strong> <span className="status-indicator status-completed">{s.status}</span></p>
                            <p><strong>Minutes:</strong> {s.meeting_minutes}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}