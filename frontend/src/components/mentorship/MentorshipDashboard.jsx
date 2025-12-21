// pages/MentorshipDashboard.js - WITH RESPONSIVE TOP NAVIGATION
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import './MentorshippDashboard1.css';

// Simple icon components
const PeopleIcon = () => <span className="md-icon">👨‍🏫</span>;
const SchoolIcon = () => <span className="md-icon">👨‍🎓</span>;
const AssignmentIcon = () => <span className="md-icon">🤝</span>;
const CalendarIcon = () => <span className="md-icon">📅</span>;
const FeedbackIcon = () => <span className="md-icon">💬</span>;
const ArrowBackIcon = () => <span className="md-icon">←</span>;
const FilterIcon = () => <span className="md-icon">🔍</span>;
const RefreshIcon = () => <span className="md-icon">🔄</span>;
const EmailIcon = () => <span className="md-icon">📧</span>;
const DateRangeIcon = () => <span className="md-icon">📅</span>;
const ClockIcon = () => <span className="md-icon">⏰</span>;
const StarIcon = () => <span className="md-icon">⭐</span>;
const OrganizationIcon = () => <span className="md-icon">🏢</span>;
const ProcessIcon = () => <span className="md-icon">🔄</span>;
const SupportIcon = () => <span className="md-icon">🤝</span>;
const CheckIcon = () => <span className="md-icon">✅</span>;
const MenuIcon = () => <span className="md-icon">☰</span>;
const CloseIcon = () => <span className="md-icon">✕</span>;

export default function MentorshipDashboard() {
  // Set default active tab to 'mentors' instead of 'dashboard'
  const [activeTab, setActiveTab] = useState('mentors');
  const [stats, setStats] = useState({
    totalMentees: 0,
    totalMentors: 0,
    newMenteesThisWeek: 0,
    newMentorsThisWeek: 0,
    phaseStats: []
  });
  const [mentors, setMentors] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [meetingStats, setMeetingStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  });
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meetingFilters, setMeetingFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all'
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // NEW: Filters for mentors and mentees
  const [mentorFilters, setMentorFilters] = useState({
    search: '',
    phase: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  const [menteeFilters, setMenteeFilters] = useState({
    search: '',
    phase: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [filteredMentors, setFilteredMentors] = useState([]);
  const [filteredMentees, setFilteredMentees] = useState([]);
  
  const navigate = useNavigate();

  // Fetch dashboard statistics - keeping for stats display in sidebar if needed
  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/dashboard/stats");
      if (res.data.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  // Fetch all mentors
  const fetchMentors = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/dashboard/mentors");
      console.log("Mentors API Response:", res.data);
      if (res.data.success) {
        const mentorsData = res.data.mentors || [];
        setMentors(mentorsData);
        applyMentorFilters(mentorsData, mentorFilters);
      }
    } catch (err) {
      console.error("Error fetching mentors:", err);
      setMentors([]);
      setFilteredMentors([]);
    }
  };

  // Fetch all mentees
  const fetchMentees = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/dashboard/mentees");
      if (res.data.success) {
        const menteesData = res.data.mentees || [];
        setMentees(menteesData);
        applyMenteeFilters(menteesData, menteeFilters);
      }
    } catch (err) {
      console.error("Error fetching mentees:", err);
      setMentees([]);
      setFilteredMentees([]);
    }
  };

  // Fetch assignments
  const fetchAssignments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/dashboard/assignments");
      if (res.data.success) {
        setAssignments(res.data.assignments || []);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setAssignments([]);
    }
  };

  // Fetch meetings with filters
  const fetchMeetings = async () => {
    try {
      const params = {};
      if (meetingFilters.dateFrom) params.dateFrom = meetingFilters.dateFrom;
      if (meetingFilters.dateTo) params.dateTo = meetingFilters.dateTo;
      if (meetingFilters.status !== 'all') params.status = meetingFilters.status;
      
      const res = await axios.get("http://localhost:5000/api/dashboard/meetings", { params });
      if (res.data.success) {
        setMeetings(res.data.meetings || []);
        // Use backend-provided stats
        if (res.data.stats) {
          setMeetingStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching meetings:", err);
      setMeetings([]);
      setMeetingStats({ total: 0, scheduled: 0, completed: 0, cancelled: 0 });
    }
  };

  // Fetch feedbacks
  const fetchFeedbacks = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/dashboard/feedbacks");
      if (res.data.success) {
        setFeedbacks(res.data.feedbacks || []);
      }
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
      setFeedbacks([]);
    }
  };

  // Apply mentor filters
  const applyMentorFilters = (mentorsData, filters) => {
    let filtered = [...mentorsData];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(mentor => {
        const name = (mentor.name || getNameFromEmail(mentor.email) || '').toLowerCase();
        const email = (mentor.email || '').toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower);
      });
    }
    
    // Phase filter
    if (filters.phase !== 'all') {
      filtered = filtered.filter(mentor => 
        mentor.phaseId === parseInt(filters.phase) || 
        mentor.phaseId?.toString() === filters.phase
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = (a.name || getNameFromEmail(a.email) || '').toLowerCase();
          bValue = (b.name || getNameFromEmail(b.email) || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'joined':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'phase':
          aValue = a.phaseId || 0;
          bValue = b.phaseId || 0;
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredMentors(filtered);
  };

  // Apply mentee filters
  const applyMenteeFilters = (menteesData, filters) => {
    let filtered = [...menteesData];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(mentee => {
        const email = (mentee.email || '').toLowerCase();
        return email.includes(searchLower);
      });
    }
    
    // Phase filter
    if (filters.phase !== 'all') {
      filtered = filtered.filter(mentee => 
        mentee.phaseId === parseInt(filters.phase) || 
        mentee.phaseId?.toString() === filters.phase
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'requested':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'phase':
          aValue = a.phaseId || 0;
          bValue = b.phaseId || 0;
          break;
        default:
          aValue = a.createdAt || 0;
          bValue = b.createdAt || 0;
      }
      
      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    setFilteredMentees(filtered);
  };

  // Handle mentor filter changes
  const handleMentorFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...mentorFilters,
      [name]: value
    };
    setMentorFilters(updatedFilters);
    applyMentorFilters(mentors, updatedFilters);
  };

  // Handle mentee filter changes
  const handleMenteeFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...menteeFilters,
      [name]: value
    };
    setMenteeFilters(updatedFilters);
    applyMenteeFilters(mentees, updatedFilters);
  };

  // Reset mentor filters
  const resetMentorFilters = () => {
    const resetFilters = {
      search: '',
      phase: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    };
    setMentorFilters(resetFilters);
    applyMentorFilters(mentors, resetFilters);
  };

  // Reset mentee filters
  const resetMenteeFilters = () => {
    const resetFilters = {
      search: '',
      phase: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    setMenteeFilters(resetFilters);
    applyMenteeFilters(mentees, resetFilters);
  };

  // Load data based on active tab
  useEffect(() => {
    setLoading(true);
    
    // Fetch dashboard stats initially for sidebar counts
    fetchDashboardStats();
    
    // Load specific data based on active tab
    switch (activeTab) {
      case 'mentors':
        fetchMentors();
        break;
      case 'mentees':
        fetchMentees();
        break;
      case 'assignments':
        fetchAssignments();
        break;
      case 'meetings':
        fetchMeetings();
        break;
      case 'feedback':
        fetchFeedbacks();
        break;
    }
    
    setTimeout(() => setLoading(false), 500);
  }, [activeTab]);

  // Refresh current tab
  const handleRefresh = () => {
    switch (activeTab) {
      case 'mentors':
        fetchMentors();
        break;
      case 'mentees':
        fetchMentees();
        break;
      case 'assignments':
        fetchAssignments();
        break;
      case 'meetings':
        fetchMeetings();
        break;
      case 'feedback':
        fetchFeedbacks();
        break;
    }
  };

  // Handle meeting filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setMeetingFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply meeting filters
  const applyMeetingFilters = () => {
    fetchMeetings();
  };

  // Reset meeting filters
  const resetMeetingFilters = () => {
    setMeetingFilters({
      dateFrom: '',
      dateTo: '',
      status: 'all'
    });
    setTimeout(() => fetchMeetings(), 100);
  };

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Handle navigation click (for mobile)
  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format date with time
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      if (timeString) {
        return `${dateStr} at ${formatTime(timeString)}`;
      }
      return dateStr;
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '';
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  // Handle back to home
  const handleBackToHome = () => {
    navigate("/dashboard");
  };

  // Extract name from email
  const getNameFromEmail = (email) => {
    if (!email || email === 'N/A') return 'User';
    const namePart = email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  // Get date status
  const getDateStatus = (dateObj) => {
    // First check if dateObj has its own status
    if (dateObj.status) {
      return dateObj.status.toLowerCase();
    }
    
    // Fallback: determine status based on date
    if (!dateObj.date) return 'scheduled';
    const date = new Date(dateObj.date);
    const now = new Date();
    if (date < now) return 'completed';
    return 'scheduled';
  };

  // Get date status badge class
  const getDateStatusClass = (status) => {
    const statusLower = status.toLowerCase();
    switch(statusLower) {
      case 'completed': return 'md-date-status-badge md-completed';
      case 'scheduled': return 'md-date-status-badge md-scheduled';
      case 'cancelled': return 'md-date-status-badge md-cancelled';
      case 'postponed': return 'md-date-status-badge md-postponed';
      case 'ongoing': return 'md-date-status-badge md-ongoing';
      default: return 'md-date-status-badge md-scheduled';
    }
  };

  // Get rating stars
  const getRatingStars = (rating) => {
    if (!rating || isNaN(rating)) return 'N/A';
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  // Get rating color
  const getRatingColor = (rating) => {
    if (!rating || isNaN(rating)) return '#999';
    if (rating >= 4) return '#4CAF50'; // Green
    if (rating >= 3) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Get unique phases from data
  const getUniquePhases = (data) => {
    const phases = new Set();
    data.forEach(item => {
      if (item.phaseId) {
        phases.add(item.phaseId.toString());
      }
    });
    return Array.from(phases).sort();
  };

  // Render loading state
  if (loading && activeTab === 'mentors') {
    return (
      <div className="md-dashboard-wrapper">
        <div className="md-loading-container">
          <div className="md-spinner"></div>
          <p>Loading mentors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md-dashboard-wrapper">
      {/* Animated Background */}
      <div className="md-animated-bg">
        <div className="md-gradient-orb md-orb-1"></div>
        <div className="md-gradient-orb md-orb-2"></div>
        <div className="md-gradient-orb md-orb-3"></div>
      </div>

      {/* Header */}
      <div className="md-dashboard-header">
        <button className="md-back-button" onClick={handleBackToHome}>
          <ArrowBackIcon />
          <span>Back to Home</span>
        </button>
        
        <div className="md-header-title">
          <h1>Mentorship Program Dashboard</h1>
          <p>View mentors, mentees, meetings, and feedback</p>
        </div>
        
        <div className="md-header-actions">
          <button className="md-refresh-button" onClick={handleRefresh}>
            <RefreshIcon />
          </button>
          <button className="md-mobile-menu-btn" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Top Navigation Bar - RESPONSIVE */}
      <div className={`md-top-navigation ${mobileMenuOpen ? 'md-mobile-open' : ''}`}>
        <div className="md-top-nav-menu">
          <button 
            className={`md-top-nav-item ${activeTab === 'mentors' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('mentors')}
          >
            <PeopleIcon />
            <span className="md-nav-text">Mentors</span>
            <span className="md-count-badge">{stats.totalMentors}</span>
          </button>
          
          <button 
            className={`md-top-nav-item ${activeTab === 'mentees' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('mentees')}
          >
            <SchoolIcon />
            <span className="md-nav-text">Mentees</span>
            <span className="md-count-badge">{stats.totalMentees}</span>
          </button>
          
          <button 
            className={`md-top-nav-item ${activeTab === 'assignments' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('assignments')}
          >
            <AssignmentIcon />
            <span className="md-nav-text">Assignments</span>
          </button>
          
          <button 
            className={`md-top-nav-item ${activeTab === 'meetings' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('meetings')}
          >
            <CalendarIcon />
            <span className="md-nav-text">Meetings</span>
            <span className="md-count-badge">{meetingStats.total}</span>
          </button>
          
          <button 
            className={`md-top-nav-item ${activeTab === 'feedback' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('feedback')}
          >
            <FeedbackIcon />
            <span className="md-nav-text">Feedback</span>
          </button>
        </div>
      </div>

      {/* Main Content - FULL WIDTH NOW */}
      <div className="md-main-content-full">
        {loading ? (
          <div className="md-loading-container">
            <div className="md-spinner"></div>
            <p>Loading {activeTab} data...</p>
          </div>
        ) : (
          <>
            {/* MENTORS TAB - WITH FILTERS */}
            {activeTab === 'mentors' && (
              <div className="md-mentors-tab">
                <div className="md-section-header-with-filters">
                  <h2 className="md-section-title">All Mentors ({filteredMentors.length})</h2>
                  
                  {/* Mentor Filters */}
                  <div className="md-filters-container md-glass-card">
                    <div className="md-filter-row">
                      <div className="md-filter-group">
                        <label>Search</label>
                        <input
                          type="text"
                          name="search"
                          placeholder="Search by name or email..."
                          value={mentorFilters.search}
                          onChange={handleMentorFilterChange}
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Phase</label>
                        <select
                          name="phase"
                          value={mentorFilters.phase}
                          onChange={handleMentorFilterChange}
                        >
                          <option value="all">All Phases</option>
                          {getUniquePhases(mentors).map(phase => (
                            <option key={phase} value={phase}>Phase {phase}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Sort By</label>
                        <select
                          name="sortBy"
                          value={mentorFilters.sortBy}
                          onChange={handleMentorFilterChange}
                        >
                          <option value="name">Name</option>
                          <option value="email">Email</option>
                          <option value="phase">Phase</option>
                          <option value="joined">Join Date</option>
                        </select>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Order</label>
                        <select
                          name="sortOrder"
                          value={mentorFilters.sortOrder}
                          onChange={handleMentorFilterChange}
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                      
                      <div className="md-filter-actions">
                        <button 
                          className="md-apply-btn"
                          onClick={() => applyMentorFilters(mentors, mentorFilters)}
                        >
                          <FilterIcon /> Apply
                        </button>
                        <button 
                          className="md-reset-btn"
                          onClick={resetMentorFilters}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {filteredMentors.length === 0 ? (
                  <div className="md-empty-state md-glass-card">
                    <p>No mentors found with current filters</p>
                  </div>
                ) : (
                  <div className="md-data-table md-glass-card">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phase</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMentors.map((mentor) => {
                          // Handle missing data
                          const displayName = mentor.name && mentor.name !== 'N/A' 
                            ? mentor.name 
                            : mentor.email && mentor.email !== 'N/A'
                              ? getNameFromEmail(mentor.email)
                              : 'Unknown Mentor';
                          
                          const displayEmail = mentor.email && mentor.email !== 'N/A' 
                            ? mentor.email 
                            : 'No email';
                          
                          const displayPhase = mentor.phaseId && mentor.phaseId !== 'N/A'
                            ? `Phase ${mentor.phaseId}`
                            : 'N/A';

                          return (
                            <tr key={mentor._id}>
                              <td className="md-id-cell">
                                M{(mentor._id?.toString() || '').slice(-6)}
                              </td>
                              <td>
                                <div className="md-user-cell">
                                  <div className="md-avatar-small md-mentor-avatar">👨‍🏫</div>
                                  <span>{displayName}</span>
                                </div>
                              </td>
                              <td>
                                <div className="md-email-cell">
                                  <EmailIcon />
                                  <span title={displayEmail}>{displayEmail}</span>
                                </div>
                              </td>
                              <td>
                                <span className="md-phase-badge">{displayPhase}</span>
                              </td>
                              <td>{formatDate(mentor.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* MENTEES TAB - WITH FILTERS */}
            {activeTab === 'mentees' && (
              <div className="md-mentees-tab">
                <div className="md-section-header-with-filters">
                  <h2 className="md-section-title">All Mentees ({filteredMentees.length})</h2>
                  
                  {/* Mentee Filters */}
                  <div className="md-filters-container md-glass-card">
                    <div className="md-filter-row">
                      <div className="md-filter-group">
                        <label>Search</label>
                        <input
                          type="text"
                          name="search"
                          placeholder="Search by email..."
                          value={menteeFilters.search}
                          onChange={handleMenteeFilterChange}
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Phase</label>
                        <select
                          name="phase"
                          value={menteeFilters.phase}
                          onChange={handleMenteeFilterChange}
                        >
                          <option value="all">All Phases</option>
                          {getUniquePhases(mentees).map(phase => (
                            <option key={phase} value={phase}>Phase {phase}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Sort By</label>
                        <select
                          name="sortBy"
                          value={menteeFilters.sortBy}
                          onChange={handleMenteeFilterChange}
                        >
                          <option value="email">Email</option>
                          <option value="phase">Phase</option>
                          <option value="requested">Request Date</option>
                        </select>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Order</label>
                        <select
                          name="sortOrder"
                          value={menteeFilters.sortOrder}
                          onChange={handleMenteeFilterChange}
                        >
                          <option value="desc">Newest First</option>
                          <option value="asc">Oldest First</option>
                        </select>
                      </div>
                      
                      <div className="md-filter-actions">
                        <button 
                          className="md-apply-btn"
                          onClick={() => applyMenteeFilters(mentees, menteeFilters)}
                        >
                          <FilterIcon /> Apply
                        </button>
                        <button 
                          className="md-reset-btn"
                          onClick={resetMenteeFilters}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {filteredMentees.length === 0 ? (
                  <div className="md-empty-state md-glass-card">
                    <p>No mentees found with current filters</p>
                  </div>
                ) : (
                  <div className="md-data-table md-glass-card">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Email</th>
                          <th>Phase</th>
                          <th>Requested</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMentees.map((mentee) => {
                          const displayEmail = mentee.email && mentee.email !== 'N/A' 
                            ? mentee.email 
                            : 'No email';
                          
                          const displayPhase = mentee.phaseId && mentee.phaseId !== 'N/A'
                            ? `Phase ${mentee.phaseId}`
                            : 'N/A';

                          return (
                            <tr key={mentee._id}>
                              <td className="md-id-cell">
                                MT{(mentee._id?.toString() || '').slice(-6)}
                              </td>
                              <td>
                                <div className="md-email-cell">
                                  <EmailIcon />
                                  <span title={displayEmail}>{displayEmail}</span>
                                </div>
                              </td>
                              <td>
                                <span className="md-phase-badge">{displayPhase}</span>
                              </td>
                              <td>{formatDate(mentee.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ASSIGNMENTS TAB - SIMPLIFIED VIEW */}
            {activeTab === 'assignments' && (
              <div className="md-assignments-tab">
                <h2 className="md-section-title">Mentor-Mentee Assignments ({assignments.length})</h2>
                {assignments.length === 0 ? (
                  <div className="md-empty-state md-glass-card">
                    <p>No assignments found</p>
                  </div>
                ) : (
                  <div className="md-assignments-grid">
                    {assignments.map((assignment) => (
                      <div key={assignment._id} className="md-assignment-card md-glass-card">
                        <div className="md-assignment-header">
                          <div className="md-mentor-info">
                            <div className="md-avatar md-mentor-avatar">👨‍🏫</div>
                            <div>
                              <h4>{assignment.mentorDetails?.name || 'Mentor'}</h4>
                              <p className="md-email">{assignment.mentorDetails?.email || 'No email'}</p>
                            </div>
                          </div>
                          <div className="md-mentee-count">
                            <span>{assignment.mentees?.length || 0}</span>
                            <small>mentees</small>
                          </div>
                        </div>
                        
                        <div className="md-assignment-mentees">
                          <h5>Assigned Mentees:</h5>
                          {assignment.mentees && assignment.mentees.length > 0 ? (
                            <div className="md-mentee-tags">
                              {assignment.mentees.map((mentee, idx) => (
                                <span key={idx} className="md-mentee-tag">
                                  <div className="md-avatar-small md-mentee-avatar">👨‍🎓</div>
                                  <span>{mentee.name || 'Mentee'}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="md-no-mentees">No mentees assigned</p>
                          )}
                        </div>
                        
                        <div className="md-assignment-footer">
                          <span>Assigned: {formatDate(assignment.createdAt)}</span>
                          {assignment.phaseId && (
                            <span className="md-phase-tag">Phase {assignment.phaseId}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MEETINGS TAB - SIMPLIFIED */}
            {activeTab === 'meetings' && (
              <div className="md-meetings-tab">
                <div className="md-meetings-header">
                  <div className="md-meetings-title-section">
                    <h2 className="md-section-title">Meetings Overview</h2>
                    
                    {/* SIMPLIFIED: Only show Total and Completed */}
                    <div className="md-meeting-stats-simple">
                      <div className="md-meeting-stat-card md-glass-card md-total">
                        <div className="md-stat-header">
                          <CalendarIcon />
                          <h4>Total Meetings</h4>
                        </div>
                        <div className="md-stat-value">{meetingStats.total}</div>
                      </div>
                      
                      <div className="md-meeting-stat-card md-glass-card md-completed">
                        <div className="md-stat-header">
                          <CheckIcon />
                          <h4>Completed</h4>
                        </div>
                        <div className="md-stat-value">{meetingStats.completed}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Filters */}
                  <div className="md-meeting-filters md-glass-card">
                    <div className="md-filter-row">
                      <div className="md-filter-group">
                        <label>From Date</label>
                        <input
                          type="date"
                          name="dateFrom"
                          value={meetingFilters.dateFrom}
                          onChange={handleFilterChange}
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>To Date</label>
                        <input
                          type="date"
                          name="dateTo"
                          value={meetingFilters.dateTo}
                          onChange={handleFilterChange}
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Status</label>
                        <select
                          name="status"
                          value={meetingFilters.status}
                          onChange={handleFilterChange}
                        >
                          <option value="all">All Status</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      
                      <div className="md-filter-actions">
                        <button 
                          className="md-apply-btn"
                          onClick={applyMeetingFilters}
                        >
                          <FilterIcon /> Apply
                        </button>
                        <button 
                          className="md-reset-btn"
                          onClick={resetMeetingFilters}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meetings Grid */}
                {meetings.length === 0 ? (
                  <div className="md-empty-state md-glass-card">
                    <p>No meetings found with current filters</p>
                  </div>
                ) : (
                  <div className="md-meetings-grid">
                    {meetings.map((meeting) => (
                      <div key={meeting._id} className="md-meeting-card md-glass-card">
                        <div className="md-meeting-header">
                          <div className="md-meeting-mentor">
                            <div className="md-avatar md-mentor-avatar">👨‍🏫</div>
                            <div>
                              <h4>{meeting.mentorDetails?.name || 'Mentor'}</h4>
                              <p className="md-email">{meeting.mentorDetails?.email || 'No email'}</p>
                            </div>
                          </div>
                          <div className="md-meeting-status-simple">
                            <CheckIcon />
                            <span className="md-completed-text">Completed: {meetingStats.completed}</span>
                          </div>
                        </div>
                        
                        <div className="md-meeting-details">
                          <div className="md-detail-row">
                            <div className="md-detail-item">
                              <ClockIcon />
                              <div>
                                <label>Time</label>
                                <span>{formatTime(meeting.meeting_time)}</span>
                              </div>
                            </div>
                            
                            <div className="md-detail-item">
                              <span className="md-icon">⏱️</span>
                              <div>
                                <label>Duration</label>
                                <span>{meeting.duration_minutes || 30} mins</span>
                              </div>
                            </div>

                            <div className="md-detail-item">
                              <span className="md-icon">📋</span>
                              <div>
                                <label>Total Sessions</label>
                                <span>{meeting.meeting_dates?.length || 0}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* ALL MEETING DATES SECTION */}
                          <div className="md-all-dates-section">
                            <div className="md-section-label">
                              <DateRangeIcon />
                              <span>Meeting Sessions ({meeting.meeting_dates?.length || 0})</span>
                            </div>
                            
                            <div className="md-dates-grid">
                              {meeting.meeting_dates && meeting.meeting_dates.length > 0 ? (
                                meeting.meeting_dates.map((dateObj, index) => {
                                  const dateStatus = getDateStatus(dateObj);
                                  const statusClass = getDateStatusClass(dateStatus);
                                  const statusText = dateStatus.toUpperCase();
                                  
                                  return (
                                    <div key={dateObj._id || index} className="md-date-card">
                                      <div className="md-date-card-content">
                                        <div className="md-date-status-container">
                                          <span className={`${statusClass}`}>
                                            {statusText}
                                          </span>
                                          <span className="md-date-index">Session #{index + 1}</span>
                                        </div>
                                        
                                        <div className="md-date-info-main">
                                          <div className="md-date-icon-time">
                                            <CalendarIcon />
                                            <div className="md-date-time-details">
                                              <span className="md-date-display">{formatDateTime(dateObj.date, meeting.meeting_time)}</span>
                                              <div className="md-date-meta">
                                                <span className="md-meeting-id">
                                                  ID: {dateObj.meeting_id?.slice(-6) || 'N/A'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {dateObj.notes && (
                                          <div className="md-date-notes">
                                            <span className="md-notes-icon">📝</span>
                                            <span className="md-notes-text">{dateObj.notes}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="md-no-dates">No meeting sessions scheduled</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="md-mentees-section">
                            <div className="md-section-label">
                              <SchoolIcon />
                              <span>Mentees ({meeting.mentees?.length || 0})</span>
                            </div>
                            <div className="md-mentee-list">
                              {meeting.mentees && meeting.mentees.length > 0 ? (
                                meeting.mentees.slice(0, 3).map((mentee, idx) => (
                                  <span key={idx} className="md-mentee-item">
                                    <div className="md-avatar-small md-mentee-avatar">👨‍🎓</div>
                                    {mentee.name || 'Mentee'}
                                  </span>
                                ))
                              ) : (
                                <span className="md-no-mentees">No mentees assigned</span>
                              )}
                              {meeting.mentees && meeting.mentees.length > 3 && (
                                <span className="md-more-mentees">+{meeting.mentees.length - 3} more</span>
                              )}
                            </div>
                          </div>
                          
                          {meeting.agenda && (
                            <div className="md-agenda-section">
                              <div className="md-section-label">
                                <span className="md-icon">📝</span>
                                <span>Agenda</span>
                              </div>
                              <p className="md-agenda-text">{meeting.agenda}</p>
                            </div>
                          )}
                          
                          {meeting.platform && (
                            <div className="md-platform-section">
                              <div className="md-section-label">
                                <span className="md-icon">💻</span>
                                <span>Platform</span>
                              </div>
                              <span className="md-platform-tag">{meeting.platform}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FEEDBACK TAB */}
            {activeTab === 'feedback' && (
              <div className="md-feedback-tab">
                <h2 className="md-section-title">Program Feedback ({feedbacks.length})</h2>
                {feedbacks.length === 0 ? (
                  <div className="md-empty-state md-glass-card">
                    <p>No feedback submissions yet</p>
                  </div>
                ) : (
                  <div className="md-feedback-grid">
                    {feedbacks.map((feedback) => (
                      <div key={feedback._id} className="md-feedback-card md-glass-card">
                        <div className="md-feedback-header">
                          <div className="md-user-info">
                            <div className="md-feedback-avatar">
                              {feedback.userDetails?.name?.charAt(0) || 
                               feedback.role?.charAt(0) || 
                               'U'}
                            </div>
                            <div>
                              <h4>{feedback.userDetails?.name || 'Anonymous User'}</h4>
                              <p className="md-role">{feedback.role || 'Not specified'}</p>
                            </div>
                          </div>
                          <span className="md-date">{formatDate(feedback.createdAt)}</span>
                        </div>
                        
                        {/* ALL RATING FIELDS */}
                        <div className="md-feedback-ratings-grid">
                          <div className="md-rating-item">
                            <div className="md-rating-label">
                              <StarIcon />
                              <span>Overall Satisfaction</span>
                            </div>
                            <div className="md-rating-display">
                              <span className="md-rating-stars">
                                {getRatingStars(feedback.overallSatisfaction)}
                              </span>
                              <span 
                                className="md-rating-value" 
                                style={{ color: getRatingColor(feedback.overallSatisfaction) }}
                              >
                                {feedback.overallSatisfaction || 'N/A'}/5
                              </span>
                            </div>
                          </div>
                          
                          <div className="md-rating-item">
                            <div className="md-rating-label">
                              <OrganizationIcon />
                              <span>Program Organization</span>
                            </div>
                            <div className="md-rating-display">
                              <span className="md-rating-stars">
                                {getRatingStars(feedback.programOrganization)}
                              </span>
                              <span 
                                className="md-rating-value" 
                                style={{ color: getRatingColor(feedback.programOrganization) }}
                              >
                                {feedback.programOrganization || 'N/A'}/5
                              </span>
                            </div>
                          </div>
                          
                          <div className="md-rating-item">
                            <div className="md-rating-label">
                              <ProcessIcon />
                              <span>Matching Process</span>
                            </div>
                            <div className="md-rating-display">
                              <span className="md-rating-stars">
                                {getRatingStars(feedback.matchingProcess)}
                              </span>
                              <span 
                                className="md-rating-value" 
                                style={{ color: getRatingColor(feedback.matchingProcess) }}
                              >
                                {feedback.matchingProcess || 'N/A'}/5
                              </span>
                            </div>
                          </div>
                          
                          <div className="md-rating-item">
                            <div className="md-rating-label">
                              <SupportIcon />
                              <span>Support Provided</span>
                            </div>
                            <div className="md-rating-display">
                              <span className="md-rating-stars">
                                {getRatingStars(feedback.supportProvided)}
                              </span>
                              <span 
                                className="md-rating-value" 
                                style={{ color: getRatingColor(feedback.supportProvided) }}
                              >
                                {feedback.supportProvided || 'N/A'}/5
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="md-feedback-sections">
                          {feedback.generalFeedback && (
                            <div className="md-feedback-section">
                              <div className="md-section-label">
                                <span className="md-icon">💬</span>
                                <span>General Feedback</span>
                              </div>
                              <p className="md-feedback-text">{feedback.generalFeedback}</p>
                            </div>
                          )}
                          
                          {feedback.suggestions && (
                            <div className="md-feedback-section">
                              <div className="md-section-label">
                                <span className="md-icon">💡</span>
                                <span>Suggestions for Improvement</span>
                              </div>
                              <p className="md-feedback-text">{feedback.suggestions}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="md-feedback-footer">
                          <div className="md-participation-status">
                            <span className="md-participation-label">Participate again:</span>
                            <strong className={`md-participation-value ${feedback.participateAgain === 'Yes' ? 'md-yes' : 'md-no'}`}>
                              {feedback.participateAgain || 'Not specified'}
                            </strong>
                          </div>
                          <div className="md-feedback-id">
                            <small>Feedback ID: {(feedback._id?.toString() || '').slice(-6)}</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}