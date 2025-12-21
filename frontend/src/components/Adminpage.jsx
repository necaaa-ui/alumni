import React, { useState, useEffect } from 'react';
import './Common.css';
import './AdminDashboard.css';

const Adminpage = () => {
  const [activeView, setActiveView] = useState(null);
  const [showRemoveDomain, setShowRemoveDomain] = useState(false);
  const [domains, setDomains] = useState([{ department: '', domain: '' }]);
  const [activeCoordinatorView, setActiveCoordinatorView] = useState(null);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [showAddDepartmentForm, setShowAddDepartmentForm] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [deptCoordinator, setDeptCoordinator] = useState({ name: '', email: '', department: '', phoneNumber: '' });
  const [deptCoordinatorLoading, setDeptCoordinatorLoading] = useState(false);
  const [coordinators, setCoordinators] = useState([]);
  const [coordinatorsLoading, setCoordinatorsLoading] = useState(false);
  const [phaseId, setPhaseId] = useState('');
  const [startingDate, setStartingDate] = useState('');
  const [endingDate, setEndingDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPhase, setCurrentPhase] = useState(null);
  const [phaseLoading, setPhaseLoading] = useState(true);
  const [webinars, setWebinars] = useState([]);
  const [webinarsLoading, setWebinarsLoading] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  const [speakerSearchTerm, setSpeakerSearchTerm] = useState('');
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ phaseIds: [], domains: [], batches: [], departments: [] });
  const [selectedFilters, setSelectedFilters] = useState({ phaseId: '', domain: '', speakerName: '', batch: '', department: '' });

  // Fetch current phase on component mount
  useEffect(() => {
    const fetchCurrentPhase = async () => {
      try {
        const response = await fetch('/api/current-phase');
        const data = await response.json();
        setCurrentPhase(data);
      } catch (error) {
        console.error('Error fetching current phase:', error);
      } finally {
        setPhaseLoading(false);
      }
    };

    fetchCurrentPhase();
  }, []);

  // Fetch webinars, filter options, and speakers when webinar view is active
  useEffect(() => {
    if (activeView === 'webinar') {
      const fetchWebinars = async () => {
        setWebinarsLoading(true);
        try {
          const response = await fetch('/api/webinars');
          const webinarsData = await response.json();

          // Fetch phone numbers for each speaker
          const webinarsWithPhones = await Promise.all(
            webinarsData.map(async (webinar) => {
              if (webinar.speaker?.email) {
                try {
                  const memberResponse = await fetch(`/api/coordinators/member-by-email?email=${webinar.speaker.email}`);
                  const memberData = await memberResponse.json();
                  return {
                    ...webinar,
                    speaker: {
                      ...webinar.speaker,
                      phoneNumber: memberData.contact_no || 'N/A'
                    }
                  };
                } catch (error) {
                  console.error('Error fetching phone for speaker:', webinar.speaker.email, error);
                  return {
                    ...webinar,
                    speaker: {
                      ...webinar.speaker,
                      phoneNumber: 'N/A'
                    }
                  };
                }
              }
              return {
                ...webinar,
                speaker: {
                  ...webinar.speaker,
                  phoneNumber: 'N/A'
                }
              };
            })
          );

          setWebinars(webinarsWithPhones);
        } catch (error) {
          console.error('Error fetching webinars:', error);
        } finally {
          setWebinarsLoading(false);
        }
      };

      const fetchFilterOptions = async () => {
        try {
          console.log('Fetching filter options...');
          const response = await fetch('/api/filter-options');
          console.log('Filter options response status:', response.status);
          const data = await response.json();
          console.log('Filter options data:', data);
          setFilterOptions(data);
        } catch (error) {
          console.error('Error fetching filter options:', error);
        }
      };

      const fetchSpeakers = async () => {
        try {
          const response = await fetch('/api/speakers');
          const speakersData = await response.json();
          setSpeakers(speakersData);
        } catch (error) {
          console.error('Error fetching speakers:', error);
        }
      };

      fetchWebinars();
      fetchFilterOptions();
      fetchSpeakers();
    }
  }, [activeView]);

  // Fetch speakers when speakers view is active
  useEffect(() => {
    if (activeView === 'speakers') {
      const fetchSpeakers = async () => {
        setSpeakersLoading(true);
        try {
          const response = await fetch('/api/speakers');
          const speakersData = await response.json();
          setSpeakers(speakersData);
        } catch (error) {
          console.error('Error fetching speakers:', error);
        } finally {
          setSpeakersLoading(false);
        }
      };

      fetchSpeakers();
    }
  }, [activeView]);

  // Fetch coordinators when coordinators view is active
  useEffect(() => {
    if (activeView === 'coordiators') {
      fetchCoordinators();
    }
  }, [activeView]);

  const handleCreatePhase = async () => {
    // Validate inputs
    if (!phaseId || !startingDate || !endingDate) {
      setMessage('Please fill in all required fields.');
      return;
    }

    // Validate domains
    const validDomains = domains.filter(d => d.department && d.domain);
    if (validDomains.length === 0) {
      setMessage('Please add at least one domain with department and domain name.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const phaseData = {
        phaseId: parseInt(phaseId),
        startingDate,
        endingDate,
        domains: validDomains
      };

      const response = await fetch('/api/webinar-phases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(phaseData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Phase created successfully!');
        // Reset form
        setPhaseId('');
        setStartingDate('');
        setEndingDate('');
        setDomains([{ department: '', domain: '' }]);
      } else {
        setMessage(result.message || 'Failed to create phase.');
      }
    } catch (error) {
      console.error('Error creating phase:', error);
      setMessage('An error occurred while creating the phase.');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding student coordinator
  const handleAddStudentCoordinator = async () => {
    if (!studentEmail.trim()) {
      alert('Please enter a student email.');
      return;
    }

    try {
      const response = await fetch('/api/coordinators/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: studentEmail.trim(), role: 'student' }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Student coordinator added successfully!');
        setStudentEmail('');
        setShowAddStudentForm(false);
        // Refresh coordinators list
        fetchCoordinators();
      } else {
        alert(result.message || 'Failed to add student coordinator.');
      }
    } catch (error) {
      console.error('Error adding student coordinator:', error);
      alert('An error occurred while adding the student coordinator.');
    }
  };

  // Handle email change for department coordinator auto-fetch
  const handleDeptCoordinatorEmailChange = async (email) => {
    setDeptCoordinator({ ...deptCoordinator, email });
    if (!email.trim()) return;

    setDeptCoordinatorLoading(true);
    try {
      const response = await fetch(`/api/coordinators/member-by-email?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();

      if (data.found) {
        setDeptCoordinator({
          name: data.name || '',
          email: email.trim(),
          department: data.department || '',
          phoneNumber: data.contact_no || ''
        });
      } else {
        // Clear other fields if member not found
        setDeptCoordinator({
          name: '',
          email: email.trim(),
          department: '',
          phoneNumber: ''
        });
      }
    } catch (error) {
      console.error('Error fetching member details:', error);
      // Clear other fields on error
      setDeptCoordinator({
        name: '',
        email: email.trim(),
        department: '',
        phoneNumber: ''
      });
    } finally {
      setDeptCoordinatorLoading(false);
    }
  };

  // Handle adding department coordinator
  const handleAddDepartmentCoordinator = async () => {
    if (!deptCoordinator.name.trim() || !deptCoordinator.email.trim() || !deptCoordinator.department.trim() || !deptCoordinator.phoneNumber.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      const response = await fetch('/api/coordinators/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: deptCoordinator.email.trim(),
          role: 'department',
          name: deptCoordinator.name.trim(),
          department: deptCoordinator.department.trim(),
          phoneNumber: deptCoordinator.phoneNumber.trim()
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Department coordinator added successfully!');
        setDeptCoordinator({ name: '', email: '', department: '', phoneNumber: '' });
        setShowAddDepartmentForm(false);
        // Refresh coordinators list
        fetchCoordinators();
      } else {
        alert(result.message || 'Failed to add department coordinator.');
      }
    } catch (error) {
      console.error('Error adding department coordinator:', error);
      alert('An error occurred while adding the department coordinator.');
    }
  };

  // Fetch coordinators
  const fetchCoordinators = async () => {
    setCoordinatorsLoading(true);
    try {
      const response = await fetch('/api/coordinators');
      const data = await response.json();
      setCoordinators(data);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
    } finally {
      setCoordinatorsLoading(false);
    }
  };

  const filteredWebinars = webinars.filter(webinar => {
    const { phaseId, domain, speakerName, batch, department } = selectedFilters;
    return (
      (!phaseId || webinar.phaseId === parseInt(phaseId)) &&
      (!domain || webinar.domain === domain) &&
      (!speakerName || webinar.speaker?.name?.toLowerCase().startsWith(speakerName.toLowerCase())) &&
      (!batch || webinar.speaker?.batch === batch) &&
      (!department || webinar.speaker?.department === department)
    );
  });

  const filteredSpeakers = speakers.filter(speaker =>
    speaker.name?.toLowerCase().includes(speakerSearchTerm.toLowerCase())
  );

  const renderContent = () => {
  switch (activeView) {
    case "phase":
      return (
        <div className="form-card">
          <h2
            className="form-title"
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            Phase Management
          </h2>

          <div className="form-fields">
            <div className="form-group">
              <label>Phase ID</label>
              <input
                type="number"
                placeholder="e.g., 1"
                className="input-field"
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Starting Date</label>
              <input
                type="date"
                className="input-field"
                value={startingDate}
                onChange={(e) => setStartingDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Ending Date</label>
              <input
                type="date"
                className="input-field"
                value={endingDate}
                onChange={(e) => setEndingDate(e.target.value)}
              />
            </div>
            <h2 style={{ fontWeight: "bold" , fontSize: '20px' }}>Domain Details</h2>
            {domains.map((domain, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: "0.5 1 0%" }}>
                      <label>Department</label>
                      <select
                        className="input-field"
                        style={{ width: "100%" }}
                        value={domain.department}
                        onChange={(e) => {
                          const newDomains = [...domains];
                          newDomains[index].department = e.target.value;
                          setDomains(newDomains);
                        }}
                      >
                        <option value="">Select</option>
                        <option value="IT">IT</option>
                        <option value="CSE">CSE</option>
                        <option value="EEE">EEE</option>
                        <option value="ECE">ECE</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                        <option value="AD & DS">AD & DS</option>
                      </select>
                    </div>

                  <div className="form-group" style={{ flex: '2 1 0%' }}>
                    <label>Domain </label>
                    <input
                      type="text"
                      placeholder="Domain"
                      className="input-field"
                      value={domain.domain}
                      onChange={(e) => {
                        const newDomains = [...domains];
                        newDomains[index].domain = e.target.value;
                        setDomains(newDomains);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button
                className="submit1-btn"
                onClick={() => setDomains([...domains, { department: '', domain: '' }])}
              >
                +
              </button>
            </div>
            {message && (
              <div style={{
                marginTop: '1rem',
                padding: '0.5rem',
                borderRadius: '4px',
                backgroundColor: message.includes('successfully') ? '#d4edda' : '#f8d7da',
                color: message.includes('successfully') ? '#155724' : '#721c24',
                border: `1px solid ${message.includes('successfully') ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                {message}
              </div>
            )}
            <button
              className="submit-btn"
              onClick={handleCreatePhase}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Phase'}
            </button>
          </div>
        );
     case 'webinar':
        return (
          <div className="form-card filter-card">
            <div className="filters">
              <select
                className="input-field"
                value={selectedFilters.phaseId}
                onChange={(e) => setSelectedFilters({ ...selectedFilters, phaseId: e.target.value })}
              >
                <option value="">All Phases</option>
                {filterOptions.phases?.map(phase => (
                  <option key={phase.id} value={phase.id}>{phase.name}</option>
                ))}
              </select>
              <select
                className="input-field"
                value={selectedFilters.domain}
                onChange={(e) => setSelectedFilters({ ...selectedFilters, domain: e.target.value })}
              >
                <option value="">All Domains</option>
                {filterOptions.domains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Speaker Name (starts with)"
                className="input-field"
                value={selectedFilters.speakerName}
                onChange={(e) => setSelectedFilters({ ...selectedFilters, speakerName: e.target.value })}
              />
              <select
                className="input-field"
                value={selectedFilters.batch}
                onChange={(e) => setSelectedFilters({ ...selectedFilters, batch: e.target.value })}
              >
                <option value="">All Batches</option>
                {filterOptions.batches.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
              <select
                className="input-field"
                value={selectedFilters.department}
                onChange={(e) => setSelectedFilters({ ...selectedFilters, department: e.target.value })}
              >
                <option value="">All Departments</option>
                {filterOptions.departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div style={{ overflowX: 'auto', width: '100%', marginTop: '1rem' }}>
              <div style={{ width: "100%", overflowX: "auto" }}>
  <table style={{ width: "1600px", borderCollapse: "collapse" }}>
    <thead>
      <tr style={{ backgroundColor: "#eee", paddingTop: "15px", paddingBottom: "15px" }}>
        <th style={{  width: "177px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Phase ID</th>
        <th style={{  width: "350px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Domain</th>
        <th style={{  width: "400px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Webinar Topic</th>
        <th style={{  width: "350px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Name</th>
        <th style={{  width: "350px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Email</th>
        <th style={{  width: "230px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Phone Number </th>
        <th style={{  width: "300px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Batch & Dept</th>
        <th style={{  width: "300px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Designation & Company</th>
        <th style={{  width: "300px",padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>City</th>
      </tr>
    </thead>

    <tbody>
      {webinarsLoading ? (
        <tr>
          <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
            Loading webinars...
          </td>
        </tr>
      ) : filteredWebinars.length === 0 ? (
        <tr>
          <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
            No webinars found
          </td>
        </tr>
      ) : (
        filteredWebinars.map((webinar, index) => (
          <tr key={index}>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{webinar.phaseId}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{webinar.domain}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{webinar.topic}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{webinar.speaker?.name || 'N/A'}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{webinar.speaker?.email || 'N/A'}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{webinar.speaker?.phoneNumber || 'N/A'}</td>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
              {webinar.speaker?.batch ? `${webinar.speaker.batch} & ${webinar.speaker.department || 'N/A'}` : 'N/A'}
            </td>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
              {webinar.speaker?.designation ? `${webinar.speaker.designation} & ${webinar.speaker.companyName || 'N/A'}` : 'N/A'}
            </td>
            <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{webinar.alumniCity || 'N/A'}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

            </div>
          </div>
        );
      case 'coordiators':
        return (
        <div>
          <div className="form-card">
            <h2 className="form-title" style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>Coordinators Management</h2>
            <div className="admin-buttons" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button className={`submit1-btn ${activeCoordinatorView === 'student' ? 'active' : ''}`} onClick={() => { setActiveCoordinatorView('student'); setShowAddDepartmentForm(false); setShowAddStudentForm(false); }}>Student Coordinators</button>
                <button className={`submit1-btn ${activeCoordinatorView === 'department' ? 'active' : ''}`} onClick={() => { setActiveCoordinatorView('department'); setShowAddStudentForm(false); setShowAddDepartmentForm(false); }}>Department Coordinators</button>
            </div>
            {activeCoordinatorView === 'student' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{fontWeight: "bold" , fontSize: '30px' ,margin: 0}}>Student Coordinators</h3>
                        <button className="submit2-btn" onClick={() => setShowAddStudentForm(!showAddStudentForm)}>Add Coordinator</button>
                    </div>

                    {showAddStudentForm && (
                        <div className="form-fields" style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '8px' }}>
                            <div className="form-group">
                                <label>Student Email</label>
                                <input type="email" placeholder="Enter student email to fetch details" className="input-field" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                            </div>
                            <button className="submit-btn" onClick={handleAddStudentCoordinator}>Add</button>
                        </div>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#eee' }}>
                                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Student Name</th>
                                <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>Email</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Department</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Phone Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coordinatorsLoading ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                                        Loading coordinators...
                                    </td>
                                </tr>
                            ) : coordinators.filter(coord => coord.role === 'student').length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                                        No student coordinators found
                                    </td>
                                </tr>
                            ) : (
                                coordinators.filter(coord => coord.role === 'student').map((coord, index) => (
                                    <tr key={index}>
                                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.name || 'N/A'}</td>
                                        <td style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.email || 'N/A'}</td>
                                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.department || 'N/A'}</td>
                                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.phoneNumber || 'N/A'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeCoordinatorView === 'department' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{fontWeight: "bold" , fontSize: '30px' ,margin: 0}}>Department Coordinators</h3>
                        <button className="submit2-btn" onClick={() => setShowAddDepartmentForm(!showAddDepartmentForm)}>Add Coordinator</button>
                    </div>

                    {showAddDepartmentForm && (
                        <div className="form-fields" style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '8px' }}>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" placeholder="Name" className="input-field" value={deptCoordinator.name} onChange={(e) => setDeptCoordinator({ ...deptCoordinator, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="Enter email to auto-fetch details"
                                    className="input-field"
                                    value={deptCoordinator.email}
                                    onChange={(e) => handleDeptCoordinatorEmailChange(e.target.value)}
                                    disabled={deptCoordinatorLoading}
                                />
                                {deptCoordinatorLoading && <span style={{ marginLeft: '10px', color: '#666' }}>Fetching details...</span>}
                            </div>
                            <div className="form-group">
                                <label>Department</label>
                                <input type="text" placeholder="Department" className="input-field" value={deptCoordinator.department} onChange={(e) => setDeptCoordinator({ ...deptCoordinator, department: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input type="text" placeholder="Phone Number" className="input-field" value={deptCoordinator.phoneNumber} onChange={(e) => setDeptCoordinator({ ...deptCoordinator, phoneNumber: e.target.value })} />
                            </div>
                            <button className="submit-btn" onClick={handleAddDepartmentCoordinator}>Add</button>
                        </div>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#eee' }}>
                                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Faculty Name</th>
                                <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>Email</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Department</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Phone Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coordinatorsLoading ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                                        Loading coordinators...
                                    </td>
                                </tr>
                            ) : coordinators.filter(coord => coord.role === 'department').length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                                        No department coordinators found
                                    </td>
                                </tr>
                            ) : (
                                coordinators.filter(coord => coord.role === 'department').map((coord, index) => (
                                    <tr key={index}>
                                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.name || 'N/A'}</td>
                                        <td style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.email || 'N/A'}</td>
                                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.department || 'N/A'}</td>
                                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.phoneNumber || 'N/A'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="student-form-page">
      <div className="background-orbs">
        <div className="orb orb-purple"></div>
        <div className="orb orb-blue"></div>
        <div className="orb orb-pink"></div>
      </div>
      <div className="form-wrapper">
        <div className="form-container">
          <div className="form-header">
            <h1 className="form-title">Admin Dashboard</h1>
            {/* Current Phase Display */}
            {!phaseLoading && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: currentPhase?.found ? '#e8f5e8' : '#fff3cd',
                border: `1px solid ${currentPhase?.found ? '#c3e6cb' : '#ffeaa7'}`,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                {currentPhase?.found ? (
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#155724' }}>
                      Current Active Phase: {currentPhase.displayText}
                    </h3>
                    <p style={{ margin: 0, color: '#155724', fontSize: '0.9rem' }}>
                      Phase ID: {currentPhase.phaseId} | Domains: {currentPhase.domains?.length || 0}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>
                      No Active Phase Found
                    </h3>
                    <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem' }}>
                      {currentPhase?.message || 'Please create a phase to get started.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="admin-buttons">
            <button className="submit-btn" onClick={() => setActiveView('phase')}>Phase Management</button>
            <button className="submit-btn" onClick={() => setActiveView('webinar')}>Webinar Details</button>
            {/* <button className="submit-btn" onClick={() => setActiveView('domain')}>Domain Management</button> */}
            <button className="submit-btn" onClick={() => setActiveView('coordiators')}>Coordinators Management</button>
          </div>
          <div className="content-area">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Adminpage;