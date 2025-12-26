import React, { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle, XCircle, Clock, Save, ArrowLeft, Edit, FileText, AlertCircle } from 'lucide-react';

const InterviewResults = () => {
  const [alumniList, setAlumniList] = useState([]);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [alumniDetails, setAlumniDetails] = useState(null);
  const [companiesAssigned, setCompaniesAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  
  // New states for final status and remarks
  const [editingCompany, setEditingCompany] = useState(null);
  const [finalStatus, setFinalStatus] = useState('');
  const [coordinatorRemark, setCoordinatorRemark] = useState('');
  const [isSavingFinalStatus, setIsSavingFinalStatus] = useState(false);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // Fetch all alumni with company count
  useEffect(() => {
    fetchAlumniWithCounts();
  }, []);

  // CORRECTED: Final status calculation - Coordinator manually sets
  const fetchAlumniWithCounts = async () => {
    try {
      setLoading(true);
      
      const mappingsRes = await fetch(`${API_BASE_URL}/company-mapping`);
      const mappingsData = await mappingsRes.json();
      
      if (mappingsData.success) {
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
              selectedCount: 0,
              closureCount: 0,
              notDoableCount: 0,
              pendingCount: 0,
              finalStatus: 'pending' // Default
            });
          }
          
          const alumni = alumniMap.get(alumniId);
          alumni.companyCount++;
          
          // Count alumni statuses
          if (mapping.alumni_status === 'Applied' || mapping.alumni_status === 'In Process') {
            alumni.appliedCount++;
          }
          if (mapping.alumni_status === 'Selected') {
            alumni.selectedCount++;
          }
          
          // Count final statuses (coordinator manually sets)
          if (mapping.final_status === 'Closure') {
            alumni.closureCount++;
          }
          if (mapping.final_status === 'Not Doable') {
            alumni.notDoableCount++;
          }
          if (!mapping.final_status) {
            alumni.pendingCount++;
          }
        });
        
        // CORRECT LOGIC: Calculate overall final status for each alumni
        const alumniArray = Array.from(alumniMap.values());
        
        alumniArray.forEach(alumni => {
          // ✅ RULE 1: Coordinator at least one company ku "Closure" kudutha
          if (alumni.closureCount > 0) {
            alumni.finalStatus = 'closure';
            alumni.finalStatusLabel = '✅ Closure';
            alumni.finalStatusColor = '#10b981';
            alumni.finalStatusIcon = <CheckCircle size={14} />;
          }
          // ❌ RULE 2: Coordinator at least one company ku "Not Doable" kudutha
          else if (alumni.notDoableCount > 0) {
            alumni.finalStatus = 'not-doable';
            alumni.finalStatusLabel = '❌ Not Doable';
            alumni.finalStatusColor = '#ef4444';
            alumni.finalStatusIcon = <XCircle size={14} />;
          }
          // ⏳ RULE 3: Coordinator ethachu company-ku-um final status kudukkale
          else {
            alumni.finalStatus = 'pending';
            alumni.finalStatusLabel = '⏳ Pending';
            alumni.finalStatusColor = '#f59e0b';
            alumni.finalStatusIcon = <Clock size={14} />;
          }
        });
        
        setAlumniList(alumniArray);
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
      setUpdateSuccess(false);
      setUpdateError(null);
      setEditingCompany(null);
      
      // Fetch companies assigned to this alumni
      const companiesRes = await fetch(`${API_BASE_URL}/company-mapping/alumni/${alumni.id}`);
      const companiesData = await companiesRes.json();
      
      if (companiesData.success) {
        setCompaniesAssigned(companiesData.data || []);
      }
      
      // Fetch alumni details from members collection
      const memberRes = await fetch(`${API_BASE_URL}/members/email/${encodeURIComponent(alumni.email)}`);
      const memberData = await memberRes.json();
      
      if (memberData.success && memberData.member) {
        setAlumniDetails({
          name: memberData.member.name || alumni.name || 'N/A',
          email: memberData.member.email || alumni.email || 'N/A',
          phone: memberData.member.mobile || 'N/A',
          batch: memberData.member.batch || alumni.batch || 'N/A',
        });
      } else {
        setAlumniDetails({
          name: alumni.name || 'N/A',
          email: alumni.email || 'N/A',
          phone: 'Not available',
          batch: alumni.batch || 'N/A',
        });
      }
    } catch (error) {
      console.error('Error fetching alumni details:', error);
      setAlumniDetails({
        name: alumni.name || 'N/A',
        email: alumni.email || 'N/A',
        phone: 'Not available',
        batch: alumni.batch || 'N/A',
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
    setUpdateSuccess(false);
    setUpdateError(null);
    setEditingCompany(null);
  };

  // Function to update status to "Selected" only
  const handleMarkAsSelected = async (mappingId) => {
    if (!window.confirm('Are you sure you want to mark this as Selected? This action cannot be undone.')) {
      return;
    }

    try {
      setUpdatingStatus(mappingId);
      setUpdateError(null);
      
      const response = await fetch(`${API_BASE_URL}/company-mapping/${mappingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alumni_status: 'Selected',
          remarks: 'Marked as Selected by Coordinator'
        })
      });

      const data = await response.json();

      if (data.success) {
        setUpdateSuccess(true);
        
        // Update local state
        setCompaniesAssigned(prev => 
          prev.map(company => 
            company.mapping_id === mappingId 
              ? { ...company, alumni_status: 'Selected' }
              : company
          )
        );
        
        // Refresh the alumni counts
        setTimeout(() => {
          if (selectedAlumni) {
            fetchAlumniDetails(selectedAlumni);
          }
          fetchAlumniWithCounts();
        }, 500);
      } else {
        setUpdateError(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setUpdateError('Error updating status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Function to open final status edit form
  const handleEditFinalStatus = (company) => {
    setEditingCompany(company.mapping_id);
    setFinalStatus(company.final_status || '');
    setCoordinatorRemark(company.coordinator_remark || '');
  };

  // UPDATED: Function to save final status and coordinator remark
  const handleSaveFinalStatus = async (mappingId) => {
    if (!finalStatus && !coordinatorRemark) {
      setUpdateError('Please enter either final status or coordinator remark');
      return;
    }

    try {
      setIsSavingFinalStatus(true);
      setUpdateError(null);

      const response = await fetch(`${API_BASE_URL}/company-mapping/${mappingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          final_status: finalStatus || null,
          coordinator_remark: coordinatorRemark || null
        })
      });

      const data = await response.json();

      if (data.success) {
        setUpdateSuccess(true);
        
        // Update local state
        setCompaniesAssigned(prev => 
          prev.map(company => 
            company.mapping_id === mappingId 
              ? { 
                  ...company, 
                  final_status: finalStatus || null,
                  coordinator_remark: coordinatorRemark || null
                }
              : company
          )
        );
        
        // Reset form
        setEditingCompany(null);
        setFinalStatus('');
        setCoordinatorRemark('');
        
        // ✅ CRITICAL: Refresh alumni list with updated final status
        setTimeout(() => {
          if (selectedAlumni) {
            fetchAlumniDetails(selectedAlumni);
          }
          fetchAlumniWithCounts(); // This will recalculate final status
        }, 500);
        
      } else {
        setUpdateError(data.message || 'Failed to save final status');
      }
    } catch (error) {
      console.error('Error saving final status:', error);
      setUpdateError('Error saving final status. Please try again.');
    } finally {
      setIsSavingFinalStatus(false);
    }
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingCompany(null);
    setFinalStatus('');
    setCoordinatorRemark('');
    setUpdateError(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Not Applied': { bg: 'rgba(156, 163, 175, 0.1)', color: '#6b7280', icon: <Clock size={14} /> },
      'Applied': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: <Clock size={14} /> },
      'In Process': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: <Clock size={14} /> },
      'Selected': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: <CheckCircle size={14} /> },
      'Rejected': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: <XCircle size={14} /> }
    };
    return colors[status] || colors['Not Applied'];
  };

  const getFinalStatusColor = (status) => {
    const colors = {
      'Closure': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: <CheckCircle size={14} /> },
      'Not Doable': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: <XCircle size={14} /> },
      '': { bg: 'rgba(156, 163, 175, 0.1)', color: '#6b7280', icon: <AlertCircle size={14} /> }
    };
    return colors[status] || colors[''];
  };

  const getStatusAction = (status) => {
    if (status === 'Selected') {
      return { label: 'Already Selected', disabled: true };
    } else if (status === 'Rejected') {
      return { label: 'Cannot Select (Rejected)', disabled: true };
    } else {
      return { label: 'Mark as Selected', disabled: false };
    }
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
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '2rem', 
            marginBottom: '2rem', 
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            borderLeft: '6px solid #667eea'
          }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              Interview Results Dashboard
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Track alumni company assignments and mark selected candidates
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '1.5rem', 
            marginBottom: '2rem', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)' 
          }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ 
                position: 'absolute', 
                left: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#9ca3af', 
                width: '20px', 
                height: '20px' 
              }} />
              <input
                type="text"
                placeholder="Search by name, email, or batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem 0.75rem 3rem', 
                  border: '2px solid #e5e7eb', 
                  borderRadius: '12px', 
                  fontSize: '1rem', 
                  outline: 'none', 
                  transition: 'all 0.3s' 
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Alumni List */}
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '1.5rem', 
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem', 
              paddingBottom: '1rem', 
              borderBottom: '2px solid #f3f4f6' 
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                Alumni List ({filteredAlumni.length})
              </h2>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  border: '4px solid #f3f4f6', 
                  borderTop: '4px solid #667eea', 
                  borderRadius: '50%', 
                  margin: '0 auto 1rem', 
                  animation: 'spin 1s linear infinite' 
                }}></div>
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
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
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

                    {/* Final Status */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.375rem 0.75rem',
                          background: `${alumni.finalStatusColor}20`,
                          color: alumni.finalStatusColor,
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {alumni.finalStatusIcon}
                          {alumni.finalStatusLabel}
                        </div>
                        <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                          {alumni.closureCount > 0 && `${alumni.closureCount} Closure`}
                          {alumni.notDoableCount > 0 && `${alumni.notDoableCount} Not Doable`}
                          {alumni.pendingCount > 0 && `${alumni.pendingCount} Pending`}
                        </div>
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
                      View Details
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Back Button and Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
            <ArrowLeft size={18} />
            Back to List
          </button>
          
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1f2937' }}>
            Interview Outcomes Dashboard
          </h1>
        </div>

        {/* Success Message */}
        {updateSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <CheckCircle size={20} color="#10b981" />
            <span style={{ color: '#065f46', fontWeight: '500' }}>
              Status updated successfully!
            </span>
          </div>
        )}

        {/* Error Message */}
        {updateError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <XCircle size={20} color="#ef4444" />
            <span style={{ color: '#991b1b', fontWeight: '500' }}>
              {updateError}
            </span>
          </div>
        )}

        {detailsLoading ? (
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '3rem', 
            textAlign: 'center', 
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)' 
          }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              border: '4px solid #f3f4f6', 
              borderTop: '4px solid #667eea', 
              borderRadius: '50%', 
              margin: '0 auto 1rem', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            Loading alumni details...
          </div>
        ) : alumniDetails ? (
          <>
            {/* Profile Card */}
            <div style={{ 
              background: 'white', 
              borderRadius: '16px', 
              padding: '2rem', 
              marginBottom: '2rem', 
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)' 
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem' 
              }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
                  {alumniDetails.name}
                </h2>
                <span style={{ 
                  padding: '0.5rem 1rem', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  color: '#10b981', 
                  borderRadius: '20px', 
                  fontSize: '0.875rem', 
                  fontWeight: '600' 
                }}>
                  Alumni Profile
                </span>
              </div>

              {/* Info Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem', 
                marginBottom: '2rem' 
              }}>
                <div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    marginBottom: '0.5rem' 
                  }}>
                    📧 Email
                  </div>
                  <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>
                    {alumniDetails.email}
                  </div>
                </div>

                <div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    marginBottom: '0.5rem' 
                  }}>
                    📱 Phone
                  </div>
                  <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>
                    {alumniDetails.phone}
                  </div>
                </div>

                <div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    marginBottom: '0.5rem' 
                  }}>
                    🎓 Batch
                  </div>
                  <div style={{ fontSize: '1rem', color: '#1f2937', fontWeight: '500' }}>
                    {alumniDetails.batch}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ 
                  padding: '1.5rem', 
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
                  borderRadius: '12px', 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e40af' }}>
                    {companiesAssigned.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1e3a8a', marginTop: '0.5rem' }}>
                    Total Companies
                  </div>
                </div>

                <div style={{ 
                  padding: '1.5rem', 
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                  borderRadius: '12px', 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#b45309' }}>
                    {companiesAssigned.filter(c => c.alumni_status === 'Applied' || c.alumni_status === 'In Process').length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#92400e', marginTop: '0.5rem' }}>
                    In Progress
                  </div>
                </div>

                <div style={{ 
                  padding: '1.5rem', 
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
                  borderRadius: '12px', 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#065f46' }}>
                    {companiesAssigned.filter(c => c.alumni_status === 'Selected').length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#064e3b', marginTop: '0.5rem' }}>
                    Selected
                  </div>
                </div>
              </div>
            </div>

            {/* Companies Assigned - Coordinator can mark as Selected */}
            <div style={{ 
              background: 'white', 
              borderRadius: '16px', 
              padding: '2rem', 
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)' 
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1.5rem' 
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                  Assigned Companies - Status Management
                </h3>
                <div style={{ 
                  padding: '0.5rem 1rem', 
                  background: 'rgba(102, 126, 234, 0.1)', 
                  color: '#667eea', 
                  borderRadius: '20px', 
                  fontSize: '0.875rem', 
                  fontWeight: '600' 
                }}>
                  {companiesAssigned.filter(c => c.alumni_status === 'Selected').length} Selected
                </div>
              </div>

              {companiesAssigned.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {companiesAssigned.map((company, index) => {
                    const statusStyle = getStatusColor(company.alumni_status);
                    const finalStatusStyle = getFinalStatusColor(company.final_status || '');
                    const statusAction = getStatusAction(company.alumni_status);
                    
                    return (
                      <div key={index} style={{ 
                        padding: '1.5rem', 
                        background: '#f9fafb', 
                        borderRadius: '12px', 
                        border: '1px solid #e5e7eb',
                        position: 'relative'
                      }}>
                        {/* Status Badge */}
                        <div style={{ 
                          position: 'absolute', 
                          top: '1.5rem', 
                          right: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem', 
                          background: statusStyle.bg, 
                          color: statusStyle.color, 
                          borderRadius: '20px', 
                          fontSize: '0.875rem', 
                          fontWeight: '600' 
                        }}>
                          {statusStyle.icon}
                          {company.alumni_status}
                        </div>

                        {/* Final Status Badge */}
                        {(company.final_status || company.coordinator_remark) && !editingCompany && (
                          <div style={{ 
                            position: 'absolute', 
                            top: '4rem', 
                            right: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            maxWidth: '200px'
                          }}>
                            {company.final_status && (
                              <div style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem', 
                                background: finalStatusStyle.bg, 
                                color: finalStatusStyle.color, 
                                borderRadius: '20px', 
                                fontSize: '0.875rem', 
                                fontWeight: '600',
                                textAlign: 'center'
                              }}>
                                {finalStatusStyle.icon}
                                Final: {company.final_status}
                              </div>
                            )}
                            
                            {company.coordinator_remark && (
                              <div style={{ 
                                padding: '0.5rem 1rem', 
                                background: 'rgba(59, 130, 246, 0.1)', 
                                color: '#3b82f6', 
                                borderRadius: '12px', 
                                fontSize: '0.75rem',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                maxHeight: '100px',
                                overflowY: 'auto'
                              }}>
                                <div style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#3b82f6', 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.05em', 
                                  marginBottom: '0.25rem' 
                                }}>
                                  Coordinator Remark:
                                </div>
                                {company.coordinator_remark}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Company Info */}
                        <div style={{ marginRight: editingCompany ? '0' : '120px' }}>
                          <h4 style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: '600', 
                            color: '#1f2937', 
                            marginBottom: '0.25rem' 
                          }}>
                            {company.companyName}
                          </h4>
                          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Role: {company.companyRole}
                          </p>

                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '1rem', 
                            marginTop: '1rem' 
                          }}>
                            <div>
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#6b7280', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em', 
                                marginBottom: '0.25rem' 
                              }}>
                                Location
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>
                                📍 {company.companyLocation}
                              </div>
                            </div>

                            <div>
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#6b7280', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em', 
                                marginBottom: '0.25rem' 
                              }}>
                                CTC
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>
                                💰 {company.companyCtc}
                              </div>
                            </div>

                            <div>
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#6b7280', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em', 
                                marginBottom: '0.25rem' 
                              }}>
                                Assigned On
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>
                                📅 {company.assigned_on ? new Date(company.assigned_on).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* Final Status Edit Form or Edit Button */}
                          {editingCompany === company.mapping_id ? (
                            <div style={{ 
                              marginTop: '1.5rem', 
                              padding: '1.5rem', 
                              background: '#f0f9ff', 
                              borderRadius: '12px', 
                              border: '1px solid #bae6fd'
                            }}>
                              <h5 style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600', 
                                color: '#0369a1', 
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <Edit size={16} />
                                Edit Final Status & Remarks
                              </h5>
                              
                              <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                  <label style={{ 
                                    display: 'block', 
                                    fontSize: '0.875rem', 
                                    fontWeight: '500', 
                                    color: '#374151', 
                                    marginBottom: '0.5rem' 
                                  }}>
                                    Final Status
                                  </label>
                                  <select
                                    value={finalStatus}
                                    onChange={(e) => setFinalStatus(e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem',
                                      border: '2px solid #d1d5db',
                                      borderRadius: '8px',
                                      fontSize: '0.875rem',
                                      outline: 'none',
                                      background: 'white',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">Select final status (optional)</option>
                                    <option value="Closure">Closure</option>
                                    <option value="Not Doable">Not Doable</option>
                                  </select>
                                </div>

                                <div>
                                  <label style={{ 
                                    display: 'block', 
                                    fontSize: '0.875rem', 
                                    fontWeight: '500', 
                                    color: '#374151', 
                                    marginBottom: '0.5rem' 
                                  }}>
                                    Coordinator Remarks (optional)
                                  </label>
                                  <textarea
                                    value={coordinatorRemark}
                                    onChange={(e) => setCoordinatorRemark(e.target.value)}
                                    placeholder="Enter any remarks or notes..."
                                    rows={3}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem',
                                      border: '2px solid #d1d5db',
                                      borderRadius: '8px',
                                      fontSize: '0.875rem',
                                      outline: 'none',
                                      background: 'white',
                                      resize: 'vertical'
                                    }}
                                  />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                  <button
                                    onClick={handleCancelEdit}
                                    style={{
                                      padding: '0.75rem 1.5rem',
                                      background: 'white',
                                      color: '#6b7280',
                                      border: '2px solid #d1d5db',
                                      borderRadius: '8px',
                                      fontSize: '0.875rem',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f3f4f6';
                                      e.currentTarget.style.borderColor = '#9ca3af';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'white';
                                      e.currentTarget.style.borderColor = '#d1d5db';
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveFinalStatus(company.mapping_id)}
                                    disabled={isSavingFinalStatus}
                                    style={{
                                      padding: '0.75rem 1.5rem',
                                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '8px',
                                      fontSize: '0.875rem',
                                      fontWeight: '600',
                                      cursor: isSavingFinalStatus ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.3s',
                                      opacity: isSavingFinalStatus ? 0.7 : 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSavingFinalStatus) {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                  >
                                    {isSavingFinalStatus ? (
                                      <>
                                        <div style={{ 
                                          width: '16px', 
                                          height: '16px', 
                                          border: '2px solid rgba(255,255,255,0.3)', 
                                          borderTop: '2px solid white', 
                                          borderRadius: '50%', 
                                          animation: 'spin 1s linear infinite' 
                                        }} />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <Save size={16} />
                                        Save Final Status
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Coordinator Action Button */}
                              <div style={{ 
                                marginTop: '1.5rem', 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <button
                                  onClick={() => handleEditFinalStatus(company)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                  <Edit size={16} />
                                  {company.final_status ? 'Edit Final Status' : 'Add Final Status'}
                                </button>

                                <button
                                  onClick={() => handleMarkAsSelected(company.mapping_id)}
                                  disabled={statusAction.disabled || updatingStatus === company.mapping_id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    background: statusAction.disabled 
                                      ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
                                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: statusAction.disabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s',
                                    opacity: statusAction.disabled ? 0.7 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!statusAction.disabled && updatingStatus !== company.mapping_id) {
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                >
                                  {updatingStatus === company.mapping_id ? (
                                    <>
                                      <div style={{ 
                                        width: '16px', 
                                        height: '16px', 
                                        border: '2px solid rgba(255,255,255,0.3)', 
                                        borderTop: '2px solid white', 
                                        borderRadius: '50%', 
                                        animation: 'spin 1s linear infinite' 
                                      }} />
                                      Updating...
                                    </>
                                  ) : (
                                    <>
                                      <Save size={16} />
                                      {statusAction.label}
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {company.remarks && company.remarks !== 'Marked as Selected by Coordinator' && (
                          <div style={{ 
                            marginTop: '1rem', 
                            padding: '0.75rem', 
                            background: '#f3f4f6', 
                            borderRadius: '8px' 
                          }}>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#6b7280', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.05em', 
                              marginBottom: '0.25rem' 
                            }}>
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

              {/* Updated Coordinator Instructions */}
              <div style={{ 
                marginTop: '2rem', 
                padding: '1rem', 
                background: 'rgba(245, 158, 11, 0.1)', 
                borderRadius: '12px', 
                border: '1px solid rgba(245, 158, 11, 0.3)' 
              }}>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#92400e', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <AlertCircle size={16} />
                  Coordinator Final Status - IMPORTANT:
                </div>
                <ul style={{ 
                  fontSize: '0.875rem', 
                  color: '#92400e', 
                  paddingLeft: '1.5rem',
                  margin: 0
                }}>
                  <li><strong>✅ Closure</strong> - MANUALLY set when alumni responded (even if rejected)</li>
                  <li><strong>❌ Not Doable</strong> - MANUALLY set when alumni no response/ghosted</li>
                  <li><strong>⏳ Pending</strong> - DEFAULT - you haven't taken any action yet</li>
                  <li><strong>Note:</strong> Alumni "Selected" status is separate. YOU must mark Closure.</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            background: 'white', 
            borderRadius: '16px', 
            padding: '3rem', 
            textAlign: 'center', 
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)' 
          }}>
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

export default InterviewResults;