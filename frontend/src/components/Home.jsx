import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const AlumniDashboard = ({ onOpenPlacementDashboard, onOpenWebinarDashboard, onOpenMentorshipDashboard }) => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('webinars');
  const [selectedItem, setSelectedItem] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const webinars = [
    { id: 1, title: 'AI in Healthcare', status: 'APPROVED', conducted: 12, postponed: 2, topic: 'Healthcare Technology & AI Applications', speakers: 3, date: '2024-12-15' },
    { id: 2, title: 'Data Science Career Roadmap', status: 'APPROVED', conducted: 8, postponed: 1, topic: 'Career Paths in Data Science', speakers: 2, date: '2024-11-20' },
    { id: 3, title: 'Cybersecurity Trends 2025', status: 'HOLD', conducted: 0, postponed: 1, topic: 'Latest Cybersecurity Threats', speakers: 4, date: '2025-01-10' },
    { id: 4, title: 'Full Stack Development', status: 'APPROVED', conducted: 15, postponed: 0, topic: 'Modern Full Stack Technologies', speakers: 2, date: '2024-10-05' },
    { id: 5, title: 'Cloud Computing Basics', status: 'HOLD', conducted: 0, postponed: 0, topic: 'Introduction to Cloud Platforms', speakers: 1, date: '2025-02-01' },
    { id: 6, title: 'Machine Learning Essentials', status: 'APPROVED', conducted: 10, postponed: 3, topic: 'ML Fundamentals & Applications', speakers: 5, date: '2024-09-18' }
  ];

  const mentorships = [
    { id: 1, mentor: 'Dr. A. Ramesh', mentee: 'Priya S.', meetings: 3, status: 'ACTIVE', topic: 'Research Methodology', postponed: 0, duration: '6 months' },
    { id: 2, mentor: 'Mr. Karthik Raj', mentee: 'Deepak M.', meetings: 1, status: 'SCHEDULED', topic: 'Software Engineering', postponed: 2, duration: '3 months' },
    { id: 3, mentor: 'Ms. Divya L.', mentee: 'Harini V.', meetings: 5, status: 'ACTIVE', topic: 'Data Analytics', postponed: 1, duration: '4 months' },
    { id: 4, mentor: 'Prof. Suresh Kumar', mentee: 'Arun K.', meetings: 7, status: 'ACTIVE', topic: 'Machine Learning', postponed: 0, duration: '8 months' },
    { id: 5, mentor: 'Dr. Lakshmi Priya', mentee: 'Vinay R.', meetings: 2, status: 'ON HOLD', topic: 'Research Papers', postponed: 3, duration: '2 months' }
  ];

  const placements = [
    { id: 1, alumni: 'Rahul Sharma', company: 'Infosys', status: 'OFFERED', package: '12 LPA', position: 'Software Engineer', date: '2024-03-15', location: 'Bangalore' },
    { id: 2, alumni: 'Ananya Iyer', company: 'TCS', status: 'IN PROGRESS', package: 'Pending', position: 'Data Analyst', date: '2024-04-20', location: 'Chennai' },
    { id: 3, alumni: 'Vignesh Kumar', company: 'Amazon', status: 'REJECTED', package: '-', position: 'SDE-1', date: '2024-02-10', location: 'Hyderabad' },
    { id: 4, alumni: 'Preethi S.', company: 'Zoho', status: 'OFFERED', package: '10 LPA', position: 'Full Stack Developer', date: '2024-03-28', location: 'Chennai' },
    { id: 5, alumni: 'Naveen Raj', company: 'Wipro', status: 'OFFERED', package: '8 LPA', position: 'System Engineer', date: '2024-04-05', location: 'Pune' },
    { id: 6, alumni: 'Keerthi M.', company: 'Cognizant', status: 'IN PROGRESS', package: 'Pending', position: 'Business Analyst', date: '2024-04-12', location: 'Mumbai' }
  ];

  const getStatusClass = (status) => {
    const statusMap = {
      'APPROVED': 'status-approved',
      'HOLD': 'status-hold',
      'ACTIVE': 'status-active',
      'SCHEDULED': 'status-scheduled',
      'ON HOLD': 'status-onhold', 
      'OFFERED': 'status-offered',
      'IN PROGRESS': 'status-progress',
      'REJECTED': 'status-rejected'
    };
    return statusMap[status] || 'status-default';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'APPROVED': '✓',
      'HOLD': '⏸',
      'ACTIVE': '●',
      'SCHEDULED': '📅',
      'ON HOLD': '⏸',
      'OFFERED': '🎉',
      'IN PROGRESS': '⏳',
      'REJECTED': '✕'
    };
    return iconMap[status] || '●';
  };

  const renderDetails = () => {
    if (!selectedItem) return null;

    if (selectedTab === 'webinars') {
      return (
        <div className="details-overlay" onClick={() => setSelectedItem(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedItem.title}</h2>
              <button className="close-btn" onClick={() => setSelectedItem(null)}>
                <span>×</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">📊</div>
                  <div className="detail-content">
                    <span className="detail-label">Status</span>
                    <span className={`detail-badge ${getStatusClass(selectedItem.status)}`}>
                      {getStatusIcon(selectedItem.status)} {selectedItem.status}
                    </span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="detail-icon">📅</div>
                  <div className="detail-content">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">{new Date(selectedItem.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">✅</div>
                  <div className="detail-content">
                    <span className="detail-label">Conducted</span>
                    <span className="detail-value highlight">{selectedItem.conducted} Sessions</span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="detail-icon">⏱</div>
                  <div className="detail-content">
                    <span className="detail-label">Postponed</span>
                    <span className="detail-value">{selectedItem.postponed} Sessions</span>
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">🎤</div>
                  <div className="detail-content">
                    <span className="detail-label">Speakers</span>
                    <span className="detail-value">{selectedItem.speakers} Experts</span>
                  </div>
                </div>
              </div>
              <div className="detail-full">
                <div className="detail-icon">📝</div>
                <div className="detail-content">
                  <span className="detail-label">Topic Description</span>
                  <p className="detail-description">{selectedItem.topic}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTab === 'mentorships') {
      return (
        <div className="details-overlay" onClick={() => setSelectedItem(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mentorship Program</h2>
              <button className="close-btn" onClick={() => setSelectedItem(null)}>
                <span>×</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">👨‍🏫</div>
                  <div className="detail-content">
                    <span className="detail-label">Mentor</span>
                    <span className="detail-value highlight">{selectedItem.mentor}</span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="detail-icon">👨‍🎓</div>
                  <div className="detail-content">
                    <span className="detail-label">Mentee</span>
                    <span className="detail-value highlight">{selectedItem.mentee}</span>
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">📊</div>
                  <div className="detail-content">
                    <span className="detail-label">Status</span>
                    <span className={`detail-badge ${getStatusClass(selectedItem.status)}`}>
                      {getStatusIcon(selectedItem.status)} {selectedItem.status}
                    </span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="detail-icon">⏱</div>
                  <div className="detail-content">
                    <span className="detail-label">Duration</span>
                    <span className="detail-value">{selectedItem.duration}</span>
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">✅</div>
                  <div className="detail-content">
                    <span className="detail-label">Meetings Completed</span>
                    <span className="detail-value highlight">{selectedItem.meetings}</span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="detail-icon">📅</div>
                  <div className="detail-content">
                    <span className="detail-label">Postponed</span>
                    <span className="detail-value">{selectedItem.postponed}</span>
                  </div>
                </div>
              </div>
              <div className="detail-full">
                <div className="detail-icon">📝</div>
                <div className="detail-content">
                  <span className="detail-label">Focus Area</span>
                  <p className="detail-description">{selectedItem.topic}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedTab === 'placements') {
      return (
        <div className="details-overlay" onClick={() => setSelectedItem(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Placement Details</h2>
              <button className="close-btn" onClick={() => setSelectedItem(null)}>
                <span>×</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">👤</div>
                  <div className="detail-content">
                    <span className="detail-label">Alumni Name</span>
                    <span className="detail-value highlight">{selectedItem.alumni}</span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="detail-icon">🏢</div>
                  <div className="detail-content">
                    <span className="detail-label">Company</span>
                    <span className="detail-value highlight">{selectedItem.company}</span>
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">📊</div>
                  <div className="detail-content">
                    <span className="detail-label">Status</span>
                    <span className={`detail-badge ${getStatusClass(selectedItem.status)}`}>
                      {getStatusIcon(selectedItem.status)} {selectedItem.status}
                    </span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="detail-icon">💼</div>
                  <div className="detail-content">
                    <span className="detail-label">Position</span>
                    <span className="detail-value">{selectedItem.position}</span>
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">💰</div>
                  <div className="detail-content">
                    <span className="detail-label">Package</span>
                    <span className="detail-value highlight">{selectedItem.package}</span>
                  </div>
                </div>
                <div className="detail-box">
                  <div className="detail-icon">📍</div>
                  <div className="detail-content">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{selectedItem.location}</span>
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-box">
                  <div className="detail-icon">📅</div>
                  <div className="detail-content">
                    <span className="detail-label">Placement Date</span>
                    <span className="detail-value">{new Date(selectedItem.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <header className="main-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo">NEC</div>
            <div className="header-text">
              <h1>Alumni Association</h1>
              <p>Empowering Connections, Inspiring Success</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="logout-btn"
              onClick={() => {
                localStorage.removeItem('userEmail');
                localStorage.removeItem('isAdmin');
                navigate('/login');
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="tab-container">
        <div className="tab-wrapper">
          <button
            className={`tab ${selectedTab === 'webinars' ? 'active' : ''}`}
            onClick={() => navigate('/login')}
          >
            <span className="tab-icon">🎓</span>
            <span className="tab-text">Webinars</span>
            <div className="tab-indicator"></div>
          </button>
          <button 
            className={`tab ${selectedTab === 'mentorships' ? 'active' : ''}`}
            onClick={() => navigate('/login1')}
          >
            <span className="tab-icon">🤝</span>
            <span className="tab-text">Mentorship</span>
            <div className="tab-indicator"></div>
          </button>
          <button
            className={`tab ${selectedTab === 'placements' ? 'active' : ''}`}
            onClick={() => navigate('/placement-dashboard')}
          >
            <span className="tab-icon">💼</span>
            <span className="tab-text">Placement</span>
            <div className="tab-indicator"></div>
          </button>
        </div>
      </nav>

      <main className="content-section">
        {selectedTab === 'webinars' && (
          <div className="cards-container">
            {/* Webinar Dashboard Link Card - Now at the top */}
            <div
              className="glass-card dashboard-link-card featured-card"
              onClick={() => navigate('/login')}
              onMouseEnter={() => setHoveredCard('webinar-dashboard')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="card-header">
                <div className="featured-badge">
                  <span className="featured-icon">🎓</span>
                  <span className="featured-text">Management Portal</span>
                </div>
                <span className="status-pill status-featured">
                  ⚡ Quick Access
                </span>
              </div>
              <h3 className="dashboard-title">Webinar Dashboard</h3>
              <p className="dashboard-link-text">
                View and manage webinar requests, speaker assignments, topic approvals, and feedback forms in the comprehensive management portal.
              </p>
              <div className="dashboard-features">
                <span className="feature-tag">📊 Analytics</span>
                <span className="feature-tag">🎤 Speakers</span>
                <span className="feature-tag">📝 Forms</span>
              </div>
              <div className="card-footer">
                <span className="view-more highlighted">Open Dashboard →</span>
              </div>
            </div>

            {/* Webinar Cards */}
            {webinars.map(item => (
              <div 
                key={item.id}
                className={`glass-card ${hoveredCard === item.id ? 'hovered' : ''}`}
                onClick={() => setSelectedItem(item)}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="card-header">
                  <h3>{item.title}</h3>
                  <span className={`status-pill ${getStatusClass(item.status)}`}>
                    {getStatusIcon(item.status)} {item.status}
                  </span>
                </div>
                <div className="card-stats">
                  <div className="stat-item">
                    <span className="stat-icon">✅</span>
                    <div className="stat-info">
                      <span className="stat-label">Conducted</span>
                      <span className="stat-value">{item.conducted}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">🎤</span>
                    <div className="stat-info">
                      <span className="stat-label">Speakers</span>
                      <span className="stat-value">{item.speakers}</span>
                    </div>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="view-more">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'mentorships' && (
          <div className="cards-container">
            {/* Mentorship Dashboard Link Card - Now at the top */}
            <div
              className="glass-card dashboard-link-card featured-card"
              onClick={onOpenMentorshipDashboard}
              onMouseEnter={() => setHoveredCard('mentorship-dashboard')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="card-header">
                <div className="featured-badge">
                  <span className="featured-icon">🤝</span>
                  <span className="featured-text">Management Portal</span>
                </div>
                <span className="status-pill status-featured">
                  ⚡ Quick Access
                </span>
              </div>
              <h3 className="dashboard-title">Mentorship Dashboard</h3>
              <p className="dashboard-link-text">
                View and manage mentorship requests, mentor assignments, progress tracking, and feedback forms in the comprehensive management portal.
              </p>
              <div className="dashboard-features">
                <span className="feature-tag">📊 Analytics</span>
                <span className="feature-tag">👨‍🏫 Mentors</span>
                <span className="feature-tag">📝 Forms</span>
              </div>
              <div className="card-footer">
                <span className="view-more highlighted">Open Dashboard →</span>
              </div>
            </div>

            {/* Mentorship Cards */}
            {mentorships.map(item => (
              <div 
                key={item.id}
                className={`glass-card ${hoveredCard === item.id ? 'hovered' : ''}`}
                onClick={() => setSelectedItem(item)}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="card-header">
                  <div className="mentor-badge">
                    <span className="badge-icon">👨‍🏫</span>
                    <span className="badge-text">{item.mentor}</span>
                  </div>
                  <span className={`status-pill ${getStatusClass(item.status)}`}>
                    {getStatusIcon(item.status)} {item.status}
                  </span>
                </div>
                <div className="mentee-section">
                  <span className="mentee-icon">👨‍🎓</span>
                  <span className="mentee-name">{item.mentee}</span>
                </div>
                <div className="card-stats">
                  <div className="stat-item">
                    <span className="stat-icon">✅</span>
                    <div className="stat-info">
                      <span className="stat-label">Meetings</span>
                      <span className="stat-value">{item.meetings}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">⏱</span>
                    <div className="stat-info">
                      <span className="stat-label">Duration</span>
                      <span className="stat-value">{item.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="view-more">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'placements' && (
          <div className="cards-container">
            {/* Dashboard Link Card - Now at the top */}
            <div 
              className="glass-card dashboard-link-card featured-card"
              onClick={() => navigate('/placement-dashboard')}
              onMouseEnter={() => setHoveredCard('dashboard')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="card-header">
                <div className="featured-badge">
                  <span className="featured-icon">🚀</span>
                  <span className="featured-text">Management Portal</span>
                </div>
                <span className="status-pill status-featured">
                  ⚡ Quick Access
                </span>
              </div>
              <h3 className="dashboard-title">Placement Dashboard</h3>
              <p className="dashboard-link-text">
                View and manage placement data requests, company registrations, and feedback forms in the comprehensive management portal.
              </p>
              <div className="dashboard-features">
                <span className="feature-tag">📊 Analytics</span>
                <span className="feature-tag">🏢 Companies</span>
                <span className="feature-tag">📝 Forms</span>
              </div>
              <div className="card-footer">
                <span className="view-more highlighted">Open Dashboard →</span>
              </div>
            </div>

            {/* Placement Cards */}
            {placements.map(item => (
              <div 
                key={item.id}
                className={`glass-card ${hoveredCard === item.id ? 'hovered' : ''}`}
                onClick={() => setSelectedItem(item)}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="card-header">
                  <div className="alumni-info">
                    <span className="alumni-icon">👤</span>
                    <span className="alumni-name">{item.alumni}</span>
                  </div>
                  <span className={`status-pill ${getStatusClass(item.status)}`}>
                    {getStatusIcon(item.status)} {item.status}
                  </span>
                </div>
                <div className="company-section">
                  <span className="company-icon">🏢</span>
                  <span className="company-name">{item.company}</span>
                </div>
                <div className="position-section">{item.position}</div>
                <div className="card-stats">
                  <div className="stat-item">
                    <span className="stat-icon">💰</span>
                    <div className="stat-info">
                      <span className="stat-label">Package</span>
                      <span className="stat-value">{item.package}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">📍</span>
                    <div className="stat-info">
                      <span className="stat-label">Location</span>
                      <span className="stat-value">{item.location}</span>
                    </div>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="view-more">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {renderDetails()}
    </div>
  );
};

export default AlumniDashboard;