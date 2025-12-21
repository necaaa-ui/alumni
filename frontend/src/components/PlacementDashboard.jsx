import React, { useState, useEffect } from 'react';
import { TrendingUp, Building2, Award, Users, ChevronLeft, Check, ArrowLeft, Search, X, Mail } from 'lucide-react';
import './PlacementDashboard.css';
import AdminDashboard from './placement/AdminDashboard';
import AssignedCompanies from './placement/AssignedCompanies';
import CompanyRegistrationForm from './placement/CompanyRegistrationForm';
import InterviewResults from './placement/InterviewResults';
import PlacementDataRequestForm from './placement/PlacementDataRequestForm';
import PlacementFeedbackForm from './placement/PlacementFeedbackForm';
import RequesterFeedbackForm from './placement/RequesterFeedbackForm';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const PlacementDashboard = ({ onBackToHome }) => {
  const [view, setView] = useState('email-entry');
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      total: 0,
      pending: 0,
      completed: 0,
      rejected: 0,
      inProgress: 0,
      successRate: 0
    },
    yearWiseData: [
      { year: new Date().getFullYear().toString(), applications: 0, placements: 0 }
    ],
    applications: [],
    totalCompanies: 0
  });
  const [loading, setLoading] = useState(false);
  const [allCompanies, setAllCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [hasRequestedPlacement, setHasRequestedPlacement] = useState(false);

  useEffect(() => {
    if (analyticsData?.applications) {
      const filtered = analyticsData.applications.filter(app => {
        const searchLower = searchTerm.toLowerCase();
        return (
          app.name.toLowerCase().includes(searchLower) ||
          app.company.toLowerCase().includes(searchLower) ||
          app.role.toLowerCase().includes(searchLower) ||
          app.ctc.toLowerCase().includes(searchLower) ||
          app.status.toLowerCase().includes(searchLower)
        );
      });
      setFilteredApplications(filtered);
    }
  }, [searchTerm, analyticsData]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      alert('Please enter your email address');
      return;
    }

    const email = emailInput.trim().toLowerCase();
    setUserEmail(email);

    // Determine role based on email
    if (email === 'vsnithyasaminathan143@gmail.com') {
      setUserRole('admin');
      setView('dashboard');
      fetchDashboardData();
    } else if (email === 'kanthisaranya@gmail.com') {
      setUserRole('coordinator');
      setView('dashboard');
      fetchDashboardData();
    } else {
      setUserRole('alumni');
      // Check if alumni has already submitted placement request
      await checkPlacementRequestStatus(email);
      setView('dashboard');
      fetchDashboardData();
    }
  };

  const checkPlacementRequestStatus = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/placement-requests/check/${email}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.hasRequested) {
        setHasRequestedPlacement(true);
      }
    } catch (err) {
      console.error('Error checking placement request status:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching dashboard data from:', `${API_BASE_URL}/api/company-mapping`);
      
      const mappingsRes = await fetch(`${API_BASE_URL}/api/company-mapping`);
      if (!mappingsRes.ok) {
        const errorText = await mappingsRes.text();
        console.error('❌ Mappings API error:', mappingsRes.status, errorText);
        throw new Error(`HTTP error! status: ${mappingsRes.status}`);
      }
      const mappingsData = await mappingsRes.json();
      console.log('✅ Mappings data:', mappingsData);
      
      const companiesRes = await fetch(`${API_BASE_URL}/api/company-mapping/available-companies`);
      if (!companiesRes.ok) {
        const errorText = await companiesRes.text();
        console.error('❌ Companies API error:', companiesRes.status, errorText);
        throw new Error(`HTTP error! status: ${companiesRes.status}`);
      }
      const companiesData = await companiesRes.json();
      console.log('✅ Companies data:', companiesData);

      // Handle both success and empty data cases
      const mappings = (mappingsData.success && mappingsData.data) ? mappingsData.data : [];
      const companies = (companiesData.success && companiesData.data) ? companiesData.data : [];

      console.log(`📊 Found ${mappings.length} mappings and ${companies.length} companies`);

      setAllCompanies(companies);

      const overview = {
        total: mappings.length,
        pending: mappings.filter(m => m.alumni_status === 'Not Applied').length,
        completed: mappings.filter(m => m.alumni_status === 'Selected').length,
        rejected: mappings.filter(m => m.alumni_status === 'Rejected').length,
        inProgress: mappings.filter(m => m.alumni_status === 'In Process' || m.alumni_status === 'Applied').length,
        successRate: mappings.length > 0 
          ? Math.round((mappings.filter(m => m.alumni_status === 'Selected').length / mappings.length) * 100)
          : 0
      };

      const yearWiseMap = {};
      mappings.forEach(mapping => {
        const assignedDate = mapping.assigned_on ? new Date(mapping.assigned_on) : new Date();
        const year = assignedDate.getFullYear().toString();
        if (!yearWiseMap[year]) {
          yearWiseMap[year] = { applications: 0, placements: 0 };
        }
        yearWiseMap[year].applications++;
        if (mapping.alumni_status === 'Selected') {
          yearWiseMap[year].placements++;
        }
      });

      const yearWiseData = Object.keys(yearWiseMap)
        .sort()
        .slice(-5)
        .map(year => ({
          year,
          applications: yearWiseMap[year].applications,
          placements: yearWiseMap[year].placements
        }));

      const applications = mappings.slice(0, 20).map((mapping, index) => ({
        id: mapping.mapping_id || index,
        name: mapping.alumniName || 'N/A',
        company: mapping.companyName || 'N/A',
        status: mapStatus(mapping.alumni_status),
        date: mapping.assigned_on || new Date().toISOString(),
        role: mapping.companyRole || 'N/A',
        ctc: mapping.companyCtc || 'N/A'
      }));

      const analyticsDataObj = {
        overview,
        yearWiseData: yearWiseData.length > 0 ? yearWiseData : [
          { year: new Date().getFullYear().toString(), applications: mappings.length, placements: overview.completed }
        ],
        applications,
        totalCompanies: companies.length
      };

      console.log('📈 Analytics data object:', analyticsDataObj);
      setAnalyticsData(analyticsDataObj);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setLoading(false);
      
      // Set empty data structure so UI still renders
      setAnalyticsData({
        overview: {
          total: 0,
          pending: 0,
          completed: 0,
          rejected: 0,
          inProgress: 0,
          successRate: 0
        },
        yearWiseData: [
          { year: new Date().getFullYear().toString(), applications: 0, placements: 0 }
        ],
        applications: [],
        totalCompanies: 0
      });
      setAllCompanies([]);
    }
  };

  const mapStatus = (alumniStatus) => {
    const statusMap = {
      'Not Applied': 'pending',
      'Applied': 'inProgress',
      'In Process': 'inProgress',
      'Selected': 'completed',
      'Rejected': 'rejected'
    };
    return statusMap[alumniStatus] || 'pending';
  };

const getAvailableActions = () => {
    if (userRole === 'admin') {
      return [
        { 
          id: 'placement-data-request', 
          icon: '📊', 
          title: 'Placement Data Request', 
          badge: 'Admin',
          description: 'Share preferred locations, companies, skills and requirements with detailed information.'
        },
        { 
          id: 'add-company', 
          icon: '🏢', 
          title: 'Add New Company', 
          badge: 'Register',
          description: 'Register companies, roles, skills required, CTC details and hiring process.'
        },
        { 
          id: 'assigned-companies', 
          icon: '📋', 
          title: 'Assigned Companies', 
          badge: 'View',
          description: 'View and manage companies assigned for placement activities and track progress.'
        },
        { 
          id: 'interview-results', 
          icon: '📈', 
          title: 'Interview Results', 
          badge: 'Results',
          description: 'View and manage interview outcomes, candidate selection results and feedback.'
        },
        { 
          id: 'requester-feedback', 
          icon: '💬', 
          title: 'Requester Feedback', 
          badge: 'Feedback',
          description: 'Collect and analyze feedback about the placement data request process and improvements.'
        },
        { 
          id: 'placement-feedback', 
          icon: '⭐', 
          title: 'Coordinator Feedback', 
          badge: 'Rating',
          description: 'Capture detailed feedback on the final placement outcome and student experience.'
        },
        { 
          id: 'admin-dashboard', 
          icon: '⚙️', 
          title: 'Coordinator Dashboard', 
          badge: 'Management',
          description: 'Comprehensive admin panel to manage all placement activities, data and analytics.'
        }
      ];
    } else if (userRole === 'coordinator') {
      return [
        { 
          id: 'add-company', 
          icon: '🏢', 
          title: 'Add New Company', 
          badge: 'Register',
          description: 'Register companies, roles, skills required, CTC details and hiring process.'
        },
        { 
          id: 'admin-dashboard', 
          icon: '⚙️', 
          title: 'Coordinator Dashboard', 
          badge: 'Management',
          description: 'Comprehensive admin panel to manage all placement activities, data and analytics.'
        },
        { 
          id: 'interview-results', 
          icon: '📈', 
          title: 'Interview Results', 
          badge: 'Results',
          description: 'View and manage interview outcomes, candidate selection results and feedback.'
        },
        { 
          id: 'placement-feedback', 
          icon: '⭐', 
          title: 'Coordinator Feedback', 
          badge: 'Rating',
          description: 'Capture detailed feedback on the final placement outcome and student experience.'
        }
      ];
    } else if (userRole === 'alumni') {
      // Alumni who haven't submitted placement request yet - show only the request form
      if (!hasRequestedPlacement) {
        return [
          { 
            id: 'placement-data-request', 
            icon: '📊', 
            title: 'Placement Data Request', 
            badge: 'Required',
            description: 'Share your preferred locations, companies, skills and requirements to get started.'
          }
        ];
      } else {
        // Alumni who have submitted placement request - show all three cards including completed request
        return [
          { 
            id: 'placement-data-request', 
            icon: '✅', 
            title: 'Placement Data Request', 
            badge: 'Completed',
            description: 'View or update your placement request. Click to make changes.',
            completed: true
          },
          { 
            id: 'assigned-companies', 
            icon: '📋', 
            title: 'Assigned Companies', 
            badge: 'View',
            description: 'View companies assigned to you for placement activities and track your progress.'
          },
          { 
            id: 'requester-feedback', 
            icon: '💬', 
            title: 'Requester Feedback', 
            badge: 'Feedback',
            description: 'Provide feedback about the placement data request process and your experience.'
          }
        ];
      }
    }
    return [];
  };

  const handleQuickAction = (action) => {
    setView(action);
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
  };

  const handlePlacementRequestSubmit = () => {
    setHasRequestedPlacement(true);
    setView('dashboard');
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const SimpleBackButton = () => (
    <div className="simple-back-container">
      <button className="simple-back-btn" onClick={handleBackToDashboard}>
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>
    </div>
  );

  // Email Entry View
  const EmailEntryView = () => (
    <div className="placement-dashboard">
      <div className="dashboard-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '60px 40px',
          boxShadow: '0 20px 60px rgba(124, 58, 237, 0.15)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
          }}>
            <Mail size={40} color="white" />
          </div>

          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1e293b',
            marginBottom: '12px'
          }}>
            Welcome to Placement Portal
          </h2>

          <p style={{
            fontSize: '16px',
            color: '#64748b',
            marginBottom: '40px'
          }}>
            Enter your email address to access the dashboard
          </p>

          <form onSubmit={handleEmailSubmit}>
            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter your email address"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed';
                  e.target.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              Continue to Dashboard
            </button>
          </form>

          <div style={{
            marginTop: '32px',
            padding: '20px',
            background: 'rgba(124, 58, 237, 0.05)',
            borderRadius: '12px',
            textAlign: 'left'
          }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#7c3aed',
              marginBottom: '8px'
            }}>
              Different Access Levels:
            </p>
            <ul style={{
              fontSize: '13px',
              color: '#64748b',
              paddingLeft: '20px',
              margin: 0
            }}>
              <li style={{ marginBottom: '4px' }}>Admin: Full access to all features</li>
              <li style={{ marginBottom: '4px' }}>Coordinator: Manage companies & interviews</li>
              <li>Alumni: Submit requests & view assignments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const DashboardView = () => {
    const maxApplications = Math.max(...(analyticsData?.yearWiseData.map(d => d.applications) || [200]));
    const availableActions = getAvailableActions();

    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          fontSize: '18px',
          color: '#7c3aed'
        }}>
          Loading dashboard data...
        </div>
      );
    }

    return (
      <div className="placement-dashboard">
        <div className="dashboard-content">
          {/* Header */}
          <div className="dashboard-header">
            <div className="header-content">
              <h2 className="dashboard-title">
                Placement Dashboard 
               
              </h2>
              <p className="dashboard-subtitle">
                {userRole === 'admin' && 'Full administrative access to all placement activities'}
                {userRole === 'coordinator' && 'Manage companies, interviews, and feedback'}
                {userRole === 'alumni' && !hasRequestedPlacement && 'Please submit your placement data request to continue'}
                {userRole === 'alumni' && hasRequestedPlacement && 'View your assigned companies and provide feedback'}
              </p>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
                Logged in as: <strong>{userEmail}</strong>
              </p>
            </div>
            {onBackToHome && (
              <button className="back-btn" onClick={onBackToHome}>
                <ChevronLeft size={18} />
                Back to Home
              </button>
            )}
          </div>

          {/* Analytics Cards - Always visible */}
          {analyticsData && (
            <div className="analytics-section">
              <div className="analytics-grid">
                <div className="analytics-card">
                  <Users className="analytics-icon" size={24} />
                  <div className="analytics-value">{analyticsData.overview.total}</div>
                  <div className="analytics-label">Total Applications</div>
                </div>
                <div className="analytics-card">
                  <TrendingUp className="analytics-icon" size={24} />
                  <div className="analytics-value">{analyticsData.overview.pending}</div>
                  <div className="analytics-label">Pending</div>
                </div>
                <div className="analytics-card">
                  <Check className="analytics-icon" size={24} />
                  <div className="analytics-value">{analyticsData.overview.completed}</div>
                  <div className="analytics-label">Completed</div>
                </div>
                <div className="analytics-card">
                  <TrendingUp className="analytics-icon" size={24} />
                  <div className="analytics-value">{analyticsData.overview.rejected}</div>
                  <div className="analytics-label">Rejected</div>
                </div>
                <div className="analytics-card">
                  <TrendingUp className="analytics-icon" size={24} />
                  <div className="analytics-value">{analyticsData.overview.inProgress}</div>
                  <div className="analytics-label">In Progress</div>
                </div>
                <div className="analytics-card">
                  <Award className="analytics-icon" size={24} />
                  <div className="analytics-value">{analyticsData.overview.successRate}%</div>
                  <div className="analytics-label">Success Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Year-wise Chart - Always visible */}
          {analyticsData && analyticsData.yearWiseData.length > 0 && (
            <div className="yearwise-section">
              <h3 className="section-title">
                <TrendingUp size={20} />
                Year-wise Student Applications
              </h3>
              <div className="yearwise-chart-card-unique">
                <div className="chart-container-unique">
                  {analyticsData.yearWiseData.map((yearData, index) => {
                    const heightPerc = (yearData.applications / maxApplications) * 100;
                    const barColors = [
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                    ];
                    
                    return (
                      <div key={yearData.year} className="bar-group-unique">
                        <div className="bar-stats-top">
                          <div className="stat-bubble">{yearData.applications}</div>
                        </div>
                        <div className="bar-wrapper-unique">
                          <div className="bar-container-unique">
                            <div 
                              className="bar-unique"
                              style={{
                                height: `${heightPerc}%`,
                                background: barColors[index % barColors.length],
                                animationDelay: `${index * 0.15}s`
                              }}
                            >
                              <div className="bar-glow"></div>
                              <div className="bar-particles">
                                <span className="particle"></span>
                                <span className="particle"></span>
                                <span className="particle"></span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bar-year-unique">{yearData.year}</div>
                        <div className="placement-badge-unique">
                          <span className="badge-icon">✓</span>
                          {yearData.placements} Placed
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* All Companies Display - Always visible */}
          {/* All Companies Display - Always visible */}
          {allCompanies.length > 0 && (
            <div className="recruiters-section">
              <h3 className="section-title">
                <Building2 size={20} />
                Recruiters ({allCompanies.length})
                {allCompanies.some(c => c.is_alumni_company) && (
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '500',
                    marginLeft: '12px',
                    color: '#7c3aed'
                  }}>
                    • {allCompanies.filter(c => c.is_alumni_company).length} Alumni Companies
                  </span>
                )}
              </h3>

              <div className="recruiters-grid">
                {allCompanies.map((company) => (
                  <div 
                    key={company.company_id} 
                    className={`recruiter-card ${company.is_alumni_company ? 'alumni-company' : ''}`}
                    style={company.is_alumni_company ? {
                      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
                      border: '2px solid #7c3aed',
                      position: 'relative'
                    } : {}}
                  >
                    {company.is_alumni_company && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                      }}>
                        <span>🎓</span>
                        Alumni
                      </div>
                    )}
                    <div className="recruiter-logo" style={company.is_alumni_company ? {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    } : {}}>
                      {company.is_alumni_company ? '🎓' : '🏢'}
                    </div>
                    <h4 className="recruiter-name" style={company.is_alumni_company ? {
                      color: '#7c3aed',
                      fontWeight: '600'
                    } : {}}>
                      {company.name || company.company_name}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Applications Table with Search - Always visible */}
          <div className="applications-section">
            <h3 className="section-title">
              <Users size={20} />
              Recent Applications
            </h3>
            
            <div className="search-box-unique">
              <div className="search-input-container">
                <Search className="search-icon-unique" size={20} />
                <input
                  type="text"
                  className="search-input-unique"
                  placeholder="Search by name, company, role, CTC, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="clear-search-btn" onClick={clearSearch}>
                    <X size={18} />
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="search-results-info">
                  Found {filteredApplications.length} result{filteredApplications.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="applications-table">
              <div className="table-container">
                <div className="table-header">
                  <div>Name</div>
                  <div>Company</div>
                  <div>Role</div>
                  <div>CTC</div>
                  <div>Date</div>
                  <div>Status</div>
                </div>
                {(searchTerm ? filteredApplications : (analyticsData?.applications || [])).length > 0 ? (
                  (searchTerm ? filteredApplications : (analyticsData?.applications || [])).map((application) => (
                    <div key={application.id} className="table-row">
                      <div className="table-cell name-cell">{application.name}</div>
                      <div className="table-cell">{application.company}</div>
                      <div className="table-cell">{application.role}</div>
                      <div className="table-cell ctc-cell">{application.ctc}</div>
                      <div className="table-cell">{new Date(application.date).toLocaleDateString()}</div>
                      <div className="table-cell">
                        <span className={`status-badge status-${application.status}`}>
                          {application.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-results" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <p style={{ fontSize: '16px', margin: 0 }}>
                      {searchTerm 
                        ? `No applications found matching "${searchTerm}"`
                        : 'No applications data available. Data will appear here once companies are assigned to alumni.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alumni message if not requested yet */}
          {userRole === 'alumni' && !hasRequestedPlacement && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '12px',
              margin: '20px 0'
            }}>
              <h3 style={{ color: '#7c3aed', marginBottom: '10px' }}>Get Started with Placement Process</h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                Submit your placement data request below to get access to assigned companies and provide feedback.
              </p>
            </div>
          )}

          {/* Quick Actions - Role Based */}
          <div className="quick-actions-section">
            <h3 className="section-title">
              {userRole === 'alumni' && !hasRequestedPlacement ? 'Get Started' : 'Quick Actions'}
            </h3>
            <div className="quick-actions-grid">
              {availableActions.map((action) => (
                <div 
                  key={action.id} 
                  className={`action-card ${action.completed ? 'action-card-completed' : ''}`}
                  onClick={() => handleQuickAction(action.id)}
                >
                  <div className="action-icon">{action.icon}</div>
                  <h4 className="action-title">{action.title}</h4>
                  <span className={`action-badge ${action.completed ? 'action-badge-completed' : ''}`}>
                    {action.badge}
                  </span>
                  <p className="action-text">{action.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    if (view === 'email-entry') {
      return <EmailEntryView />;
    }

    switch (view) {
      case 'dashboard':
        return <DashboardView />;
      case 'admin-dashboard':
       return (userRole === 'admin' || userRole === 'coordinator') ? (
          <div className="component-wrapper">
            <SimpleBackButton />
            <AdminDashboard />
          </div>
        ) : <DashboardView />;
      case 'assigned-companies':
        return (userRole === 'admin' || (userRole === 'alumni' && hasRequestedPlacement)) ? (
          <div className="component-wrapper">
            <SimpleBackButton />
            <AssignedCompanies userEmail={userEmail} />
          </div>
        ) : <DashboardView />;
      case 'add-company':
        return (userRole === 'admin' || userRole === 'coordinator') ? (
          <div className="component-wrapper">
            <SimpleBackButton />
            <CompanyRegistrationForm />
          </div>
        ) : <DashboardView />;
      case 'interview-results':
        return (userRole === 'admin' || userRole === 'coordinator') ? (
          <div className="component-wrapper">
            <SimpleBackButton />
            <InterviewResults />
          </div>
        ) : <DashboardView />;
      case 'placement-data-request':
        return (userRole === 'admin' || userRole === 'alumni') ? (
          <div className="component-wrapper">
            <SimpleBackButton />
            <PlacementDataRequestForm 
              userEmail={userEmail} 
              onSubmitSuccess={handlePlacementRequestSubmit}
            />
          </div>
        ) : <DashboardView />;
      case 'placement-feedback':
        return (userRole === 'admin' || userRole === 'coordinator') ? (
          <div className="component-wrapper">
            <SimpleBackButton />
            <PlacementFeedbackForm />
          </div>
        ) : <DashboardView />;
      case 'requester-feedback':
        return (userRole === 'admin' || (userRole === 'alumni' && hasRequestedPlacement)) ? (
          <div className="component-wrapper">
            <SimpleBackButton />
            <RequesterFeedbackForm userEmail={userEmail} />
          </div>
        ) : <DashboardView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="animated-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <main className="content-section">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default PlacementDashboard;