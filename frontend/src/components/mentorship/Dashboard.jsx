import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MentorshipDashboard.css';

// Real-time update intervals (in milliseconds)
const REFRESH_INTERVALS = {
  STATS: 30000,      // 30 seconds
  MENTORS: 60000,    // 1 minute
  MENTEES: 60000,    // 1 minute
  MEETINGS: 30000,   // 30 seconds
  ASSIGNMENTS: 120000 // 2 minutes
};

export default function RealTimeDashboard() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchMentor, setSearchMentor] = useState('');
  const [activePhase, setActivePhase] = useState('');
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [currentMentorIndex, setCurrentMentorIndex] = useState(0);
  const [currentPhaseGraphIndex, setCurrentPhaseGraphIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState('mentee');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshIntervals, setRefreshIntervals] = useState(REFRESH_INTERVALS);
  
  // Real-time data states
  const [dashboardStats, setDashboardStats] = useState({
    totalMentors: 0,
    totalMentees: 0,
    newMentorsThisWeek: 0,
    newMenteesThisWeek: 0,
    totalMeetings: 0,
    upcomingMeetings: 0
  });
  
  const [mentorshipPhases, setMentorshipPhases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [mentorCapacityData, setMentorCapacityData] = useState([]);
  const [allMentors, setAllMentors] = useState([]);
  const [allMentees, setAllMentees] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState([]);

  // Real-time update timers
  const [timers, setTimers] = useState({});

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Get user info from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') || 'mentee';
    const storedEmail = localStorage.getItem('userEmail') || '';
    setUserRole(storedRole);
    setUserEmail(storedEmail);
  }, []);

  // Reset mentor index when search changes
  useEffect(() => {
    setCurrentMentorIndex(0);
  }, [searchMentor]);

  // Set active phase to first phase when phases are loaded
  useEffect(() => {
    if (mentorshipPhases.length > 0 && !activePhase) {
      setActivePhase(mentorshipPhases[0].id);
    }
  }, [mentorshipPhases, activePhase]);

  // Real-time data fetching functions
  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/stats');
      if (res.data.success) {
        setDashboardStats(res.data.stats);
        setLastUpdated(res.data.lastUpdated || new Date());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchAllMentors = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/mentors');
      if (res.data.success) {
        setAllMentors(res.data.mentors || []);
      }
    } catch (error) {
      console.error('Error fetching mentors:', error);
    }
  }, []);

  const fetchAllMentees = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/mentees');
      if (res.data.success) {
        setAllMentees(res.data.mentees || []);
      }
    } catch (error) {
      console.error('Error fetching mentees:', error);
    }
  }, []);

  const fetchAllAssignments = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/assignments');
      if (res.data.success) {
        setAllAssignments(res.data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  }, []);

  const fetchAllMeetings = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/meetings');
      if (res.data.success) {
        setAllMeetings(res.data.meetings || []);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  }, []);

  const fetchAllFeedbacks = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/feedbacks');
      if (res.data.success) {
        setAllFeedbacks(res.data.feedbacks || []);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    }
  }, []);

  // Setup real-time intervals
  useEffect(() => {
    // Initial fetch
    const initialFetch = async () => {
      setIsRefreshing(true);
      try {
        await Promise.all([
          fetchDashboardStats(),
          fetchAllMentors(),
          fetchAllMentees(),
          fetchAllAssignments(),
          fetchAllMeetings(),
          fetchAllFeedbacks()
        ]);
      } catch (error) {
        console.error('Initial fetch error:', error);
      } finally {
        setIsRefreshing(false);
        setLoading(false);
      }
    };

    initialFetch();

    // Set up real-time intervals
    const intervalStats = setInterval(fetchDashboardStats, refreshIntervals.STATS);
    const intervalMentors = setInterval(fetchAllMentors, refreshIntervals.MENTORS);
    const intervalMentees = setInterval(fetchAllMentees, refreshIntervals.MENTEES);
    const intervalAssignments = setInterval(fetchAllAssignments, refreshIntervals.ASSIGNMENTS);
    const intervalMeetings = setInterval(fetchAllMeetings, refreshIntervals.MEETINGS);

    setTimers({
      stats: intervalStats,
      mentors: intervalMentors,
      mentees: intervalMentees,
      assignments: intervalAssignments,
      meetings: intervalMeetings
    });

    // Cleanup intervals on unmount
    return () => {
      Object.values(timers).forEach(timer => clearInterval(timer));
    };
  }, []);

  // Calculate derived data from real-time data
  useEffect(() => {
    if (allMeetings.length > 0) {
      // Format sessions from meetings
      const formattedSessions = allMeetings.map((meeting, index) => {
        const firstDate = meeting.meeting_dates?.[0];
        return {
          id: meeting._id || `meeting-${index}`,
          mentorName: meeting.mentorDetails?.name || 'Mentor',
          menteeName: meeting.mentees?.[0]?.name || 'Mentee',
          date: firstDate?.date || meeting.createdAt,
          time: meeting.meeting_time || '10:00 AM',
          status: meeting.status?.toLowerCase() || 'scheduled',
          topic: meeting.agenda || 'Mentorship Session',
          phase: meeting.phaseId || 'phase_2024_h2',
          duration: meeting.duration_minutes ? `${meeting.duration_minutes} mins` : '60 mins',
          meetingType: meeting.platform || 'Virtual'
        };
      });
      setSessions(formattedSessions);
    }
  }, [allMeetings]);

  useEffect(() => {
    if (allAssignments.length > 0) {
      // Calculate mentor capacity from assignments
      const capacityMap = {};
      allAssignments.forEach(assignment => {
        const mentorId = assignment.mentor_user_id;
        if (!capacityMap[mentorId]) {
          capacityMap[mentorId] = {
            id: mentorId,
            name: assignment.mentorDetails?.name || 'Unknown Mentor',
            menteeCount: 0,
            maxCapacity: 3,
            mentees: [],
            sessionsCompleted: 0,
            sessionsUpcoming: 0
          };
        }
        capacityMap[mentorId].menteeCount += assignment.mentees?.length || 0;
        capacityMap[mentorId].mentees = [
          ...capacityMap[mentorId].mentees,
          ...(assignment.mentees?.map(m => m.name) || [])
        ];
      });
      
      setMentorCapacityData(Object.values(capacityMap));
    }
  }, [allAssignments]);

  useEffect(() => {
    if (dashboardStats.phaseStats && dashboardStats.phaseStats.length > 0) {
      const formattedPhases = dashboardStats.phaseStats.map((phase, index) => ({
        id: `phase_${phase.phaseId}`,
        phaseId: phase.phaseId,
        name: `Phase ${phase.phaseId}`,
        period: phase.startDate && phase.endDate 
          ? `${new Date(phase.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${new Date(phase.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
          : 'Not specified',
        status: index === dashboardStats.phaseStats.length - 1 ? 'active' : 'completed',
        totalMeetings: 0,
        completedMeetings: 0,
        postponedMeetings: 0,
        mentorsActive: phase.totalMentors || 0,
        menteesActive: phase.totalMentees || 0,
        newMentors: 0,
        newMentees: 0
      }));
      setMentorshipPhases(formattedPhases);
    }
  }, [dashboardStats]);

  // Calculate phase-wise mentor/mentee data for graph
  const getPhaseGraphData = useCallback(() => {
    if (!dashboardStats.phaseStats || dashboardStats.phaseStats.length === 0) {
      return {
        phases: ['Phase 1', 'Phase 2', 'Phase 3'],
        mentors: [0, 0, 0],
        mentees: [0, 0, 0]
      };
    }
    
    return {
      phases: dashboardStats.phaseStats.map(phase => phase.phaseName || `Phase ${phase.phaseId}`),
      mentors: dashboardStats.phaseStats.map(phase => phase.totalMentors || 0),
      mentees: dashboardStats.phaseStats.map(phase => phase.totalMentees || 0)
    };
  }, [dashboardStats.phaseStats]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchAllMentors(),
        fetchAllMentees(),
        fetchAllAssignments(),
        fetchAllMeetings(),
        fetchAllFeedbacks()
      ]);
    } catch (error) {
      console.error('Manual refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  // Check if user is coordinator
  const isCoordinator = () => {
    return userRole.toLowerCase() === 'coordinator' || userRole.toLowerCase() === 'admin';
  };

  // Handle Phase button click
  const handlePhaseButtonClick = () => {
    navigate('/admin_dashboard');
  };

  // Filter sessions for the carousel based on status only
  const filteredSessionsByStatus = sessions.filter(session => {
    return filterStatus === 'all' || session.status === filterStatus;
  });

  // Filter phases based on active phase filter
  const filteredPhases = activePhase ? mentorshipPhases.filter(phase => 
    phase.id === activePhase
  ) : [];

  // Filter mentor capacity data based on search
  const filteredMentorCapacity = mentorCapacityData.filter(mentor => 
    mentor.name.toLowerCase().includes(searchMentor.toLowerCase())
  );

  // Calculate real-time meeting statistics
  const calculateMeetingStats = () => {
    const completedMeetings = allMeetings.filter(m => 
      m.status === 'Completed' || m.status === 'completed'
    ).length;
    
    const upcomingMeetings = allMeetings.filter(m => 
      m.status === 'Scheduled' || m.status === 'scheduled' || m.status === 'upcoming'
    ).length;
    
    const postponedMeetings = allMeetings.filter(m => 
      m.status === 'Cancelled' || m.status === 'cancelled' || m.status === 'postponed'
    ).length;

    return { completedMeetings, upcomingMeetings, postponedMeetings };
  };

  const meetingStats = calculateMeetingStats();

  // Quick actions based on user role (UNCHANGED)
  const allQuickActions = [
    {
      id: 1,
      title: 'Register New Mentee',
      description: 'Add a new mentee to the program',
      icon: '👤',
      path: '/menteeregistration',
      color: '#3b82f6',
      roles: ['new_user']
    },
    {
      id: 2,
      title: 'Register New Mentor',
      description: 'Add a new mentor to the program',
      icon: '🎓',
      path: '/mentorregistration',
      color: '#8b5cf6',
      roles: ['new_user']
    },
    {
      id: 3,
      title: 'Assign Mentee to Mentor',
      description: 'Assign mentees to available mentors',
      icon: '🤝',
      path: '/menteementor_assign',
      color: '#10b981',
      roles: ['coordinator', 'admin']
    },
    {
      id: 4,
      title: 'Schedule Meeting',
      description: 'Schedule mentorship sessions',
      icon: '📅',
      path: '/mentor_scheduling',
      color: '#f59e0b',
      roles: ['mentor', 'admin']
    },
    {
      id: 5,
      title: 'View Scheduled Meetings',
      description: 'View all scheduled meetings',
      icon: '📋',
      path: '/scheduled_dashboard',
      color: '#8b5cf6',
      roles: ['mentee', 'mentor', 'admin']
    },
    {
      id: 6,
      title: 'Program Feedback',
      description: 'Collect and view program feedback',
      icon: '💬',
      path: '/program_feedback',
      color: '#ec4899',
      roles: ['mentee', 'mentor', 'coordinator', 'admin']
    },
    {
      id: 7,
      title: 'Phase Management',
      description: 'Manage mentorship phases and semesters',
      icon: '📊',
      path: '/admin_dashboard',
      color: '#8b5cf6',
      roles: ['coordinator', 'admin']
    },
    {
      id: 9,
      title: 'Coordinator Dashboard',
      description: 'Advanced analytics and management tools',
      icon: '🏢',
      path: '/co-ordinator',
      color: '#ef4444',
      roles: ['coordinator', 'admin']
    }
  ];

  // Filter quick actions based on user role (UNCHANGED)
  const getFilteredQuickActions = () => {
    return allQuickActions.filter(action => 
      action.roles.includes(userRole)
    );
  };

  const quickActions = getFilteredQuickActions();

  // Handle quick action click (UNCHANGED)
  const handleQuickActionClick = (action) => {
    if (action.id === 5 && userEmail) {
      navigate(`/scheduled_dashboard/${encodeURIComponent(userEmail)}`);
    } else {
      navigate(action.path);
    }
  };

  // Carousel navigation functions
  const nextSession = () => {
    setCurrentSessionIndex((prevIndex) => 
      prevIndex === filteredSessionsByStatus.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSession = () => {
    setCurrentSessionIndex((prevIndex) => 
      prevIndex === 0 ? filteredSessionsByStatus.length - 1 : prevIndex - 1
    );
  };

  const goToSession = (index) => {
    setCurrentSessionIndex(index);
  };

  const nextMentor = () => {
    setCurrentMentorIndex((prevIndex) => 
      prevIndex === filteredMentorCapacity.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevMentor = () => {
    setCurrentMentorIndex((prevIndex) => 
      prevIndex === 0 ? filteredMentorCapacity.length - 1 : prevIndex - 1
    );
  };

  const goToMentor = (index) => {
    setCurrentMentorIndex(index);
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return { background: '#dcfce7', color: '#166534', border: '#bbf7d0' };
      case 'upcoming': 
      case 'scheduled': return { background: '#dbeafe', color: '#1e40af', border: '#bfdbfe' };
      case 'postponed': 
      case 'cancelled': return { background: '#fef3c7', color: '#92400e', border: '#fde68a' };
      case 'active': return { background: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
      default: return { background: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✓';
      case 'upcoming': 
      case 'scheduled': return '📅';
      case 'postponed': 
      case 'cancelled': return '⏸';
      case 'active': return '🔥';
      default: return '•';
    }
  };

  const getPhaseStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#10b981';
      case 'active': return '#3b82f6';
      case 'upcoming': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getCapacityColor = (count, max) => {
    const percentage = (count / max) * 100;
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'coordinator': return '#8b5cf6';
      case 'mentor': return '#3b82f6';
      case 'mentee': return '#10b981';
      case 'new_user': return '#f59e0b';
      case 'admin': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRoleDisplayName = (role) => {
    switch(role) {
      case 'coordinator': return 'Coordinator';
      case 'mentor': return 'Mentor';
      case 'mentee': return 'Mentee';
      case 'new_user': return 'New User';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  // Format time since last update
  const formatTimeSince = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minutes ago`;
    return new Date(date).toLocaleTimeString();
  };

  // Render phase distribution graph
  const renderPhaseDistributionGraph = () => {
    const graphData = getPhaseGraphData();
    const maxValue = Math.max(...graphData.mentors, ...graphData.mentees, 1);
    
    return (
      <div className="phase-distribution-graph">
        <div className="graph-header">
          <h3 className="graph-title">Phase-wise Distribution</h3>
          <div className="graph-legend">
            <div className="legend-item">
              <div className="legend-dot mentor-dot"></div>
              <span>Mentors</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot mentee-dot"></div>
              <span>Mentees</span>
            </div>
          </div>
        </div>
        
        <div className="graph-bars-container">
          <div className="graph-y-axis">
            <div className="y-axis-label">Count</div>
            <div className="y-axis-scale">
              {[Math.ceil(maxValue * 0.75), Math.ceil(maxValue * 0.5), Math.ceil(maxValue * 0.25), 0].map((value, idx) => (
                <div key={idx} className="y-axis-tick">
                  <span className="tick-label">{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="graph-bars">
            {graphData.phases.map((phase, index) => {
              const mentorHeight = (graphData.mentors[index] / maxValue) * 100;
              const menteeHeight = (graphData.mentees[index] / maxValue) * 100;
              
              return (
                <div key={index} className="bar-group">
                  <div className="bar-label">{phase}</div>
                  <div className="bars-container">
                    <div 
                      className="bar mentor-bar"
                      style={{ height: `${mentorHeight}%` }}
                      title={`${graphData.mentors[index]} mentors`}
                    >
                      <span className="bar-value">{graphData.mentors[index]}</span>
                    </div>
                    <div 
                      className="bar mentee-bar"
                      style={{ height: `${menteeHeight}%` }}
                      title={`${graphData.mentees[index]} mentees`}
                    >
                      <span className="bar-value">{graphData.mentees[index]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="graph-footer">
          <div className="graph-stats">
            <div className="stat-item">
              <span className="stat-label">Total Mentors:</span>
              <span className="stat-value">{graphData.mentors.reduce((a, b) => a + b, 0)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Mentees:</span>
              <span className="stat-value">{graphData.mentees.reduce((a, b) => a + b, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mentorship-dashboard-wrapper">
        <div className="dashboard-loading-container">
          <div className="dashboard-spinner"></div>
          <p>Loading real-time dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mentorship-dashboard-wrapper">
      <div className="dashboard-animated-bg">
        <div className="dashboard-gradient-orb dashboard-orb-1"></div>
        <div className="dashboard-gradient-orb dashboard-orb-2"></div>
        <div className="dashboard-gradient-orb dashboard-orb-3"></div>
      </div>
      
      <div className="dashboard-container">
        {/* Header with Logout */}
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo-section">
              <div className="dashboard-logo">M</div>
              <div className="dashboard-header-text">
                <h1 className="dashboard-title"> Mentorship Dashboard</h1>
              </div>
            </div>
            
            <div className="dashboard-user-info-section">
              <div className="dashboard-user-info-left">
                <div className="dashboard-user-role-badge" style={{ background: getRoleColor(userRole) }}>
                  {getRoleDisplayName(userRole)}
                </div>
                {userEmail && (
                  <div className="dashboard-user-email">
                    <span className="dashboard-email-label">Logged in as:</span>
                    <span className="dashboard-email-value">{userEmail}</span>
                  </div>
                )}
              </div>
              <button className="dashboard-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards - REAL-TIME */}
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card realtime-card">
            <div className="dashboard-stat-icon">
              <span>👨‍🏫</span>
            </div>
            <div className="dashboard-stat-content">
              <div className="dashboard-stat-value">{dashboardStats.totalMentors}</div>
              <div className="dashboard-stat-label">Active Mentors</div>
            </div>
          </div>

          <div className="dashboard-stat-card realtime-card">
            <div className="dashboard-stat-icon">
              <span>👨‍🎓</span>
            </div>
            <div className="dashboard-stat-content">
              <div className="dashboard-stat-value">{dashboardStats.totalMentees}</div>
              <div className="dashboard-stat-label">Active Mentees</div>
            </div>
          </div>

          <div className="dashboard-stat-card realtime-card">
            <div className="dashboard-stat-icon">
              <span>✅</span>
            </div>
            <div className="dashboard-stat-content">
              <div className="dashboard-stat-value">{meetingStats.completedMeetings}</div>
              <div className="dashboard-stat-label">Completed Meetings</div>
            </div>
          </div>

          <div className="dashboard-stat-card realtime-card">
            <div className="dashboard-stat-icon">
              <span>⏸️</span>
            </div>
            <div className="dashboard-stat-content">
              <div className="dashboard-stat-value">{meetingStats.postponedMeetings}</div>
              <div className="dashboard-stat-label">Cancelled/Postponed</div>
            </div>
          </div>
        </div>

        {/* ========== NEW: PHASE DISTRIBUTION GRAPH ========== */}
        <div className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div className="dashboard-title-section">
              <h2 className="dashboard-section-title">Mentors vs Mentees per Phase</h2>
            </div>
          </div>
          
          {dashboardStats.phaseStats && dashboardStats.phaseStats.length > 0 ? (
            renderPhaseDistributionGraph()
          ) : (
            <div className="graph-placeholder">
              <div className="placeholder-icon">📊</div>
              <p className="placeholder-text">No phase data available yet</p>
              <p className="placeholder-subtext">Add phases to see the distribution graph</p>
            </div>
          )}
        </div>

        {/* Phase Filter - REMOVED "All Phases" option */}
        <div className="dashboard-section-card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Select Phase</h2>
            <div className="phase-count">
              {mentorshipPhases.length} phase{mentorshipPhases.length !== 1 ? 's' : ''} total
            </div>
          </div>
          <div className="dashboard-filter-buttons">
            {mentorshipPhases.map(phase => (
              <button
                key={phase.id}
                onClick={() => setActivePhase(phase.id)}
                className={`dashboard-filter-btn ${activePhase === phase.id ? 'active' : ''}`}
                style={activePhase === phase.id ? {
                  background: getPhaseStatusColor(phase.status),
                  color: 'white',
                  borderColor: getPhaseStatusColor(phase.status)
                } : {}}
              >
                {isMobile ? phase.name.replace(' ', '\n') : phase.name}
              </button>
            ))}
          </div>
        </div>

        {/* Program Phases Performance - REAL-TIME */}
        <div className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div className="dashboard-title-section">
              <h2 className="dashboard-section-title">
                Program Phases Performance
                {activePhase && mentorshipPhases.find(p => p.id === activePhase) && ` - ${mentorshipPhases.find(p => p.id === activePhase).name}`}
              </h2>
              <p className="dashboard-section-subtitle">
                {activePhase && mentorshipPhases.find(p => p.id === activePhase) 
                  ? `Showing live data for ${mentorshipPhases.find(p => p.id === activePhase).name}` 
                  : 'Select a phase to view data'
                }
              </p>
            </div>
          </div>
          
          {filteredPhases.length === 0 ? (
            <div className="dashboard-empty-state">
              <p className="dashboard-empty-text">
                {activePhase ? 'No data found for selected phase' : 'Please select a phase'}
              </p>
            </div>
          ) : (
            <div className="dashboard-phases-grid">
              {filteredPhases.map(phase => {
                // Calculate real-time phase-specific stats
                const phaseMentors = allMentors.filter(m => 
                  m.phaseId === phase.phaseId || m.phaseId === phase.id.replace('phase_', '')
                );
                const phaseMentees = allMentees.filter(m => 
                  m.phaseId === phase.phaseId || m.phaseId === phase.id.replace('phase_', '')
                );
                const phaseAssignments = allAssignments.filter(a => 
                  a.phaseId === phase.phaseId
                );
                const phaseMeetings = allMeetings.filter(m => {
                  // Filter meetings based on mentor/mentee phase
                  const mentorInPhase = phaseMentors.some(pm => pm.mentor_id === m.mentor_user_id);
                  const menteesInPhase = m.mentee_user_ids?.some(menteeId => 
                    phaseMentees.some(pm => pm.mentee_user_id === menteeId)
                  );
                  return mentorInPhase || menteesInPhase;
                });
                
                const completedMeetings = phaseMeetings.filter(m => 
                  m.status === 'completed' || m.status === 'Completed'
                ).length;
                const upcomingMeetings = phaseMeetings.filter(m => 
                  m.status === 'scheduled' || m.status === 'Scheduled' || m.status === 'upcoming'
                ).length;
                const postponedMeetings = phaseMeetings.filter(m => 
                  m.status === 'postponed' || m.status === 'Postponed' || 
                  m.status === 'cancelled' || m.status === 'Cancelled'
                ).length;
                
                return (
                  <div 
                    key={phase.id} 
                    className={`dashboard-phase-card ${phase.status === 'active' ? 'active-phase' : ''}`}
                  >
                    <div className="dashboard-phase-header">
                      <div className="dashboard-phase-title-row">
                        <h3 className="dashboard-phase-name">{phase.name}</h3>
                        <span 
                          className="dashboard-phase-status" 
                          style={{ background: getPhaseStatusColor(phase.status) }}
                        >
                          {phase.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="dashboard-phase-period">{phase.period}</p>
                    </div>
                    
                    {/* Real-time stats */}
                    <div className="dashboard-phase-stats-table">
                      <div className="dashboard-phase-stat-box realtime-stat">
                        <span className="dashboard-phase-stat-label">Mentors</span>
                        <span className="dashboard-phase-stat-value">{phaseMentors.length}</span>
                        <div className="realtime-change">
                          {phaseMentors.length > 0 ? '✓' : '-'}
                        </div>
                      </div>
                      <div className="dashboard-phase-stat-box realtime-stat">
                        <span className="dashboard-phase-stat-label">Mentees</span>
                        <span className="dashboard-phase-stat-value">{phaseMentees.length}</span>
                        <div className="realtime-change">
                          {phaseMentees.length > 0 ? '✓' : '-'}
                        </div>
                      </div>
                     
                      <div className="dashboard-phase-stat-box realtime-stat">
                        <span className="dashboard-phase-stat-label">Meetings</span>
                        <span className="dashboard-phase-stat-value">{phaseMeetings.length}</span>
                        <div className="realtime-change">
                          {phaseMeetings.length > 0 ? '✓' : '-'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Meeting breakdown */}
                    <div className="meeting-breakdown">
                      <div className="breakdown-item completed">
                        <span className="breakdown-label">Completed</span>
                        <span className="breakdown-value">{completedMeetings}</span>
                      </div>
                      <div className="breakdown-item upcoming">
                        <span className="breakdown-label">Upcoming</span>
                        <span className="breakdown-value">{upcomingMeetings}</span>
                      </div>
                      <div className="breakdown-item postponed">
                        <span className="breakdown-label">Postponed</span>
                        <span className="breakdown-value">{postponedMeetings}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Semester Mentors - REAL-TIME */}
        <div className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div className="dashboard-title-section">
              <h2 className="dashboard-section-title">Current Mentors ({allMentors.length})</h2>
              <p className="dashboard-section-subtitle">
               mentor capacity tracking - {allAssignments.length} active assignments
                {searchMentor && ` - Filtered by "${searchMentor}"`}
              </p>
            </div>
            
            <div className="dashboard-search-box">
              <input
                type="text"
                placeholder="Search mentor..."
                value={searchMentor}
                onChange={(e) => setSearchMentor(e.target.value)}
                className="dashboard-search-input"
              />
              {searchMentor && (
                <button onClick={() => setSearchMentor('')} className="dashboard-clear-search">
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {filteredMentorCapacity.length === 0 ? (
            <div className="dashboard-empty-state">
              <p className="dashboard-empty-text">
                {searchMentor ? 'No mentors found' : 'No mentor capacity data yet'}
              </p>
            </div>
          ) : (
            <div className="mentor-carousel">
              <div className="dashboard-carousel-header">
                <div className="dashboard-carousel-info">
                  <span className="dashboard-carousel-counter">
                    {searchMentor 
                      ? `Found ${filteredMentorCapacity.length} mentor${filteredMentorCapacity.length !== 1 ? 's' : ''}` 
                      : `Mentor ${currentMentorIndex + 1} of ${filteredMentorCapacity.length}`
                    }
                  </span>
                </div>
                {!searchMentor && filteredMentorCapacity.length > 1 && (
                  <div className="dashboard-carousel-controls">
                    <button onClick={prevMentor} className="dashboard-carousel-btn">‹</button>
                    <button onClick={nextMentor} className="dashboard-carousel-btn">›</button>
                  </div>
                )}
              </div>

              <div className="dashboard-mentor-cards">
                {searchMentor ? (
                  filteredMentorCapacity.map((mentor) => (
                    <div key={mentor.id} className="dashboard-mentor-card realtime-card">
                      <h3 className="dashboard-mentor-name">{mentor.name}</h3>
                      <div className="dashboard-capacity-meter">
                        <div className="dashboard-capacity-info">
                          <span className="dashboard-capacity-count">{mentor.menteeCount}/{mentor.maxCapacity} mentees</span>
                          <span className="dashboard-capacity-percentage">
                            {Math.round((mentor.menteeCount / mentor.maxCapacity) * 100)}% capacity
                          </span>
                        </div>
                        <div className="dashboard-progress-bar">
                          <div 
                            className="dashboard-progress-fill"
                            style={{
                              width: `${Math.min((mentor.menteeCount / mentor.maxCapacity) * 100, 100)}%`,
                              background: getCapacityColor(mentor.menteeCount, mentor.maxCapacity)
                            }}
                          />
                        </div>
                      </div>
                      <div className="dashboard-mentor-stats">
                        <div className="dashboard-stat-item">
                          <span className="dashboard-stat-label">Sessions Completed</span>
                          <span className="dashboard-stat-value">{mentor.sessionsCompleted}</span>
                        </div>
                        <div className="dashboard-stat-item">
                          <span className="dashboard-stat-label">Upcoming Sessions</span>
                          <span className="dashboard-stat-value">{mentor.sessionsUpcoming}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  filteredMentorCapacity.map((mentor, index) => (
                    <div
                      key={mentor.id}
                      className={`dashboard-mentor-card ${index === currentMentorIndex ? 'active' : 'inactive'} `}
                    >
                      <h3 className="dashboard-mentor-name">{mentor.name}</h3>
                      <div className="dashboard-capacity-meter">
                        <div className="dashboard-capacity-info">
                          <span className="dashboard-capacity-count">{mentor.menteeCount}/{mentor.maxCapacity} mentees</span>
                          <span className="dashboard-capacity-percentage">
                            {Math.round((mentor.menteeCount / mentor.maxCapacity) * 100)}% capacity
                          </span>
                        </div>
                        <div className="dashboard-progress-bar">
                          <div 
                            className="dashboard-progress-fill"
                            style={{
                              width: `${Math.min((mentor.menteeCount / mentor.maxCapacity) * 100, 100)}%`,
                              background: getCapacityColor(mentor.menteeCount, mentor.maxCapacity)
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="mentor-mentees-list">
                        <span className="mentee-label">Mentees:</span>
                        {mentor.mentees.length > 0 ? (
                          <div className="mentee-tags">
                            {mentor.mentees.slice(0, 3).map((mentee, idx) => (
                              <span key={idx} className="mentee-tag">{mentee}</span>
                            ))}
                            {mentor.mentees.length > 3 && (
                              <span className="mentee-more">+{mentor.mentees.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="no-mentees">No mentees assigned</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!searchMentor && filteredMentorCapacity.length > 1 && (
                <div className="dashboard-carousel-indicators">
                  {filteredMentorCapacity.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToMentor(index)}
                      className={`dashboard-carousel-indicator ${index === currentMentorIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions - UNCHANGED */}
        <div className="dashboard-section-card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Quick Actions</h2>
            <p className="dashboard-section-subtitle">
              Quick access for {getRoleDisplayName(userRole)} role
            </p>
          </div>
          
          {quickActions.length === 0 ? (
            <div className="dashboard-empty-state">
              <p className="dashboard-empty-text">No actions available for your role</p>
            </div>
          ) : (
            <div className="dashboard-quick-actions-grid">
              {quickActions.map((action) => (
                <div 
                  key={action.id} 
                  className="dashboard-quick-action-card"
                  onClick={() => handleQuickActionClick(action)}
                  style={{ borderTop: `4px solid ${action.color}` }}
                >
                  <div className="dashboard-action-icon" style={{ color: action.color }}>
                    {action.icon}
                  </div>
                  <div className="dashboard-action-content">
                    <h3 className="dashboard-action-title">{action.title}</h3>
                    <p className="dashboard-action-description">{action.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}