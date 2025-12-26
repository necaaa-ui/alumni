import React, { useState, useEffect } from 'react';
import { Search, Eye } from 'lucide-react';

const InterviewResultsView = () => {
  const [alumniList, setAlumniList] = useState([]);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [alumniDetails, setAlumniDetails] = useState(null);
  const [companiesAssigned, setCompaniesAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Fetch all alumni with company count
  useEffect(() => {
    fetchAlumniWithCounts();
  }, []);

  const fetchAlumniWithCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch all mappings
      const mappingsRes = await fetch(`${API_BASE_URL}/company-mapping`);
      const mappingsData = await mappingsRes.json();
      
      if (mappingsData.success) {
        // Group by alumni and count companies
        const alumniMap = new Map();
        
        mappingsData.data.forEach(mapping => {
          const alumniId = mapping.alumni_user_id;
          if (!alumniMap.has(alumniId)) {
            alumniMap.set(alumniId, {
              id: alumniId,
              name: mapping.alumniName,
              batch: mapping.alumniBatch,
              email: mapping.alumniEmail,
              companyCount: 0,
              appliedCount: 0,
              selectedCount: 0
            });
          }
          
          const alumni = alumniMap.get(alumniId);
          alumni.companyCount++;
          
          if (mapping.alumni_status === 'Applied' || mapping.alumni_status === 'In Process') {
            alumni.appliedCount++;
          }
          if (mapping.alumni_status === 'Selected') {
            alumni.selectedCount++;
          }
        });
        
        setAlumniList(Array.from(alumniMap.values()));
      }
    } catch (error) {
      console.error('Error fetching alumni:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumniDetails = async (alumni) => {
    try {
      setDetailsLoading(true);
      
      // First, fetch companies assigned to this alumni
      const companiesRes = await fetch(`${API_BASE_URL}/company-mapping/alumni/${alumni.id}`);
      const companiesData = await companiesRes.json();
      
      if (companiesData.success) {
        setCompaniesAssigned(companiesData.data || []);
      }
      
      // Then, fetch alumni details from members collection using email
      const memberRes = await fetch(`${API_BASE_URL}/members/email/${encodeURIComponent(alumni.email)}`);
      const memberData = await memberRes.json();
      
      if (memberData.success && memberData.member) {
        setAlumniDetails({
          name: memberData.member.name || alumni.name || 'N/A',
          email: memberData.member.email || alumni.email || 'N/A',
          phone: memberData.member.mobile || 'N/A',
          batch: memberData.member.batch || alumni.batch || 'N/A',
          skills: [] // You can add skills if available
        });
      } else {
        // If member API fails, use the data from alumni list
        setAlumniDetails({
          name: alumni.name || 'N/A',
          email: alumni.email || 'N/A',
          phone: 'Not available',
          batch: alumni.batch || 'N/A',
          skills: []
        });
      }
    } catch (error) {
      console.error('Error fetching alumni details:', error);
      // Fallback to alumni list data
      setAlumniDetails({
        name: alumni.name || 'N/A',
        email: alumni.email || 'N/A',
        phone: 'Not available',
        batch: alumni.batch || 'N/A',
        skills: []
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewMore = (alumni) => {
    setSelectedAlumni(alumni);
    fetchAlumniDetails(alumni);
  };

  const handleBackToList = () => {
    setSelectedAlumni(null);
    setAlumniDetails(null);
    setCompaniesAssigned([]);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Not Applied': { bg: 'rgba(156, 163, 175, 0.1)', color: '#6b7280' },
      'Applied': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
      'In Process': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
      'Selected': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
      'Rejected': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
    };
    return colors[status] || colors['Not Applied'];
  };

  const filteredAlumni = alumniList.filter(alumni => 
    alumni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alumni.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alumni.batch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // LIST VIEW
  if (!selectedAlumni) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              Interview Outcomes Dashboard
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Track alumni company assignments and application status
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: '20px', height: '20px' }} />
              <input
                type="text"
                placeholder="Search by name, email, or batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '1rem', outline: 'none', transition: 'all 0.3s' }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Alumni List */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #f3f4f6' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                Alumni List ({filteredAlumni.length})
              </h2>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ width: '50px', height: '50px', border: '4px solid #f3f4f6', borderTop: '4px solid #667eea', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}></div>
                Loading alumni...
              </div>
            ) : filteredAlumni.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                No alumni found
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredAlumni.map((alumni, index) => (
                  <div 
                    key={index}
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                      gap: '1rem',
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
                      borderRadius: '12px',
                      border: '1px solid #e0e7ff',
                      alignItems: 'center',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Name & Details */}
                    <div>
                      <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                        {alumni.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {alumni.email}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        Batch: {alumni.batch}
                      </div>
                    </div>

                    {/* Companies Assigned */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: '#667eea' }}>
                        {alumni.companyCount}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Companies
                      </div>
                    </div>

                    {/* Applied */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b' }}>
                        {alumni.appliedCount}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Applied
                      </div>
                    </div>

                    {/* Selected */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>
                        {alumni.selectedCount}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Selected
                      </div>
                    </div>

                    {/* View More Button */}
                    <button
                      onClick={() => handleViewMore(alumni)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Eye size={16} />
                      View More
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // DETAIL VIEW
  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Back Button */}
        <button
          onClick={handleBackToList}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'white',
            color: '#667eea',
            border: '2px solid #667eea',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#667eea';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#667eea';
          }}
        >
          ← Back to List
        </button>

        {detailsLoading ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '3rem', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ width: '50px', height: '50px', border: '4px solid #f3f4f6', borderTop: '4px solid #667eea', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}></div>
            Loading details...
          </div>
        ) : alumniDetails ? (
          <>
            {/* Profile Card */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
                  {alumniDetails.name}
                </h2>
                <span style={{ padding: '0.5rem 1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '600' }}>
                  Active
                </span>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    📧 Email
                  </div>
                  <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>
                    {alumniDetails.email}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    📱 Phone
                  </div>
                  <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>
                    {alumniDetails.phone}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    🎓 Batch
                  </div>
                  <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>
                    {alumniDetails.batch}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e40af' }}>
                    {companiesAssigned.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1e3a8a', marginTop: '0.5rem' }}>
                    Total Companies
                  </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b45309' }}>
                    {companiesAssigned.filter(c => c.alumni_status === 'Applied' || c.alumni_status === 'In Process').length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#92400e', marginTop: '0.5rem' }}>
                    In Progress
                  </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#065f46' }}>
                    {companiesAssigned.filter(c => c.alumni_status === 'Selected').length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#064e3b', marginTop: '0.5rem' }}>
                    Selected
                  </div>
                </div>
              </div>
            </div>

            {/* Companies Assigned */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1.5rem' }}>
                Assigned Companies
              </h3>

              {companiesAssigned.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {companiesAssigned.map((company, index) => {
                    const statusStyle = getStatusColor(company.alumni_status);
                    return (
                      <div key={index} style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                              {company.companyName}
                            </h4>
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                              {company.companyRole}
                            </p>
                          </div>
                          <span style={{ padding: '0.5rem 1rem', background: statusStyle.bg, color: statusStyle.color, borderRadius: '20px', fontSize: '0.875rem', fontWeight: '600' }}>
                            {company.alumni_status}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                              Location
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>
                              📍 {company.companyLocation}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                              CTC
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>
                              💰 {company.companyCtc}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                              Assigned On
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>
                              📅 {company.assigned_on ? new Date(company.assigned_on).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {company.remarks && (
                          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                              Remarks
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                              {company.remarks}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                  No companies assigned to this alumni
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', padding: '3rem', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '1rem' }}>
              ⚠️
            </div>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Could not load alumni details. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewResultsView;