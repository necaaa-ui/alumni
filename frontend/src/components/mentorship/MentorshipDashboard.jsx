// pages/MentorshipDashboard.js - WITH DYNAMIC PAGINATION
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import './MentorshippDashboard1.css';

// Add API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function MentorshipDashboard() {
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
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [meetingStats, setMeetingStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  });
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meetingFilters, setMeetingFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    email: '',
    phase: 'all'
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // ========== PAGINATION STATE ==========
  const [currentMeetingPage, setCurrentMeetingPage] = useState(1);
  const [meetingsPerPage] = useState(5);
  
  const [currentAssignmentPage, setCurrentAssignmentPage] = useState(1);
  const [assignmentsPerPage] = useState(5);
  
  const [currentMentorPage, setCurrentMentorPage] = useState(1);
  const [mentorsPerPage] = useState(5);
  
  const [currentMenteePage, setCurrentMenteePage] = useState(1);
  const [menteesPerPage] = useState(5);
  
  const [currentFeedbackPage, setCurrentFeedbackPage] = useState(1);
  const [feedbacksPerPage] = useState(5);
  
  // ========== MENTEE DETAILS MODAL STATE ==========
  const [showMenteeDetailsModal, setShowMenteeDetailsModal] = useState(false);
  const [menteeDetailsData, setMenteeDetailsData] = useState([]);
  const [menteeDetailsTitle, setMenteeDetailsTitle] = useState('');
  
  // ========== MEETING DETAILS MODAL STATE ==========
  const [showMeetingDetailsModal, setShowMeetingDetailsModal] = useState(false);
  const [meetingDetailsData, setMeetingDetailsData] = useState([]);
  const [meetingDetailsTitle, setMeetingDetailsTitle] = useState('');
  const [meetingDetailsMentor, setMeetingDetailsMentor] = useState(null);
  
  // Feedback Management State
  const [feedbackSettings, setFeedbackSettings] = useState([]);
  const [feedbackManagementPhaseFilter, setFeedbackManagementPhaseFilter] = useState('all');
  const [feedbackSettingsLoading, setFeedbackSettingsLoading] = useState(false);
  
  // Add form states
  const [showAddMentorForm, setShowAddMentorForm] = useState(false);
  const [showAddMenteeForm, setShowAddMenteeForm] = useState(false);
  const [addMentorData, setAddMentorData] = useState({
    email: '',
    areas_of_interest: [],
    description: '',
    phaseId: null
  });
  const [addMenteeData, setAddMenteeData] = useState({
    email: '',
    area_of_interest: '',
    description: '',
    phaseId: null
  });
  const [addLoading, setAddLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [currentPhaseId, setCurrentPhaseId] = useState(null);
  const [allPhases, setAllPhases] = useState([]);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Filters for mentors and mentees
  const [mentorFilters, setMentorFilters] = useState({
    search: '',
    phase: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  const [menteeFilters, setMenteeFilters] = useState({
    search: '',
    areaOfInterest: '',
    phase: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [assignmentFilters, setAssignmentFilters] = useState({
    mentorEmail: '',
    menteeEmail: '',
    phase: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Feedback filters - only email and phase
  const [feedbackFilters, setFeedbackFilters] = useState({
    email: '',
    phase: 'all'
  });
  
  const [filteredMentors, setFilteredMentors] = useState([]);
  const [filteredMentees, setFilteredMentees] = useState([]);
  
  // ========== MENTOR ASSIGNMENT MODAL STATES ==========
  const [showMentorAssignmentModal, setShowMentorAssignmentModal] = useState(false);
  const [selectedMentorForAssignment, setSelectedMentorForAssignment] = useState(null);
  const [mentorAssignmentDetails, setMentorAssignmentDetails] = useState(null);
  const [mentorAssignmentLoading, setMentorAssignmentLoading] = useState(false);
  const [mentorAssignmentError, setMentorAssignmentError] = useState("");
  
  const navigate = useNavigate();

  // Check if user is coordinator
  const isCoordinator = true;

  // Helper function to extract phone number from user object
  const extractPhoneNumber = (user) => {
    if (!user) return 'N/A';
    
    if (user.contact_details) {
      if (user.contact_details.mobile && user.contact_details.mobile !== '') 
        return user.contact_details.mobile;
      if (user.contact_details.phone && user.contact_details.phone !== '') 
        return user.contact_details.phone;
      if (user.contact_details.home && user.contact_details.home !== '') 
        return user.contact_details.home;
    }
    
    if (user.mobile && user.mobile !== '') return user.mobile;
    if (user.phone && user.phone !== '') return user.phone;
    if (user.phoneNumber && user.phoneNumber !== '') return user.phoneNumber;
    if (user.contactNo && user.contactNo !== '') return user.contactNo;
    if (user.contactNumber && user.contactNumber !== '') return user.contactNumber;
    
    if (user.profile && user.profile.contact_details) {
      if (user.profile.contact_details.mobile && user.profile.contact_details.mobile !== '') 
        return user.profile.contact_details.mobile;
      if (user.profile.contact_details.phone && user.profile.contact_details.phone !== '') 
        return user.profile.contact_details.phone;
    }
    
    const phoneFields = ['phone_number', 'contact_no', 'contactnumber', 'phonenumber', 'cell', 'cellphone'];
    for (const field of phoneFields) {
      if (user[field] && user[field] !== '') return user[field];
    }
    
    return 'N/A';
  };

  // Get display phone number from mentor/mentee object
  const getDisplayPhoneNumber = (item) => {
    if (item.phone_number && item.phone_number !== 'N/A') return item.phone_number;
    if (item.phoneNumber && item.phoneNumber !== 'N/A') return item.phoneNumber;
    if (item.contact_details?.mobile) return item.contact_details.mobile;
    if (item.contact_details?.phone) return item.contact_details.phone;
    if (item.mobile) return item.mobile;
    if (item.phone) return item.phone;
    return 'N/A';
  };

  // Get display name from user object - ENHANCED
  const getDisplayName = (user) => {
    if (!user) return 'Unknown User';
    if (user.name && user.name !== 'N/A' && user.name !== '') return user.name;
    if (user.basic?.name) return user.basic.name;
    if (user.profile?.name) return user.profile.name;
    if (user.fullName) return user.fullName;
    if (user.firstName) {
      const lastName = user.lastName || '';
      return `${user.firstName} ${lastName}`.trim();
    }
    if (user.email) return user.email.split('@')[0];
    if (user.email_id) return user.email_id.split('@')[0];
    return 'Unknown User';
  };

  // Get department from user object - ENHANCED to check multiple locations
  const getDepartment = (user) => {
    if (!user) return 'N/A';
    
    // 1. Direct department field
    if (user.department && user.department !== '' && user.department !== 'N/A') {
      return user.department.trim();
    }
    
    // 2. Check basic.department
    if (user.basic?.department && user.basic.department !== '') {
      return user.basic.department.trim();
    }
    
    // 3. Check basic.label
    if (user.basic?.label) {
      const label = user.basic.label.trim();
      
      let match = label.match(/,\s*([^,;]+?)(?:;|$)/);
      if (match) {
        return match[1].trim();
      }
      
      match = label.match(/,\s*([^,]+)$/);
      if (match) {
        return match[1].trim();
      }
      
      if (label.length <= 10 && !label.includes(',')) {
        return label;
      }
      
      if (label.includes(',')) {
        const parts = label.split(',');
        if (parts.length > 1) {
          const deptPart = parts[parts.length - 1].trim();
          if (deptPart) {
            return deptPart;
          }
        }
      }
      
      return label;
    }
    
    // 4. Check user.label
    if (user.label) {
      const label = user.label.trim();
      
      let match = label.match(/,\s*([^,;]+?)(?:;|$)/);
      if (match) {
        return match[1].trim();
      }
      
      match = label.match(/,\s*([^,]+)$/);
      if (match) {
        return match[1].trim();
      }
      
      if (label.length <= 10 && !label.includes(',')) {
        return label;
      }
      
      if (label.includes(',')) {
        const parts = label.split(',');
        if (parts.length > 1) {
          const deptPart = parts[parts.length - 1].trim();
          if (deptPart) {
            return deptPart;
          }
        }
      }
      
      return label;
    }
    
    // 5. Check profile.department
    if (user.profile?.department) {
      return user.profile.department.trim();
    }
    
    // 6. Check education section
    if (user.education && user.education.length > 0) {
      for (const edu of user.education) {
        if (edu.department) {
          return edu.department.trim();
        }
        if (edu.field_of_study) {
          return edu.field_of_study.trim();
        }
        if (edu.major) {
          return edu.major.trim();
        }
      }
    }
    
    // 7. Check additionalDetails
    if (user.additionalDetails?.department) {
      return user.additionalDetails.department.trim();
    }
    
    // 8. Check extra fields
    if (user.extra?.department) {
      return user.extra.department.trim();
    }
    
    // 9. Try to extract from email domain (as last resort)
    const email = user.email || user.email_id;
    if (email) {
      const domain = email.split('@')[1];
      if (domain) {
        return domain.split('.')[0].toUpperCase();
      }
    }
    
    return 'N/A';
  };

  // ========== MEETINGS FUNCTIONS ==========

  // Fetch meetings - FIXED to explicitly preserve phaseId
  const fetchMeetingsWithPhase = async () => {
    try {
      console.log("🔄 Fetching meetings with phase...");
      
      const [meetingsRes, mentorsRes, phasesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/dashboard/meetings`),
        axios.get(`${API_BASE_URL}/api/dashboard/mentors`),
        axios.get(`${API_BASE_URL}/api/phase`)
      ]);
      
      if (meetingsRes.data && meetingsRes.data.success) {
        let meetingsData = meetingsRes.data.meetings || [];
        
        const mentors = mentorsRes.data?.mentors || [];
        const phases = phasesRes.data?.phases || [];
        
        let currentPhaseIdFromApi = null;
        const activePhase = phases.find(
          (p) => new Date(p.startDate) <= new Date() && new Date() <= new Date(p.endDate)
        );
        if (activePhase) {
          currentPhaseIdFromApi = activePhase.phaseId;
        }
        
        const mentorPhaseMap = {};
        mentors.forEach(mentor => {
          const email = (mentor.email || mentor.email_id || '').toLowerCase();
          if (email && mentor.phaseId) {
            mentorPhaseMap[email] = mentor.phaseId;
          }
        });
        
        meetingsData = meetingsData.map(meeting => {
          const existingPhaseId = meeting.phaseId;
          
          if (existingPhaseId !== undefined && existingPhaseId !== null) {
            return {
              ...meeting,
              phaseId: existingPhaseId,
              _phaseSource: 'preserved (from API)'
            };
          }
          
          const mentorEmail = (meeting.mentorDetails?.email || '').toLowerCase();
          const directMentorEmail = (meeting.mentorEmail || '').toLowerCase();
          
          let phaseId = null;
          let phaseSource = 'none';
          
          if (mentorEmail && mentorPhaseMap[mentorEmail] !== undefined) {
            phaseId = mentorPhaseMap[mentorEmail];
            phaseSource = 'mentor map';
          } else if (directMentorEmail && mentorPhaseMap[directMentorEmail] !== undefined) {
            phaseId = mentorPhaseMap[directMentorEmail];
            phaseSource = 'direct mentor';
          } else {
            phaseId = currentPhaseIdFromApi || currentPhaseId || 1;
            phaseSource = 'default (current phase)';
          }
          
          return {
            ...meeting,
            phaseId: phaseId,
            _phaseSource: phaseSource
          };
        });
        
        setMeetings(meetingsData);
        setFilteredMeetings(meetingsData);
        setCurrentMeetingPage(1);
        
        if (meetingsRes.data.stats) {
          setMeetingStats(meetingsRes.data.stats);
        }
      } else {
        setMeetings([]);
        setFilteredMeetings([]);
      }
    } catch (err) {
      console.error("Error fetching meetings:", err);
      setMeetings([]);
      setFilteredMeetings([]);
      setMeetingStats({ total: 0, scheduled: 0, completed: 0, cancelled: 0 });
    }
  };

  // Apply meeting filters - FIXED to check all meeting dates
  const applyMeetingFilters = useCallback(() => {
    let filtered = [...meetings];
    
    if (meetingFilters.dateFrom) {
      const fromDate = new Date(meetingFilters.dateFrom);
      filtered = filtered.filter(meeting => {
        if (!meeting.meeting_dates || meeting.meeting_dates.length === 0) return false;
        return meeting.meeting_dates.some(dateObj => {
          return dateObj.date && new Date(dateObj.date) >= fromDate;
        });
      });
    }
    
    if (meetingFilters.dateTo) {
      const toDate = new Date(meetingFilters.dateTo);
      filtered = filtered.filter(meeting => {
        if (!meeting.meeting_dates || meeting.meeting_dates.length === 0) return false;
        return meeting.meeting_dates.some(dateObj => {
          return dateObj.date && new Date(dateObj.date) <= toDate;
        });
      });
    }
    
    if (meetingFilters.status !== 'all') {
      filtered = filtered.filter(meeting => 
        meeting.status?.toLowerCase() === meetingFilters.status.toLowerCase()
      );
    }
    
    if (meetingFilters.email && meetingFilters.email.trim() !== '') {
      const searchEmail = meetingFilters.email.toLowerCase().trim();
      filtered = filtered.filter(meeting => {
        const mentorEmail = meeting.mentorDetails?.email?.toLowerCase() || '';
        if (mentorEmail.includes(searchEmail)) return true;
        
        if (meeting.mentees && meeting.mentees.length > 0) {
          return meeting.mentees.some(mentee => 
            mentee.email?.toLowerCase().includes(searchEmail)
          );
        }
        return false;
      });
    }
    
    if (meetingFilters.phase !== 'all') {
      const filterPhaseValue = parseInt(meetingFilters.phase);
      filtered = filtered.filter(meeting => {
        const meetingPhaseId = meeting.phaseId;
        if (meetingPhaseId === undefined || meetingPhaseId === null) return false;
        return meetingPhaseId === filterPhaseValue;
      });
    }
    
    setFilteredMeetings(filtered);
    setCurrentMeetingPage(1);
  }, [meetings, meetingFilters]);

  // Auto-apply filters when meetingFilters or meetings change
  useEffect(() => {
    if (activeTab === 'meetings') {
      applyMeetingFilters();
    }
  }, [meetingFilters, meetings, activeTab, applyMeetingFilters]);

  const handleMeetingFilterChange = (e) => {
    const { name, value } = e.target;
    setMeetingFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setMeetingFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyMeetingFiltersAndFetch = () => {
    setCurrentMeetingPage(1);
    if (meetingFilters.email || meetingFilters.phase !== 'all' || 
        meetingFilters.dateFrom || meetingFilters.dateTo || 
        meetingFilters.status !== 'all') {
      applyMeetingFilters();
    } else {
      fetchMeetingsWithPhase();
    }
  };

  const resetMeetingFilters = () => {
    setMeetingFilters({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      email: '',
      phase: 'all'
    });
    setCurrentMeetingPage(1);
  };

  // ========== MENTOR ASSIGNMENT MODAL FUNCTIONS ==========
  
  const handleMentorClick = async (mentor) => {
    setSelectedMentorForAssignment(mentor);
    setMentorAssignmentLoading(true);
    setMentorAssignmentError("");
    
    try {
      const mentorEmail = mentor.email || mentor.email_id;
      
      if (!mentorEmail) {
        setMentorAssignmentError("No email found for this mentor");
        setShowMentorAssignmentModal(true);
        setMentorAssignmentLoading(false);
        return;
      }
      
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/assignments`);
      
      if (res.data && res.data.success) {
        const allAssignments = res.data.assignments || [];
        
        const mentorEmailLower = mentorEmail.toLowerCase().trim();
        const mentorAssignments = allAssignments.filter(assignment => {
          const assignmentEmail = assignment.mentorDetails?.email || 
                                 assignment.mentor_email || 
                                 '';
          return assignmentEmail.toLowerCase().trim() === mentorEmailLower;
        });
        
        if (mentorAssignments.length > 0) {
          const formattedAssignments = mentorAssignments.map(assignment => ({
            _id: assignment._id,
            phaseId: assignment.phaseId || assignment.mentorDetails?.phaseId || 'N/A',
            isCurrentPhase: true,
            assignedDate: assignment.createdAt || assignment.assignedDate || new Date(),
            mentees: (assignment.mentees || []).map(mentee => ({
              _id: mentee._id || mentee.user_id,
              name: mentee.name || getDisplayName(mentee),
              email: mentee.email || 'No email',
              department: getDepartment(mentee),
              phone_number: getDisplayPhoneNumber(mentee)
            }))
          }));
          
          setMentorAssignmentDetails({
            assignments: formattedAssignments,
            currentPhaseId: formattedAssignments[0]?.phaseId || 'N/A',
            totalAssignments: formattedAssignments.length
          });
          setShowMentorAssignmentModal(true);
          setMentorAssignmentLoading(false);
          return;
        } else {
          if (mentor.assignedMentees && mentor.assignedMentees > 0) {
            setMentorAssignmentError(
              `This mentor has ${mentor.assignedMentees} assigned mentee(s), but assignment details could not be loaded.`
            );
          } else {
            setMentorAssignmentError(
              `"${mentor.name || getDisplayName(mentor)}" has not been assigned to any mentees yet.`
            );
          }
          
          setMentorAssignmentDetails({
            assignments: [],
            currentPhaseId: 'N/A',
            totalAssignments: 0
          });
          setShowMentorAssignmentModal(true);
          setMentorAssignmentLoading(false);
          return;
        }
      } else {
        throw new Error("Failed to fetch assignments data");
      }
    } catch (err) {
      console.error("Error fetching mentor assignments:", err);
      
      if (mentor.assignedMentees && mentor.assignedMentees > 0) {
        setMentorAssignmentError(
          `This mentor has ${mentor.assignedMentees} assigned mentee(s), but assignment details could not be loaded. Please try refreshing.`
        );
      } else if (mentor.assignedMentees === 0 || !mentor.assignedMentees) {
        setMentorAssignmentError(
          `"${mentor.name || getDisplayName(mentor)}" has not been assigned to any mentees yet.`
        );
      } else {
        setMentorAssignmentError(
          `Unable to fetch assignment details for "${mentor.name || getDisplayName(mentor)}". Please try again later.`
        );
      }
      
      setMentorAssignmentDetails({
        assignments: [],
        currentPhaseId: 'N/A',
        totalAssignments: 0
      });
      setShowMentorAssignmentModal(true);
    } finally {
      setMentorAssignmentLoading(false);
    }
  };

  const closeMentorAssignmentModal = () => {
    setShowMentorAssignmentModal(false);
    setSelectedMentorForAssignment(null);
    setMentorAssignmentDetails(null);
    setMentorAssignmentError("");
    setMentorAssignmentLoading(false);
  };

  // ========== MENTEE DETAILS MODAL FUNCTIONS ==========
  const openMenteeDetailsModal = (mentees, title) => {
    setMenteeDetailsData(mentees || []);
    setMenteeDetailsTitle(title || 'Mentee Details');
    setShowMenteeDetailsModal(true);
  };

  const closeMenteeDetailsModal = () => {
    setShowMenteeDetailsModal(false);
    setMenteeDetailsData([]);
    setMenteeDetailsTitle('');
  };

  // ========== MEETING DETAILS MODAL FUNCTIONS ==========
  const openMeetingDetailsModal = (meetingDates, mentor, title) => {
    setMeetingDetailsData(meetingDates || []);
    setMeetingDetailsMentor(mentor || null);
    setMeetingDetailsTitle(title || 'Meeting Sessions');
    setShowMeetingDetailsModal(true);
  };

  const closeMeetingDetailsModal = () => {
    setShowMeetingDetailsModal(false);
    setMeetingDetailsData([]);
    setMeetingDetailsMentor(null);
    setMeetingDetailsTitle('');
  };

  // ========== DOWNLOAD FUNCTIONS ==========
  const downloadCSV = (data, filename, headers) => {
    if (!data || data.length === 0) {
      alert('No data available to download');
      return;
    }

    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header.toLowerCase().replace(/\s/g, '_')] || '';
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ========== UPDATED DOWNLOAD FUNCTIONS - USE FILTERED DATA ==========
  const downloadMentors = () => {
    const hasActiveFilters = mentorFilters.search !== '' || mentorFilters.phase !== 'all';
    const dataToDownload = hasActiveFilters ? filteredMentors : mentors;
    
    if (dataToDownload.length === 0) {
      alert('No mentor data available to download');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Phone Number', 'Description', 'Phase', 'Status', 'Joined Date'];
    
    const formattedData = dataToDownload.map(mentor => ({
      id: mentor._id?.toString().slice(-8) || 'N/A',
      name: (mentor.name && mentor.name !== 'N/A') ? mentor.name : getDisplayName(mentor),
      email: mentor.email || mentor.email_id || 'N/A',
      phone_number: getDisplayPhoneNumber(mentor),
      description: (mentor.description && mentor.description !== 'N/A') ? mentor.description : (mentor.supportDescription || '—'),
      phase: mentor.phaseId ? `Phase ${mentor.phaseId}` : 'N/A',
      status: mentor.status || 'pending',
      joined_date: formatDate(mentor.createdAt || mentor.profile_updated_on)
    }));
    
    downloadCSV(formattedData, 'mentors_details', headers);
  };

  const downloadMentees = () => {
    const hasActiveFilters = menteeFilters.search !== '' || menteeFilters.areaOfInterest !== '' || menteeFilters.phase !== 'all';
    const dataToDownload = hasActiveFilters ? filteredMentees : mentees;
    
    if (dataToDownload.length === 0) {
      alert('No mentee data available to download');
      return;
    }

    const headers = ['ID', 'Student Name', 'Department', 'Email', 'Phone Number', 'Area of Interest', 'Description', 'Phase', 'Status', 'Request Date'];
    
    const formattedData = dataToDownload.map(mentee => {
      const dept = getDepartment(mentee);
      
      return {
        id: mentee._id?.toString().slice(-8) || 'N/A',
        student_name: getDisplayName(mentee),
        department: dept,
        email: mentee.email || mentee.email_id || 'N/A',
        phone_number: getDisplayPhoneNumber(mentee),
        area_of_interest: mentee.area_of_interest || mentee.areaOfInterest || 'Not specified',
        description: mentee.description && mentee.description !== 'N/A' ? mentee.description : '—',
        phase: mentee.phaseId ? `Phase ${mentee.phaseId}` : 'N/A',
        status: mentee.status || 'pending',
        request_date: formatDate(mentee.createdAt || mentee.profile_updated_on)
      };
    });
    
    downloadCSV(formattedData, 'mentees_details', headers);
  };

  const downloadAssignments = () => {
    const hasActiveFilters = assignmentFilters.mentorEmail !== '' || assignmentFilters.menteeEmail !== '' || assignmentFilters.phase !== 'all';
    const dataToDownload = hasActiveFilters ? filteredAssignments : assignments;
    
    if (dataToDownload.length === 0) {
      alert('No assignment data available to download');
      return;
    }

    let maxMentees = 0;
    dataToDownload.forEach(assignment => {
      if (assignment.mentees && assignment.mentees.length > maxMentees) {
        maxMentees = assignment.mentees.length;
      }
    });
    
    const headers = ['Mentor Name', 'Mentor Email', 'Mentor Phone', 'Phase', 'Assignment Date', 'Assignment ID'];
    
    for (let i = 1; i <= maxMentees; i++) {
      headers.push(`Mentee ${i} Name`);
      headers.push(`Mentee ${i} Email`);
      headers.push(`Mentee ${i} Department`);
    }
    
    const formattedData = dataToDownload.map(assignment => {
      const mentorName = assignment.mentorDetails?.name || 'N/A';
      const mentorEmail = assignment.mentorDetails?.email || 'N/A';
      const mentorPhone = assignment.mentorDetails?.phone_number || assignment.mentorDetails?.phoneNumber || 'N/A';
      const phaseValue = assignment.phaseId ? `Phase ${assignment.phaseId}` : 'N/A';
      
      const row = {
        mentor_name: mentorName,
        mentor_email: mentorEmail,
        mentor_phone: mentorPhone,
        phase: phaseValue,
        assignment_date: formatDate(assignment.createdAt),
        assignment_id: assignment._id?.toString().slice(-8) || 'N/A'
      };
      
      if (assignment.mentees && assignment.mentees.length > 0) {
        assignment.mentees.forEach((mentee, index) => {
          row[`mentee_${index + 1}_name`] = getDisplayName(mentee);
          row[`mentee_${index + 1}_email`] = mentee.email || mentee.email_id || 'No email';
          row[`mentee_${index + 1}_department`] = getDepartment(mentee);
        });
      }
      
      for (let i = (assignment.mentees?.length || 0) + 1; i <= maxMentees; i++) {
        row[`mentee_${i}_name`] = '';
        row[`mentee_${i}_email`] = '';
        row[`mentee_${i}_department`] = '';
      }
      
      return row;
    });
    
    downloadCSV(formattedData, 'mentor_mentee_assignments', headers);
  };

  const downloadMeetings = () => {
    const hasActiveFilters = meetingFilters.phase !== 'all' || meetingFilters.email !== '' || 
                             meetingFilters.dateFrom !== '' || meetingFilters.dateTo !== '' || 
                             meetingFilters.status !== 'all';
    const dataToDownload = hasActiveFilters ? filteredMeetings : meetings;
    
    if (dataToDownload.length === 0) {
      alert('No meeting data available to download');
      return;
    }

    const headers = ['Mentor Name', 'Mentor Email', 'Mentor Phone', 'Meeting Sessions', 'Status', 'Platform', 'Agenda', 'Mentees Count', 'Mentees List'];
    
    const formattedData = dataToDownload.map(meeting => {
      // Format all meeting sessions
      const sessionsStr = meeting.meeting_dates && meeting.meeting_dates.length > 0
        ? meeting.meeting_dates.map((d, i) => {
            const date = d.date ? formatDate(d.date) : 'N/A';
            const time = d.meeting_time ? formatTime(d.meeting_time) : 'N/A';
            const duration = d.duration_minutes || 30;
            return `Session ${i + 1}: ${date} at ${time} (${duration}min)`;
          }).join('; ')
        : 'No sessions scheduled';
      
      const mentorPhone = getDisplayPhoneNumber(meeting.mentorDetails);
      const menteesList = meeting.mentees && meeting.mentees.length > 0
        ? meeting.mentees.map(m => `${getDisplayName(m)} (${m.email || 'No email'}) - Dept: ${getDepartment(m)}`).join('; ')
        : 'No mentees assigned';
      
      return {
        mentor_name: meeting.mentorDetails?.name || 'N/A',
        mentor_email: meeting.mentorDetails?.email || 'N/A',
        mentor_phone: mentorPhone,
        meeting_sessions: sessionsStr,
        status: meeting.status || 'N/A',
        platform: meeting.platform || 'N/A',
        agenda: meeting.agenda || 'N/A',
        mentees_count: meeting.mentees?.length || 0,
        mentees_list: menteesList
      };
    });
    
    downloadCSV(formattedData, 'meetings_details', headers);
  };

  const downloadFeedbacks = () => {
    const hasActiveFilters = feedbackFilters.email !== '' || feedbackFilters.phase !== 'all';
    const dataToDownload = hasActiveFilters ? filteredFeedbacks : feedbacks;
    
    if (dataToDownload.length === 0) {
      alert('No feedback data available to download');
      return;
    }

    const headers = ['User', 'Email', 'Role', 'Phase', 'Overall Satisfaction', 'Program Organization', 'Matching Process', 'Support Provided', 'General Feedback', 'Suggestions', 'Participate Again', 'Submitted Date'];
    
    const formattedData = dataToDownload.map(feedback => {
      const userEmail = feedback.userDetails?.email || 'No email';
      const userName = userEmail !== 'No email' ? userEmail.split('@')[0] : 'Anonymous';
      
      return {
        user: userName,
        email: userEmail,
        role: feedback.role || 'Not specified',
        phase: feedback.phaseId || 'N/A',
        overall_satisfaction: feedback.overallSatisfaction || 'N/A',
        program_organization: feedback.programOrganization || 'N/A',
        matching_process: feedback.matchingProcess || 'N/A',
        support_provided: feedback.supportProvided || 'N/A',
        general_feedback: feedback.generalFeedback || '—',
        suggestions: feedback.suggestions || '—',
        participate_again: feedback.participateAgain || 'Not specified',
        submitted_date: formatDate(feedback.createdAt)
      };
    });
    
    downloadCSV(formattedData, 'feedbacks_details', headers);
  };

  // ========== FETCH FUNCTIONS ==========

  // Fetch all phases and current phase
  const fetchCurrentPhase = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/phase`);
      const phases = res.data.phases || [];
      
      setAllPhases(phases);
      
      const activePhase = phases.find(
        (p) => new Date(p.startDate) <= new Date() && new Date() <= new Date(p.endDate)
      );
      if (activePhase) {
        setCurrentPhase(activePhase);
        setCurrentPhaseId(activePhase.phaseId);
        setAddMentorData(prev => ({ ...prev, phaseId: activePhase.phaseId }));
        setAddMenteeData(prev => ({ ...prev, phaseId: activePhase.phaseId }));
      }
    } catch (err) {
      console.error("Error fetching phases:", err);
    }
  };

  // Fetch feedback settings
  const fetchFeedbackSettings = async () => {
    try {
      setFeedbackSettingsLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/feedback-settings/`);
      
      if (res.data && res.data.success) {
        setFeedbackSettings(res.data.settings || []);
      } else if (res.data.settings) {
        setFeedbackSettings(res.data.settings);
      } else {
        setFeedbackSettings([]);
      }
    } catch (err) {
      console.error("Error fetching feedback settings:", err);
      setFeedbackSettings([]);
    } finally {
      setFeedbackSettingsLoading(false);
    }
  };

  // Toggle feedback for a phase
  const toggleFeedbackForPhase = async (phaseId, currentStatus) => {
    try {
      setFeedbackSettingsLoading(true);
      const res = await axios.put(`${API_BASE_URL}/api/feedback-settings/${phaseId}`, {
        enableFeedback: !currentStatus
      });
      
      if (res.data && res.data.success) {
        setFeedbackSettings(prev => {
          const existing = prev.find(s => s.phaseId === phaseId);
          if (existing) {
            return prev.map(s => 
              s.phaseId === phaseId 
                ? { ...s, enableFeedback: !currentStatus, updatedAt: new Date() }
                : s
            );
          } else {
            return [...prev, {
              phaseId: phaseId,
              enableFeedback: !currentStatus,
              createdAt: new Date(),
              updatedAt: new Date()
            }];
          }
        });
        
        alert(`Feedback ${!currentStatus ? 'enabled' : 'disabled'} for Phase ${phaseId}`);
      } else {
        alert(res.data?.message || "Failed to update feedback settings");
      }
    } catch (err) {
      console.error("Error toggling feedback:", err);
      alert(err.response?.data?.message || "Error updating feedback settings");
    } finally {
      setFeedbackSettingsLoading(false);
    }
  };

  // Get feedback status for a phase
  const getFeedbackStatusForPhase = (phaseId) => {
    const setting = feedbackSettings.find(s => s.phaseId === phaseId);
    return setting ? setting.enableFeedback : false;
  };

  // Filter phases for feedback management
  const getFilteredPhasesForManagement = () => {
    if (feedbackManagementPhaseFilter === 'all') {
      return allPhases;
    }
    return allPhases.filter(phase => phase.phaseId.toString() === feedbackManagementPhaseFilter);
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/stats`);
      if (res.data && res.data.success) {
        const statsData = res.data.stats || res.data;
        setStats({
          totalMentees: statsData.totalMentees || 0,
          totalMentors: statsData.totalMentors || 0,
          newMenteesThisWeek: statsData.newMenteesThisWeek || 0,
          newMentorsThisWeek: statsData.newMentorsThisWeek || 0,
          phaseStats: statsData.phaseStats || []
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  // Get unique phases from all phases (for filter dropdown)
  const getUniquePhasesForFilter = () => {
    return allPhases.map(phase => phase.phaseId.toString()).sort();
  };

  // Add Mentor
  const handleAddMentor = async () => {
    if (!addMentorData.email) {
      alert("Please enter mentor email");
      return;
    }
    if (!addMentorData.description) {
      alert("Please enter mentor description");
      return;
    }
    if (addMentorData.areas_of_interest.length === 0) {
      alert("Please enter at least one area of interest");
      return;
    }

    setAddLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/mentor/register`, {
        email: addMentorData.email,
        areaOfInterest: addMentorData.areas_of_interest,
        supportDescription: addMentorData.description,
        phaseId: addMentorData.phaseId || currentPhaseId
      });

      if (response.data.success) {
        alert("Mentor added successfully!");
        setShowAddMentorForm(false);
        setAddMentorData({
          email: '',
          areas_of_interest: [],
          description: '',
          phaseId: currentPhaseId
        });
        await fetchMentors();
        await fetchDashboardStats();
      } else {
        alert(response.data.message || "Failed to add mentor");
      }
    } catch (err) {
      console.error("Error adding mentor:", err);
      alert(err.response?.data?.message || "Error adding mentor");
    } finally {
      setAddLoading(false);
    }
  };

  // Add Mentee
  const handleAddMentee = async () => {
    if (!addMenteeData.email) {
      alert("Please enter mentee email");
      return;
    }
    if (!addMenteeData.area_of_interest) {
      alert("Please enter area of interest");
      return;
    }
    if (!addMenteeData.description) {
      alert("Please enter description");
      return;
    }

    setAddLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/mentee/requests/mentee`, {
        email: addMenteeData.email,
        area_of_interest: addMenteeData.area_of_interest,
        description: addMenteeData.description,
        phaseId: addMenteeData.phaseId || currentPhaseId
      });

      if (response.data.success || response.status === 201) {
        alert("Mentee added successfully!");
        setShowAddMenteeForm(false);
        setAddMenteeData({
          email: '',
          area_of_interest: '',
          description: '',
          phaseId: currentPhaseId
        });
        await fetchMentees();
        await fetchDashboardStats();
      } else {
        alert(response.data.message || "Failed to add mentee");
      }
    } catch (err) {
      console.error("Error adding mentee:", err);
      let errorMessage = "Error adding mentee";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      alert(`Failed to add mentee: ${errorMessage}`);
    } finally {
      setAddLoading(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (type, item) => {
    setDeleteType(type);
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleting(true);
    
    try {
      let response;
      switch (deleteType) {
        case 'mentor':
          response = await axios.delete(`${API_BASE_URL}/api/dashboard/mentor/${deleteTarget._id}`);
          if (response.data.success) {
            alert('Mentor deleted successfully');
            await fetchMentors();
            await fetchDashboardStats();
          }
          break;
        case 'mentee':
          response = await axios.delete(`${API_BASE_URL}/api/dashboard/mentee/${deleteTarget._id}`);
          if (response.data.success) {
            alert('Mentee deleted successfully');
            await fetchMentees();
            await fetchDashboardStats();
          }
          break;
        case 'assignment':
          response = await axios.delete(`${API_BASE_URL}/api/dashboard/assignment/${deleteTarget._id}`);
          if (response.data.success) {
            alert('Assignment deleted successfully');
            await fetchAssignments();
            await fetchMentors();
            await fetchMentees();
            await fetchDashboardStats();
          }
          break;
        default:
          break;
      }
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setDeleteType('');
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.message || 'Error deleting item');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    setDeleteType('');
  };

  // Fetch all mentors
  const fetchMentors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/mentors`);
      if (res.data && res.data.success) {
        const mentorsData = res.data.mentors || [];
        const mentorsWithDetails = mentorsData.map(mentor => ({
          ...mentor,
          description: mentor.description || 'No description',
          status: mentor.status || 'pending'
        }));
        setMentors(mentorsWithDetails);
        applyMentorFilters(mentorsWithDetails, mentorFilters);
        setStats(prev => ({ ...prev, totalMentors: mentorsWithDetails.length }));
        setCurrentMentorPage(1);
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
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/mentees`);
      if (res.data && res.data.success) {
        const menteesData = res.data.mentees || [];
        
        const menteesWithDetails = menteesData.map(mentee => {
          const name = getDisplayName(mentee);
          const dept = getDepartment(mentee);
          
          return {
            ...mentee,
            student_name: name,
            department: dept,
            status: mentee.status || 'pending'
          };
        });
        
        setMentees(menteesWithDetails);
        applyMenteeFilters(menteesWithDetails, menteeFilters);
        setStats(prev => ({ ...prev, totalMentees: menteesWithDetails.length }));
        setCurrentMenteePage(1);
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
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/assignments`);
      if (res.data && res.data.success) {
        const assignmentsData = res.data.assignments || [];
        const assignmentsWithMentees = assignmentsData.map(assignment => ({
          ...assignment,
          mentees: (assignment.mentees || []).map(mentee => ({
            ...mentee,
            student_name: getDisplayName(mentee),
            department: getDepartment(mentee)
          }))
        }));
        setAssignments(assignmentsWithMentees);
        applyAssignmentFilters(assignmentsWithMentees, assignmentFilters);
        setCurrentAssignmentPage(1);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setAssignments([]);
      setFilteredAssignments([]);
    }
  };

  // Fetch feedbacks
  const fetchFeedbacks = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/feedbacks`);
      if (res.data && res.data.success) {
        const feedbacksData = res.data.feedbacks || [];
        setFeedbacks(feedbacksData);
        applyFeedbackFilters(feedbacksData, feedbackFilters);
        setCurrentFeedbackPage(1);
      }
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
      setFeedbacks([]);
      setFilteredFeedbacks([]);
    }
  };

  // Apply feedback filters
  const applyFeedbackFilters = (feedbacksData, filters) => {
    let filtered = [...feedbacksData];
    
    if (filters.email) {
      const emailLower = filters.email.toLowerCase();
      filtered = filtered.filter(feedback => {
        const userEmail = (feedback.userDetails?.email || '').toLowerCase();
        return userEmail.includes(emailLower);
      });
    }
    
    if (filters.phase !== 'all') {
      filtered = filtered.filter(feedback => {
        const phaseId = feedback.phaseId;
        return phaseId === parseInt(filters.phase) || 
               phaseId?.toString() === filters.phase;
      });
    }
    
    setFilteredFeedbacks(filtered);
    setCurrentFeedbackPage(1);
  };

  // Apply mentor filters
  const applyMentorFilters = (mentorsData, filters) => {
    let filtered = [...mentorsData];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(mentor => {
        const name = (mentor.name || getDisplayName(mentor) || '').toLowerCase();
        const email = (mentor.email || '').toLowerCase();
        const description = (mentor.description || '').toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower) || description.includes(searchLower);
      });
    }
    
    if (filters.phase !== 'all') {
      filtered = filtered.filter(mentor => 
        mentor.phaseId === parseInt(filters.phase) || 
        mentor.phaseId?.toString() === filters.phase
      );
    }
    
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = (a.name || getDisplayName(a) || '').toLowerCase();
          bValue = (b.name || getDisplayName(b) || '').toLowerCase();
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
    setCurrentMentorPage(1);
  };

  // Apply mentee filters
  const applyMenteeFilters = (menteesData, filters) => {
    let filtered = [...menteesData];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(mentee => {
        const name = (mentee.student_name || getDisplayName(mentee) || '').toLowerCase();
        const email = (mentee.email || '').toLowerCase();
        const department = (mentee.department || getDepartment(mentee) || '').toLowerCase();
        const area = (mentee.area_of_interest || '').toLowerCase();
        const description = (mentee.description || '').toLowerCase();
        return name.includes(searchLower) || 
               email.includes(searchLower) || 
               department.includes(searchLower) ||
               area.includes(searchLower) || 
               description.includes(searchLower);
      });
    }
    
    if (filters.areaOfInterest) {
      const areaLower = filters.areaOfInterest.toLowerCase();
      filtered = filtered.filter(mentee => {
        const area = (mentee.area_of_interest || '').toLowerCase();
        return area.includes(areaLower);
      });
    }
    
    if (filters.phase !== 'all') {
      filtered = filtered.filter(mentee => 
        mentee.phaseId === parseInt(filters.phase) || 
        mentee.phaseId?.toString() === filters.phase
      );
    }
    
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'area_of_interest':
          aValue = (a.area_of_interest || '').toLowerCase();
          bValue = (b.area_of_interest || '').toLowerCase();
          break;
        case 'phase':
          aValue = a.phaseId || 0;
          bValue = b.phaseId || 0;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
      }
      
      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    setFilteredMentees(filtered);
    setCurrentMenteePage(1);
  };

  // Apply assignment filters
  const applyAssignmentFilters = (assignmentsData, filters) => {
    let filtered = [...assignmentsData];
    
    if (filters.mentorEmail) {
      const mentorEmailLower = filters.mentorEmail.toLowerCase();
      filtered = filtered.filter(assignment => {
        const mentorEmail = (assignment.mentorDetails?.email || '').toLowerCase();
        return mentorEmail.includes(mentorEmailLower);
      });
    }
    
    if (filters.menteeEmail) {
      const menteeEmailLower = filters.menteeEmail.toLowerCase();
      filtered = filtered.filter(assignment => {
        if (!assignment.mentees || assignment.mentees.length === 0) return false;
        return assignment.mentees.some(mentee => {
          const menteeEmail = (mentee.email || '').toLowerCase();
          return menteeEmail.includes(menteeEmailLower);
        });
      });
    }
    
    if (filters.phase !== 'all') {
      filtered = filtered.filter(assignment => {
        const phaseId = assignment.phaseId || assignment.mentorDetails?.phaseId;
        return phaseId === parseInt(filters.phase) || 
               phaseId?.toString() === filters.phase;
      });
    }
    
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'mentorName':
          aValue = (a.mentorDetails?.name || '').toLowerCase();
          bValue = (b.mentorDetails?.name || '').toLowerCase();
          break;
        case 'mentorEmail':
          aValue = (a.mentorDetails?.email || '').toLowerCase();
          bValue = (b.mentorDetails?.email || '').toLowerCase();
          break;
        case 'menteeCount':
          aValue = a.mentees?.length || 0;
          bValue = b.mentees?.length || 0;
          break;
        case 'phase':
          aValue = a.phaseId || a.mentorDetails?.phaseId || 0;
          bValue = b.phaseId || b.mentorDetails?.phaseId || 0;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
      }
      
      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    setFilteredAssignments(filtered);
    setCurrentAssignmentPage(1);
  };

  const handleMentorFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...mentorFilters,
      [name]: value
    };
    setMentorFilters(updatedFilters);
    applyMentorFilters(mentors, updatedFilters);
  };

  const handleMenteeFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...menteeFilters,
      [name]: value
    };
    setMenteeFilters(updatedFilters);
    applyMenteeFilters(mentees, updatedFilters);
  };

  const handleAssignmentFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...assignmentFilters,
      [name]: value
    };
    setAssignmentFilters(updatedFilters);
    applyAssignmentFilters(assignments, updatedFilters);
  };

  const handleFeedbackFilterChange = (e) => {
    const { name, value } = e.target;
    const updatedFilters = {
      ...feedbackFilters,
      [name]: value
    };
    setFeedbackFilters(updatedFilters);
    applyFeedbackFilters(feedbacks, updatedFilters);
  };

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

  const resetMenteeFilters = () => {
    const resetFilters = {
      search: '',
      areaOfInterest: '',
      phase: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    setMenteeFilters(resetFilters);
    applyMenteeFilters(mentees, resetFilters);
  };

  const resetAssignmentFilters = () => {
    const resetFilters = {
      mentorEmail: '',
      menteeEmail: '',
      phase: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    setAssignmentFilters(resetFilters);
    applyAssignmentFilters(assignments, resetFilters);
  };

  const resetFeedbackFilters = () => {
    const resetFilters = {
      email: '',
      phase: 'all'
    };
    setFeedbackFilters(resetFilters);
    applyFeedbackFilters(feedbacks, resetFilters);
  };

  // ========== HELPER FUNCTIONS ==========
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const handleBackToHome = () => {
    navigate("/14");
  };

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

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      if (timeString && timeString !== 'N/A') {
        return `${dateStr} at ${formatTime(timeString)}`;
      }
      return dateStr;
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString || timeString === 'N/A') return 'Time not set';
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }
    return timeString;
  };

  const getNameFromEmail = (email) => {
    if (!email || email === 'N/A') return 'User';
    const namePart = email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const getDateStatus = (dateObj) => {
    if (dateObj.status) {
      return dateObj.status.toLowerCase();
    }
    if (!dateObj.date) return 'scheduled';
    const date = new Date(dateObj.date);
    const now = new Date();
    if (date < now) return 'completed';
    return 'scheduled';
  };

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

  const getRatingStars = (rating) => {
    if (!rating || isNaN(rating)) return 'N/A';
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getUniqueMentorEmails = () => {
    const emails = new Set();
    assignments.forEach(assignment => {
      if (assignment.mentorDetails?.email) {
        emails.add(assignment.mentorDetails.email);
      }
    });
    return Array.from(emails).sort();
  };

  const getUniqueAreasOfInterest = () => {
    const areas = new Set();
    mentees.forEach(mentee => {
      if (mentee.area_of_interest) {
        areas.add(mentee.area_of_interest);
      }
    });
    return Array.from(areas).sort();
  };

  const getUniqueFeedbackEmails = () => {
    const emails = new Set();
    feedbacks.forEach(feedback => {
      if (feedback.userDetails?.email) {
        emails.add(feedback.userDetails.email);
      }
    });
    return Array.from(emails).sort();
  };

  const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'assigned':
        return 'md-status-assigned';
      case 'pending':
        return 'md-status-pending';
      case 'completed':
        return 'md-status-completed';
      case 'cancelled':
        return 'md-status-cancelled';
      default:
        return 'md-status-pending';
    }
  };

  const totalMentors = mentors.length;
  const totalMentees = mentees.length;
  const totalAssignments = assignments.length;
  const totalMeetings = meetingStats.total;

  // ========== HANDLE REFRESH ==========
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
        fetchMeetingsWithPhase();
        break;
      case 'feedback':
        fetchFeedbacks();
        break;
      case 'feedback-management':
        fetchFeedbackSettings();
        break;
    }
  };

  // ========== LOAD DATA ON TAB CHANGE ==========
  useEffect(() => {
    setLoading(true);
    fetchCurrentPhase();
    fetchDashboardStats();
    fetchMentors();
    fetchMentees();
    fetchFeedbackSettings();
    
    switch (activeTab) {
      case 'assignments':
        fetchAssignments();
        break;
      case 'meetings':
        fetchMeetingsWithPhase();
        break;
      case 'feedback':
        fetchFeedbacks();
        break;
      case 'feedback-management':
        break;
      default:
        break;
    }
    
    setTimeout(() => setLoading(false), 500);
  }, [activeTab]);

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

  // ========== PAGINATION HELPER FUNCTION ==========
  const getPaginationButtons = (currentPage, totalPages) => {
    const buttons = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      // Always show first page
      buttons.push(1);
      
      // Calculate start and end of visible pages
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if near the beginning
      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, 4);
      }
      
      // Adjust if near the end
      if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        buttons.push('...');
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        buttons.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        buttons.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        buttons.push(totalPages);
      }
    }
    
    return buttons;
  };

  return (
    <div className="md-dashboard-wrapper">
      <div className="md-animated-bg">
        <div className="md-gradient-orb md-orb-1"></div>
        <div className="md-gradient-orb md-orb-2"></div>
        <div className="md-gradient-orb md-orb-3"></div>
      </div>

      <button className="md-mobile-toggle" onClick={toggleSidebar}>
        ☰
      </button>

      <div className={`md-sidebar ${sidebarOpen ? 'md-sidebar-open' : ''}`}>
        <div className="md-sidebar-header">
          <h2>Mentorship</h2>
          <button className="md-sidebar-close" onClick={toggleSidebar}>✕</button>
        </div>
        
        <div className="md-sidebar-stats">
          <div className="md-sidebar-stat">
            <div className="md-stat-value">{totalMentors}</div>
            <div className="md-stat-label">Mentors</div>
          </div>
          <div className="md-sidebar-stat">
            <div className="md-stat-value">{totalMentees}</div>
            <div className="md-stat-label">Mentees</div>
          </div>
          <div className="md-sidebar-stat">
            <div className="md-stat-value">{totalAssignments}</div>
            <div className="md-stat-label">Assignments</div>
          </div>
          <div className="md-sidebar-stat">
            <div className="md-stat-value">{totalMeetings}</div>
            <div className="md-stat-label">Meetings</div>
          </div>
        </div>
        
        <nav className="md-sidebar-nav">
          <button 
            className={`md-nav-item ${activeTab === 'mentors' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('mentors')}
          >
            Mentors
            <span className="md-nav-count">{totalMentors}</span>
          </button>
          
          <button 
            className={`md-nav-item ${activeTab === 'mentees' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('mentees')}
          >
            Mentees
            <span className="md-nav-count">{totalMentees}</span>
          </button>
          
          <button 
            className={`md-nav-item ${activeTab === 'assignments' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('assignments')}
          >
            Assignments
            <span className="md-nav-count">{totalAssignments}</span>
          </button>
          
          <button 
            className={`md-nav-item ${activeTab === 'meetings' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('meetings')}
          >
            Meetings
            <span className="md-nav-count">{totalMeetings}</span>
          </button>
          
          <button 
            className={`md-nav-item ${activeTab === 'feedback' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('feedback')}
          >
            Feedback
            <span className="md-nav-count">{feedbacks.length}</span>
          </button>

          <button 
            className={`md-nav-item ${activeTab === 'feedback-management' ? 'md-active' : ''}`}
            onClick={() => handleNavClick('feedback-management')}
          >
            Feedback Management
            <span className="md-nav-count">{allPhases.length}</span>
          </button>
        </nav>
        
        <div className="md-sidebar-footer">
          <button className="md-back-home-btn" onClick={handleBackToHome}>
            ← Back to Home
          </button>
        </div>
      </div>

      {sidebarOpen && <div className="md-overlay" onClick={toggleSidebar}></div>}

      <div className="md-main-content">
        <div className="md-content-header">
          <h1>Mentorship Program Dashboard</h1>
          <p>View mentors, mentees, meetings, and feedback</p>
        </div>

        {loading ? (
          <div className="md-loading-container">
            <div className="md-spinner"></div>
            <p>Loading {activeTab} data...</p>
          </div>
        ) : (
          <>
            {/* MENTORS TAB - WITH DYNAMIC PAGINATION */}
            {activeTab === 'mentors' && (
              <div className="md-mentors-tab">
                <div className="md-section-header-with-filters">
                  <div className="md-title-and-buttons">
                    <h2 className="md-section-title">All Mentors ({filteredMentors.length})</h2>
                    <div className="md-header-buttons">
                      {isCoordinator && (
                        <button 
                          className="md-add-btn"
                          onClick={() => setShowAddMentorForm(true)}
                        >
                          + Add Mentor
                        </button>
                      )}
                      <button 
                        className="md-download-btn"
                        onClick={downloadMentors}
                      >
                        Download Details
                      </button>
                    </div>
                  </div>
                  
                  <div className="md-filters-container md-glass-card">
                    <div className="md-filter-row">
                      <div className="md-filter-group">
                        <label>Search</label>
                        <input
                          type="text"
                          name="search"
                          placeholder="Search by name, email or description..."
                          value={mentorFilters.search}
                          onChange={handleMentorFilterChange}
                          className="md-filter-input"
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Phase</label>
                        <select
                          name="phase"
                          value={mentorFilters.phase}
                          onChange={handleMentorFilterChange}
                          className="md-filter-select"
                        >
                          <option value="all">All Phases</option>
                          {getUniquePhasesForFilter().map(phase => (
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
                          className="md-filter-select"
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
                          className="md-filter-select"
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
                          Apply
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
                  <>
                    <div className="md-data-table-container">
                      <div className="md-data-table md-glass-card">
                        <table>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Phone Number</th>
                              <th>Description</th>
                              <th>Phase</th>
                              <th>Joined</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const totalItems = filteredMentors.length;
                              const totalPages = Math.ceil(totalItems / mentorsPerPage) || 1;
                              const safePage = Math.min(currentMentorPage, totalPages);
                              
                              if (currentMentorPage !== safePage && totalItems > 0) {
                                setTimeout(() => setCurrentMentorPage(safePage), 0);
                              }
                              
                              const startIndex = (currentMentorPage - 1) * mentorsPerPage;
                              const endIndex = Math.min(startIndex + mentorsPerPage, totalItems);
                              const paginatedMentors = totalItems > 0 ? filteredMentors.slice(startIndex, endIndex) : [];
                              
                              return paginatedMentors.map((mentor) => {
                                const displayName = mentor.name && mentor.name !== 'N/A' 
                                  ? mentor.name 
                                  : getDisplayName(mentor);
                                
                                const displayEmail = mentor.email && mentor.email !== 'N/A' 
                                  ? mentor.email 
                                  : 'No email';
                                
                                const displayPhone = getDisplayPhoneNumber(mentor);
                                const displayPhase = mentor.phaseId && mentor.phaseId !== 'N/A'
                                  ? `Phase ${mentor.phaseId}`
                                  : 'N/A';
                                const displayDescription = mentor.description && mentor.description !== 'N/A' && mentor.description !== 'No description'
                                  ? mentor.description.length > 100 
                                    ? mentor.description.substring(0, 100) + '...' 
                                    : mentor.description
                                  : '—';
                                const displayStatus = mentor.status || 'pending';
                                const statusClass = getStatusClass(displayStatus);

                                return (
                                  <tr key={mentor._id}>
                                    <td className="md-id-cell">M{(mentor._id?.toString() || '').slice(-6)}</td>
                                    <td 
                                      className="md-name-cell md-clickable-name"
                                      onClick={() => handleMentorClick(mentor)}
                                      style={{ cursor: 'pointer', color: '#7c3aed', fontWeight: '600' }}
                                      title="Click to view assignments"
                                    >
                                      {displayName}
                                    </td>
                                    <td className="md-email-cell">{displayEmail}</td>
                                    <td className="md-phone-cell">{displayPhone}</td>
                                    <td className="md-description-cell" title={mentor.description || ''}>
                                      {displayDescription}
                                    </td>
                                    <td><span className="md-phase-badge">{displayPhase}</span></td>
                                    <td className="md-date-cell">{formatDate(mentor.createdAt)}</td>
                                    <td>
                                      <span className={`md-status-badge ${statusClass}`}>
                                        {displayStatus}
                                      </span>
                                    </td>
                                    <td className="md-actions-cell">
                                      <button 
                                        className="md-view-btn"
                                        onClick={() => handleMentorClick(mentor)}
                                        title="View Assignments"
                                      >
                                        View
                                      </button>
                                      {isCoordinator && (
                                        <button 
                                          className="md-delete-btn"
                                          onClick={() => handleDeleteClick('mentor', mentor)}
                                          title="Delete Mentor"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Mentor Pagination - DYNAMIC */}
                    {(() => {
                      const totalItems = filteredMentors.length;
                      const totalPages = Math.ceil(totalItems / mentorsPerPage) || 1;
                      
                      if (totalPages <= 1) return null;
                      
                      const pageButtons = getPaginationButtons(currentMentorPage, totalPages);
                      
                      return (
                        <div className="md-meeting-pagination md-mentor-pagination">
                          <button 
                            className="md-pagination-btn"
                            onClick={() => setCurrentMentorPage(prev => Math.max(1, prev - 1))}
                            disabled={currentMentorPage === 1}
                          >
                            ◀ Previous
                          </button>
                          
                          <div className="md-pagination-dots">
                            {pageButtons.map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="md-pagination-ellipsis">…</span>
                              ) : (
                                <button
                                  key={page}
                                  className={`md-pagination-dot ${currentMentorPage === page ? 'active' : ''}`}
                                  onClick={() => setCurrentMentorPage(page)}
                                >
                                  {page}
                                </button>
                              )
                            ))}
                          </div>
                          
                          <button 
                            className="md-pagination-btn"
                            onClick={() => setCurrentMentorPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentMentorPage === totalPages}
                          >
                            Next ▶
                          </button>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* MENTEES TAB - WITH DYNAMIC PAGINATION */}
            {activeTab === 'mentees' && (
              <div className="md-mentees-tab">
                <div className="md-section-header-with-filters">
                  <div className="md-title-and-buttons">
                    <h2 className="md-section-title">All Mentees ({filteredMentees.length})</h2>
                    <div className="md-header-buttons">
                      {isCoordinator && (
                        <button 
                          className="md-add-btn"
                          onClick={() => setShowAddMenteeForm(true)}
                        >
                          + Add Mentee
                        </button>
                      )}
                      <button 
                        className="md-download-btn"
                        onClick={downloadMentees}
                      >
                        Download Details
                      </button>
                    </div>
                  </div>
                  
                  <div className="md-filters-container md-glass-card">
                    <div className="md-filter-row">
                      <div className="md-filter-group">
                        <label>Search</label>
                        <input
                          type="text"
                          name="search"
                          placeholder="Search by name, department, email, area of interest, or description..."
                          value={menteeFilters.search}
                          onChange={handleMenteeFilterChange}
                          className="md-filter-input"
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Area of Interest</label>
                        <input
                          type="text"
                          name="areaOfInterest"
                          placeholder="Filter by area of interest..."
                          value={menteeFilters.areaOfInterest}
                          onChange={handleMenteeFilterChange}
                          className="md-filter-input"
                          list="areaOfInterestSuggestions"
                        />
                        <datalist id="areaOfInterestSuggestions">
                          {getUniqueAreasOfInterest().map(area => (
                            <option key={area} value={area} />
                          ))}
                        </datalist>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Phase</label>
                        <select
                          name="phase"
                          value={menteeFilters.phase}
                          onChange={handleMenteeFilterChange}
                          className="md-filter-select"
                        >
                          <option value="all">All Phases</option>
                          {getUniquePhasesForFilter().map(phase => (
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
                          className="md-filter-select"
                        >
                          <option value="name">Name</option>
                          <option value="email">Email</option>
                          <option value="area_of_interest">Area of Interest</option>
                          <option value="phase">Phase</option>
                          <option value="createdAt">Request Date</option>
                        </select>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Order</label>
                        <select
                          name="sortOrder"
                          value={menteeFilters.sortOrder}
                          onChange={handleMenteeFilterChange}
                          className="md-filter-select"
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
                          Apply
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
                  <>
                    <div className="md-data-table-container">
                      <div className="md-data-table md-glass-card">
                        <table>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Student Name</th>
                              <th>Department</th>
                              <th>Email</th>
                              <th>Phone Number</th>
                              <th>Area of Interest</th>
                              <th>Description</th>
                              <th>Phase</th>
                              <th>Requested</th>
                              <th>Status</th>
                              {isCoordinator && <th>Actions</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const totalItems = filteredMentees.length;
                              const totalPages = Math.ceil(totalItems / menteesPerPage) || 1;
                              const safePage = Math.min(currentMenteePage, totalPages);
                              
                              if (currentMenteePage !== safePage && totalItems > 0) {
                                setTimeout(() => setCurrentMenteePage(safePage), 0);
                              }
                              
                              const startIndex = (currentMenteePage - 1) * menteesPerPage;
                              const endIndex = Math.min(startIndex + menteesPerPage, totalItems);
                              const paginatedMentees = totalItems > 0 ? filteredMentees.slice(startIndex, endIndex) : [];
                              
                              return paginatedMentees.map((mentee) => {
                                const displayName = getDisplayName(mentee);
                                const displayDepartment = getDepartment(mentee);
                                const displayEmail = mentee.email && mentee.email !== 'N/A' ? mentee.email : 'No email';
                                const displayPhone = getDisplayPhoneNumber(mentee);
                                const displayArea = mentee.area_of_interest && mentee.area_of_interest !== 'N/A' ? mentee.area_of_interest : 'Not specified';
                                const displayDescription = mentee.description && mentee.description !== 'N/A'
                                  ? mentee.description.length > 80 
                                    ? mentee.description.substring(0, 80) + '...' 
                                    : mentee.description
                                  : '—';
                                const displayPhase = mentee.phaseId && mentee.phaseId !== 'N/A' ? `Phase ${mentee.phaseId}` : 'N/A';
                                const displayStatus = mentee.status || 'pending';
                                const statusClass = getStatusClass(displayStatus);

                                return (
                                  <tr key={mentee._id}>
                                    <td className="md-id-cell">MT{(mentee._id?.toString() || '').slice(-6)}</td>
                                    <td className="md-name-cell">{displayName}</td>
                                    <td className="md-department-cell">{displayDepartment}</td>
                                    <td className="md-email-cell">{displayEmail}</td>
                                    <td className="md-phone-cell">{displayPhone}</td>
                                    <td className="md-interest-cell">{displayArea}</td>
                                    <td className="md-description-cell" title={mentee.description || ''}>{displayDescription}</td>
                                    <td><span className="md-phase-badge">{displayPhase}</span></td>
                                    <td className="md-date-cell">{formatDate(mentee.createdAt)}</td>
                                    <td>
                                      <span className={`md-status-badge ${statusClass}`}>
                                        {displayStatus}
                                      </span>
                                    </td>
                                    {isCoordinator && (
                                      <td className="md-actions-cell">
                                        <button 
                                          className="md-delete-btn"
                                          onClick={() => handleDeleteClick('mentee', mentee)}
                                          title="Delete Mentee"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Mentee Pagination - DYNAMIC */}
                    {(() => {
                      const totalItems = filteredMentees.length;
                      const totalPages = Math.ceil(totalItems / menteesPerPage) || 1;
                      
                      if (totalPages <= 1) return null;
                      
                      const pageButtons = getPaginationButtons(currentMenteePage, totalPages);
                      
                      return (
                        <div className="md-meeting-pagination md-mentee-pagination">
                          <button 
                            className="md-pagination-btn"
                            onClick={() => setCurrentMenteePage(prev => Math.max(1, prev - 1))}
                            disabled={currentMenteePage === 1}
                          >
                            ◀ Previous
                          </button>
                          
                          <div className="md-pagination-dots">
                            {pageButtons.map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="md-pagination-ellipsis">…</span>
                              ) : (
                                <button
                                  key={page}
                                  className={`md-pagination-dot ${currentMenteePage === page ? 'active' : ''}`}
                                  onClick={() => setCurrentMenteePage(page)}
                                >
                                  {page}
                                </button>
                              )
                            ))}
                          </div>
                          
                          <button 
                            className="md-pagination-btn"
                            onClick={() => setCurrentMenteePage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentMenteePage === totalPages}
                          >
                            Next ▶
                          </button>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* ASSIGNMENTS TAB - WITH DYNAMIC PAGINATION */}
            {activeTab === 'assignments' && (
              <div className="md-assignments-tab">
                <div className="md-section-header-with-filters">
                  <div className="md-title-and-buttons">
                    <h2 className="md-section-title">Mentor-Mentee Assignments ({filteredAssignments.length})</h2>
                    <div className="md-header-buttons">
                      <button 
                        className="md-download-btn"
                        onClick={downloadAssignments}
                      >
                        Download Details
                      </button>
                    </div>
                  </div>
                  
                  <div className="md-filters-container md-glass-card">
                    <div className="md-filter-row">
                      <div className="md-filter-group">
                        <label>Mentor Email</label>
                        <input
                          type="text"
                          name="mentorEmail"
                          placeholder="Filter by mentor email..."
                          value={assignmentFilters.mentorEmail}
                          onChange={handleAssignmentFilterChange}
                          className="md-filter-input"
                          list="mentorEmailSuggestions"
                        />
                        <datalist id="mentorEmailSuggestions">
                          {getUniqueMentorEmails().map(email => (
                            <option key={email} value={email} />
                          ))}
                        </datalist>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Mentee Email</label>
                        <input
                          type="text"
                          name="menteeEmail"
                          placeholder="Filter by mentee email..."
                          value={assignmentFilters.menteeEmail}
                          onChange={handleAssignmentFilterChange}
                          className="md-filter-input"
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Phase</label>
                        <select
                          name="phase"
                          value={assignmentFilters.phase}
                          onChange={handleAssignmentFilterChange}
                          className="md-filter-select"
                        >
                          <option value="all">All Phases</option>
                          {getUniquePhasesForFilter().map(phase => (
                            <option key={phase} value={phase}>Phase {phase}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md-filter-actions">
                        <button 
                          className="md-apply-btn"
                          onClick={() => applyAssignmentFilters(assignments, assignmentFilters)}
                        >
                          Apply
                        </button>
                        <button 
                          className="md-reset-btn"
                          onClick={resetAssignmentFilters}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {filteredAssignments.length === 0 ? (
                  <div className="md-empty-state md-glass-card">
                    <p>No assignments found with current filters</p>
                  </div>
                ) : (
                  <>
                    <div className="md-data-table-container">
                      <div className="md-data-table md-glass-card">
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Mentor Name</th>
                              <th>Mentor Email</th>
                              <th>Mentor Phone</th>
                              <th>Phase</th>
                              <th>Mentees</th>
                              <th>Assigned Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const totalItems = filteredAssignments.length;
                              const totalPages = Math.ceil(totalItems / assignmentsPerPage) || 1;
                              const safePage = Math.min(currentAssignmentPage, totalPages);
                              
                              if (currentAssignmentPage !== safePage && totalItems > 0) {
                                setTimeout(() => setCurrentAssignmentPage(safePage), 0);
                              }
                              
                              const startIndex = (currentAssignmentPage - 1) * assignmentsPerPage;
                              const endIndex = Math.min(startIndex + assignmentsPerPage, totalItems);
                              const paginatedAssignments = totalItems > 0 ? filteredAssignments.slice(startIndex, endIndex) : [];
                              
                              return paginatedAssignments.map((assignment, index) => (
                                <tr key={assignment._id}>
                                  <td className="md-index-cell">{startIndex + index + 1}</td>
                                  <td className="md-name-cell">{assignment.mentorDetails?.name || 'N/A'}</td>
                                  <td className="md-email-cell">{assignment.mentorDetails?.email || 'N/A'}</td>
                                  <td className="md-phone-cell">{assignment.mentorDetails?.phone_number || assignment.mentorDetails?.phoneNumber || 'N/A'}</td>
                                  <td><span className="md-phase-badge">{assignment.phaseId ? `Phase ${assignment.phaseId}` : 'N/A'}</span></td>
                                  <td className="md-mentees-cell">
                                    <div 
                                      className="md-clickable-mentees"
                                      onClick={() => openMenteeDetailsModal(
                                        assignment.mentees, 
                                        `Mentees assigned to ${assignment.mentorDetails?.name || 'Mentor'}`
                                      )}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <span className="md-count-badge">{assignment.mentees?.length || 0}</span>
                                      <span className="md-mentees-label">Mentee(s)</span>
                                      <span className="md-click-icon">👁️</span>
                                    </div>
                                  </td>
                                  <td className="md-date-cell">{formatDate(assignment.createdAt)}</td>
                                  <td className="md-actions-cell">
                                    {isCoordinator && (
                                      <button 
                                        className="md-delete-btn"
                                        onClick={() => handleDeleteClick('assignment', assignment)}
                                        title="Delete Assignment"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Assignment Pagination - DYNAMIC */}
                    {(() => {
                      const totalItems = filteredAssignments.length;
                      const totalPages = Math.ceil(totalItems / assignmentsPerPage) || 1;
                      
                      if (totalPages <= 1) return null;
                      
                      const pageButtons = getPaginationButtons(currentAssignmentPage, totalPages);
                      
                      return (
                        <div className="md-meeting-pagination md-assignment-pagination">
                          <button 
                            className="md-pagination-btn"
                            onClick={() => setCurrentAssignmentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentAssignmentPage === 1}
                          >
                            ◀ Previous
                          </button>
                          
                          <div className="md-pagination-dots">
                            {pageButtons.map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="md-pagination-ellipsis">…</span>
                              ) : (
                                <button
                                  key={page}
                                  className={`md-pagination-dot ${currentAssignmentPage === page ? 'active' : ''}`}
                                  onClick={() => setCurrentAssignmentPage(page)}
                                >
                                  {page}
                                </button>
                              )
                            ))}
                          </div>
                          
                          <button 
                            className="md-pagination-btn"
                            onClick={() => setCurrentAssignmentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentAssignmentPage === totalPages}
                          >
                            Next ▶
                          </button>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* MEETINGS TAB - WITH DYNAMIC PAGINATION */}
            {activeTab === 'meetings' && (
              <div className="md-meetings-tab">
                <div className="md-section-header-with-filters">
                  <div className="md-title-and-buttons">
                    <h2 className="md-section-title">Meetings ({filteredMeetings.length || meetings.length})</h2>
                    <div className="md-header-buttons">
                      <button 
                        className="md-download-btn"
                        onClick={downloadMeetings}
                      >
                        Download Details
                      </button>
                    </div>
                  </div>
                  
                  <div className="md-filters-container md-glass-card">
                    <div className="md-filter-row">
                      <div className="md-filter-group">
                        <label>From Date</label>
                        <input
                          type="date"
                          name="dateFrom"
                          value={meetingFilters.dateFrom}
                          onChange={handleFilterChange}
                          className="md-filter-input"
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>To Date</label>
                        <input
                          type="date"
                          name="dateTo"
                          value={meetingFilters.dateTo}
                          onChange={handleFilterChange}
                          className="md-filter-input"
                        />
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Status</label>
                        <select
                          name="status"
                          value={meetingFilters.status}
                          onChange={handleFilterChange}
                          className="md-filter-select"
                        >
                          <option value="all">All Status</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Phase</label>
                        <select
                          name="phase"
                          value={meetingFilters.phase}
                          onChange={handleMeetingFilterChange}
                          className="md-filter-select"
                        >
                          <option value="all">All Phases</option>
                          {getUniquePhasesForFilter().map(phase => (
                            <option key={phase} value={phase}>Phase {phase}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Filter by Email</label>
                        <input
                          type="text"
                          name="email"
                          placeholder="Mentor or Mentee email..."
                          value={meetingFilters.email}
                          onChange={handleMeetingFilterChange}
                          className="md-filter-input"
                        />
                      </div>
                      
                      <div className="md-filter-actions">
                        <button className="md-apply-btn" onClick={applyMeetingFiltersAndFetch}>Apply Filters</button>
                        <button className="md-reset-btn" onClick={resetMeetingFilters}>Reset</button>
                      </div>
                    </div>
                  </div>
                </div>

                {(() => {
                  const hasActiveFilters = meetingFilters.phase !== 'all' || 
                                           meetingFilters.email !== '' || 
                                           meetingFilters.dateFrom !== '' || 
                                           meetingFilters.dateTo !== '' || 
                                           meetingFilters.status !== 'all';
                  
                  const meetingsToShow = hasActiveFilters ? filteredMeetings : meetings;
                  const totalItems = meetingsToShow.length;
                  const totalPages = Math.ceil(totalItems / meetingsPerPage) || 1;
                  
                  const safePage = Math.min(currentMeetingPage, totalPages);
                  if (currentMeetingPage !== safePage && totalItems > 0) {
                    setTimeout(() => setCurrentMeetingPage(safePage), 0);
                  }
                  
                  const startIndex = (currentMeetingPage - 1) * meetingsPerPage;
                  const endIndex = Math.min(startIndex + meetingsPerPage, totalItems);
                  const paginatedMeetings = totalItems > 0 ? meetingsToShow.slice(startIndex, endIndex) : [];
                  
                  return (
                    <>
                      <div className="md-meeting-count-info">
                        <span>Showing {paginatedMeetings.length} of {totalItems} meetings</span>
                        {hasActiveFilters && filteredMeetings.length !== meetings.length && (
                          <span className="md-filter-badge"> (filtered)</span>
                        )}
                      </div>

                      {totalItems === 0 ? (
                        <div className="md-empty-state md-glass-card">
                          <div className="md-empty-icon">📭</div>
                          <p>No meetings found</p>
                          <small>Try adjusting your filters or check back later</small>
                        </div>
                      ) : (
                        <>
                          <div className="md-data-table-container">
                            <div className="md-data-table md-glass-card">
                              <table>
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Mentor</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Sessions</th>
                                    <th>Status</th>
                                    <th>Platform</th>
                                    <th>Agenda</th>
                                    <th>Mentees</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedMeetings.map((meeting, index) => {
                                    const status = meeting.status || 'scheduled';
                                    const statusClass = getStatusClass(status);
                                    const menteeCount = meeting.mentees?.length || 0;
                                    const totalSessions = meeting.meeting_dates?.length || 0;
                                    
                                    return (
                                      <tr key={meeting._id}>
                                        <td className="md-index-cell">{startIndex + index + 1}</td>
                                        <td className="md-name-cell">{meeting.mentorDetails?.name || 'Mentor'}</td>
                                        <td className="md-email-cell">{meeting.mentorDetails?.email || 'No email'}</td>
                                        <td className="md-phone-cell">{getDisplayPhoneNumber(meeting.mentorDetails)}</td>
                                        <td className="md-sessions-cell">
                                          <div 
                                            className="md-clickable-sessions"
                                            onClick={() => openMeetingDetailsModal(
                                              meeting.meeting_dates,
                                              meeting.mentorDetails,
                                              `Meeting Sessions - ${meeting.mentorDetails?.name || 'Mentor'}`
                                            )}
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <span className="md-count-badge">{totalSessions}</span>
                                            <span className="md-sessions-label">Session(s)</span>
                                            <span className="md-click-icon">👁️</span>
                                          </div>
                                        </td>
                                        <td>
                                          <span className={`md-status-badge ${statusClass}`}>
                                            {status}
                                          </span>
                                        </td>
                                        <td>
                                          <span className="md-platform-badge">
                                            {meeting.platform || 'N/A'}
                                          </span>
                                        </td>
                                        <td className="md-description-cell" title={meeting.agenda || ''}>
                                          {meeting.agenda ? 
                                            (meeting.agenda.length > 40 ? meeting.agenda.substring(0, 40) + '...' : meeting.agenda) 
                                            : '—'}
                                        </td>
                                        <td>
                                          <div 
                                            className="md-clickable-mentees"
                                            onClick={() => openMenteeDetailsModal(
                                              meeting.mentees, 
                                              `Mentees in meeting with ${meeting.mentorDetails?.name || 'Mentor'}`
                                            )}
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <span className="md-count-badge">{menteeCount}</span>
                                            <span className="md-click-icon">👁️</span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Meeting Pagination - DYNAMIC */}
                          {totalPages > 1 && (
                            <div className="md-meeting-pagination">
                              <button 
                                className="md-pagination-btn"
                                onClick={() => setCurrentMeetingPage(prev => Math.max(1, prev - 1))}
                                disabled={currentMeetingPage === 1}
                              >
                                ◀ Previous
                              </button>
                              
                              <div className="md-pagination-dots">
                                {(() => {
                                  const pageButtons = getPaginationButtons(currentMeetingPage, totalPages);
                                  return pageButtons.map((page, idx) => (
                                    page === '...' ? (
                                      <span key={`ellipsis-${idx}`} className="md-pagination-ellipsis">…</span>
                                    ) : (
                                      <button
                                        key={page}
                                        className={`md-pagination-dot ${currentMeetingPage === page ? 'active' : ''}`}
                                        onClick={() => setCurrentMeetingPage(page)}
                                      >
                                        {page}
                                      </button>
                                    )
                                  ));
                                })()}
                              </div>
                              
                              <button 
                                className="md-pagination-btn"
                                onClick={() => setCurrentMeetingPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentMeetingPage === totalPages}
                              >
                                Next ▶
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* FEEDBACK TAB - WITH DYNAMIC PAGINATION */}
            {activeTab === 'feedback' && (
              <div className="md-feedback-tab">
                <div className="md-section-header-with-filters">
                  <div className="md-title-and-buttons">
                    <h2 className="md-section-title">Program Feedback ({filteredFeedbacks.length})</h2>
                    <div className="md-header-buttons">
                      <button 
                        className="md-download-btn"
                        onClick={downloadFeedbacks}
                      >
                        Download Details
                      </button>
                    </div>
                  </div>
                  
                  <div className="md-filters-container md-glass-card">
                    <div className="md-filter-row">
                      <div className="md-filter-group">
                        <label>Email</label>
                        <input
                          type="text"
                          name="email"
                          placeholder="Filter by email..."
                          value={feedbackFilters.email}
                          onChange={handleFeedbackFilterChange}
                          className="md-filter-input"
                          list="feedbackEmailSuggestions"
                        />
                        <datalist id="feedbackEmailSuggestions">
                          {getUniqueFeedbackEmails().map(email => (
                            <option key={email} value={email} />
                          ))}
                        </datalist>
                      </div>
                      
                      <div className="md-filter-group">
                        <label>Phase</label>
                        <select
                          name="phase"
                          value={feedbackFilters.phase}
                          onChange={handleFeedbackFilterChange}
                          className="md-filter-select"
                        >
                          <option value="all">All Phases</option>
                          {getUniquePhasesForFilter().map(phase => (
                            <option key={phase} value={phase}>Phase {phase}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md-filter-actions">
                        <button 
                          className="md-apply-btn"
                          onClick={() => applyFeedbackFilters(feedbacks, feedbackFilters)}
                        >
                          Apply
                        </button>
                        <button 
                          className="md-reset-btn"
                          onClick={resetFeedbackFilters}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {filteredFeedbacks.length === 0 ? (
                  <div className="md-empty-state md-glass-card">
                    <p>No feedback submissions found with current filters</p>
                  </div>
                ) : (
                  <>
                    <div className="md-feedback-grid">
                      {(() => {
                        const totalItems = filteredFeedbacks.length;
                        const totalPages = Math.ceil(totalItems / feedbacksPerPage) || 1;
                        const safePage = Math.min(currentFeedbackPage, totalPages);
                        
                        if (currentFeedbackPage !== safePage && totalItems > 0) {
                          setTimeout(() => setCurrentFeedbackPage(safePage), 0);
                        }
                        
                        const startIndex = (currentFeedbackPage - 1) * feedbacksPerPage;
                        const endIndex = Math.min(startIndex + feedbacksPerPage, totalItems);
                        const paginatedFeedbacks = totalItems > 0 ? filteredFeedbacks.slice(startIndex, endIndex) : [];
                        
                        return paginatedFeedbacks.map((feedback) => {
                          const userEmail = feedback.userDetails?.email || 'No email';
                          const userName = userEmail !== 'No email' ? userEmail.split('@')[0] : 'Anonymous';
                          const displayName = <strong>{userName}</strong>;
                          
                          return (
                            <div key={feedback._id} className="md-feedback-card md-glass-card">
                              <div className="md-feedback-header">
                                <div>
                                  <h4>{displayName}</h4>
                                  <p>{userEmail} • {feedback.role || 'Not specified'}</p>
                                  {feedback.userDetails?.phone_number && feedback.userDetails.phone_number !== 'N/A' && (
                                    <p>Phone: {feedback.userDetails.phone_number}</p>
                                  )}
                                  {feedback.phaseId && <p className="md-feedback-phase">Phase {feedback.phaseId}</p>}
                                </div>
                                <span>{formatDate(feedback.createdAt)}</span>
                              </div>
                              
                              <div className="md-feedback-ratings-grid">
                                <div><strong>Overall Satisfaction:</strong> {getRatingStars(feedback.overallSatisfaction)} ({feedback.overallSatisfaction || 'N/A'}/5)</div>
                                <div><strong>Program Organization:</strong> {getRatingStars(feedback.programOrganization)} ({feedback.programOrganization || 'N/A'}/5)</div>
                                <div><strong>Matching Process:</strong> {getRatingStars(feedback.matchingProcess)} ({feedback.matchingProcess || 'N/A'}/5)</div>
                                <div><strong>Support Provided:</strong> {getRatingStars(feedback.supportProvided)} ({feedback.supportProvided || 'N/A'}/5)</div>
                              </div>
                              
                              {feedback.generalFeedback && (
                                <div><strong>General Feedback:</strong> {feedback.generalFeedback}</div>
                              )}
                              
                              {feedback.suggestions && (
                                <div><strong>Suggestions:</strong> {feedback.suggestions}</div>
                              )}
                              
                              <div>
                                <strong>Participate again:</strong> {feedback.participateAgain || 'Not specified'}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    {/* Feedback Pagination - DYNAMIC */}
                    {(() => {
                      const totalItems = filteredFeedbacks.length;
                      const totalPages = Math.ceil(totalItems / feedbacksPerPage) || 1;
                      
                      if (totalPages <= 1) return null;
                      
                      const pageButtons = getPaginationButtons(currentFeedbackPage, totalPages);
                      
                      return (
                        <div className="md-meeting-pagination md-feedback-pagination">
                          <button 
                            className="md-pagination-btn"
                            onClick={() => setCurrentFeedbackPage(prev => Math.max(1, prev - 1))}
                            disabled={currentFeedbackPage === 1}
                          >
                            ◀ Previous
                          </button>
                          
                          <div className="md-pagination-dots">
                            {pageButtons.map((page, idx) => (
                              page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="md-pagination-ellipsis">…</span>
                              ) : (
                                <button
                                  key={page}
                                  className={`md-pagination-dot ${currentFeedbackPage === page ? 'active' : ''}`}
                                  onClick={() => setCurrentFeedbackPage(page)}
                                >
                                  {page}
                                </button>
                              )
                            ))}
                          </div>
                          
                          <button 
                            className="md-pagination-btn"
                            onClick={() => setCurrentFeedbackPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentFeedbackPage === totalPages}
                          >
                            Next ▶
                          </button>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* FEEDBACK MANAGEMENT TAB */}
            {activeTab === 'feedback-management' && (
              <div className="md-feedback-management-tab">
                <div className="md-fm-header">
                  <div className="md-fm-header-content">
                    <h2 className="md-fm-title">Feedback Management</h2>
                    <p className="md-fm-subtitle">Control feedback visibility for each program phase</p>
                  </div>
                </div>

                <div className="md-fm-filter-container md-glass-card">
                  <div className="md-filter-row">
                    <div className="md-filter-group">
                      <label>Filter by Phase</label>
                      <select
                        value={feedbackManagementPhaseFilter}
                        onChange={(e) => setFeedbackManagementPhaseFilter(e.target.value)}
                        className="md-filter-select"
                      >
                        <option value="all">All Phases</option>
                        {getUniquePhasesForFilter().map(phase => (
                          <option key={phase} value={phase}>Phase {phase}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md-filter-actions">
                      <button 
                        className="md-reset-btn" 
                        onClick={() => setFeedbackManagementPhaseFilter('all')}
                      >
                        Clear Filter
                      </button>
                    </div>
                  </div>
                </div>

                {feedbackSettingsLoading && allPhases.length === 0 ? (
                  <div className="md-fm-loading">
                    <div className="md-fm-spinner"></div>
                    <p>Loading phases...</p>
                  </div>
                ) : (
                  <>
                    <div className="md-fm-stats-grid">
                      <div className="md-fm-stat-card">
                        <div className="md-fm-stat-icon">📋</div>
                        <div className="md-fm-stat-info">
                          <div className="md-fm-stat-number">{getFilteredPhasesForManagement().length}</div>
                          <div className="md-fm-stat-label">Showing Phases</div>
                        </div>
                      </div>
                      <div className="md-fm-stat-card success">
                        <div className="md-fm-stat-icon">✅</div>
                        <div className="md-fm-stat-info">
                          <div className="md-fm-stat-number">
                            {getFilteredPhasesForManagement().filter(p => getFeedbackStatusForPhase(p.phaseId)).length}
                          </div>
                          <div className="md-fm-stat-label">Feedback Enabled</div>
                        </div>
                      </div>
                      <div className="md-fm-stat-card warning">
                        <div className="md-fm-stat-icon">🔒</div>
                        <div className="md-fm-stat-info">
                          <div className="md-fm-stat-number">
                            {getFilteredPhasesForManagement().filter(p => !getFeedbackStatusForPhase(p.phaseId)).length}
                          </div>
                          <div className="md-fm-stat-label">Feedback Disabled</div>
                        </div>
                      </div>
                    </div>

                    <div className="md-fm-phases-grid">
                      {getFilteredPhasesForManagement().map((phase) => {
                        const isEnabled = getFeedbackStatusForPhase(phase.phaseId);
                        const setting = feedbackSettings.find(s => s.phaseId === phase.phaseId);
                        
                        return (
                          <div key={phase.phaseId} className={`md-fm-phase-card ${isEnabled ? 'enabled' : 'disabled'}`}>
                            <div className="md-fm-card-header">
                              <div className="md-fm-phase-badge">
                                <span className="md-fm-phase-number">Phase {phase.phaseId}</span>
                                <span className={`md-fm-status-badge ${isEnabled ? 'status-enabled' : 'status-disabled'}`}>
                                  {isEnabled ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </div>
                              <button
                                className={`md-fm-toggle-btn ${isEnabled ? 'btn-disable' : 'btn-enable'}`}
                                onClick={() => toggleFeedbackForPhase(phase.phaseId, isEnabled)}
                                disabled={feedbackSettingsLoading}
                              >
                                {isEnabled ? (
                                  <>
                                    <span>🔒</span>
                                    Disable Feedback
                                  </>
                                ) : (
                                  <>
                                    <span>✅</span>
                                    Enable Feedback
                                  </>
                                )}
                              </button>
                            </div>
                            
                            <div className="md-fm-card-body">
                              <h3 className="md-fm-phase-name">{phase.name}</h3>
                              <div className="md-fm-phase-dates">
                                <span>📅</span>
                                {new Date(phase.startDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} - {new Date(phase.endDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              
                              <div className="md-fm-info-message">
                                {isEnabled ? (
                                  <>
                                    <span className="info-icon">✅</span>
                                    <span>Feedback is visible to all mentors and mentees in this phase</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="info-icon">🔒</span>
                                    <span>Feedback is hidden. Enable to allow users to view and submit feedback</span>
                                  </>
                                )}
                              </div>
                              
                              {setting && setting.updatedAt && isEnabled && (
                                <div className="md-fm-updated">
                                  <span>🕒</span>
                                  Last updated: {new Date(setting.updatedAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {getFilteredPhasesForManagement().length === 0 && !feedbackSettingsLoading && (
                      <div className="md-fm-empty-state">
                        <div className="md-fm-empty-icon">📋</div>
                        <p>No phases found for the selected filter</p>
                        <small>Try changing the phase filter or create new phases</small>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== MENTEE DETAILS MODAL ========== */}
      {showMenteeDetailsModal && (
        <div className="modal-overlay mentee-details-modal-overlay">
          <div className="modal-container mentee-details-modal-container">
            <div className="modal-header">
              <h3>{menteeDetailsTitle}</h3>
              <button className="modal-close" onClick={closeMenteeDetailsModal}>✕</button>
            </div>
            <div className="modal-body mentee-details-modal-body">
              {menteeDetailsData && menteeDetailsData.length > 0 ? (
                <div className="mentee-details-list">
                  <div className="mentee-details-grid-header">
                    <span>#</span>
                    <span>Name</span>
                    <span>Department</span>
                    <span>Email</span>
                    <span>Phone</span>
                  </div>
                  {menteeDetailsData.map((mentee, index) => (
                    <div key={index} className="mentee-details-grid-row">
                      <span>{index + 1}</span>
                      <span className="mentee-name">{getDisplayName(mentee)}</span>
                      <span className="mentee-dept">{getDepartment(mentee)}</span>
                      <span className="mentee-email">{mentee.email || 'No email'}</span>
                      <span className="mentee-phone">{getDisplayPhoneNumber(mentee)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mentee-details-empty">
                  <span className="empty-icon">📭</span>
                  <p>No mentees found</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={closeMenteeDetailsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MEETING DETAILS MODAL ========== */}
      {showMeetingDetailsModal && (
        <div className="modal-overlay meeting-details-modal-overlay">
          <div className="modal-container meeting-details-modal-container">
            <div className="modal-header">
              <h3>{meetingDetailsTitle}</h3>
              <button className="modal-close" onClick={closeMeetingDetailsModal}>✕</button>
            </div>
            <div className="modal-body meeting-details-modal-body">
              {meetingDetailsMentor && (
                <div className="meeting-mentor-info">
                  <div className="mentor-info-item">
                    <strong>Mentor:</strong> {meetingDetailsMentor.name || 'N/A'}
                  </div>
                  <div className="mentor-info-item">
                    <strong>Email:</strong> {meetingDetailsMentor.email || 'N/A'}
                  </div>
                  {meetingDetailsMentor.phone_number && (
                    <div className="mentor-info-item">
                      <strong>Phone:</strong> {meetingDetailsMentor.phone_number}
                    </div>
                  )}
                </div>
              )}
              
              {meetingDetailsData && meetingDetailsData.length > 0 ? (
                <div className="meeting-details-list">
                  <div className="meeting-details-grid-header">
                    <span>#</span>
                    <span>Date</span>
                    <span>Time</span>
                    <span>Duration</span>
                    <span>Status</span>
                    <span>Meeting Link</span>
                  </div>
                  {meetingDetailsData.map((session, index) => {
                    const date = session.date ? formatDate(session.date) : 'N/A';
                    const time = session.meeting_time ? formatTime(session.meeting_time) : 'N/A';
                    const duration = session.duration_minutes || 30;
                    const status = session.status || 'scheduled';
                    const statusClass = getDateStatusClass(status);
                    const meetingLink = session.meeting_link || 'N/A';
                    
                    return (
                      <div key={index} className="meeting-details-grid-row">
                        <span>{index + 1}</span>
                        <span className="meeting-date">{date}</span>
                        <span className="meeting-time">{time}</span>
                        <span className="meeting-duration">{duration} min</span>
                        <span>
                          <span className={`md-session-status-badge ${statusClass}`}>
                            {status}
                          </span>
                        </span>
                        <span className="meeting-link">
                          {meetingLink !== 'N/A' ? (
                            <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="meeting-link-btn">
                              🔗 Link
                            </a>
                          ) : 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="meeting-details-empty">
                  <span className="empty-icon">📅</span>
                  <p>No meeting sessions found</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={closeMeetingDetailsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Mentor Modal */}
      {showAddMentorForm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h3>Add New Mentor</h3>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                placeholder="mentor@example.com"
                value={addMentorData.email}
                onChange={(e) => setAddMentorData({...addMentorData, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Areas of Interest * (comma separated)</label>
              <input
                type="text"
                placeholder="Web Development, Data Science, Cloud Computing"
                value={addMentorData.areas_of_interest.join(', ')}
                onChange={(e) => setAddMentorData({
                  ...addMentorData, 
                  areas_of_interest: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
              />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea
                rows="3"
                placeholder="Describe mentor's experience and expertise"
                value={addMentorData.description}
                onChange={(e) => setAddMentorData({...addMentorData, description: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Phase</label>
              <input type="text" value={currentPhaseId ? `Phase ${currentPhaseId}` : 'Loading...'} disabled className="phase-input" />
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowAddMentorForm(false)}>Cancel</button>
              <button className="modal-submit" onClick={handleAddMentor} disabled={addLoading}>
                {addLoading ? 'Adding...' : 'Add Mentor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Mentee Modal */}
      {showAddMenteeForm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h3>Add New Mentee</h3>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                placeholder="mentee@example.com"
                value={addMenteeData.email}
                onChange={(e) => setAddMenteeData({...addMenteeData, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Area of Interest *</label>
              <select
                value={addMenteeData.area_of_interest}
                onChange={(e) => setAddMenteeData({...addMenteeData, area_of_interest: e.target.value})}
              >
                <option value="">Select Area</option>
                <option value="web-development">Web Development</option>
                <option value="data-science">Data Science</option>
                <option value="machine-learning">Machine Learning</option>
                <option value="cloud-computing">Cloud Computing</option>
                <option value="cybersecurity">Cybersecurity</option>
                <option value="app-development">App Development</option>
                <option value="devops">DevOps</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea
                rows="3"
                placeholder="What does the mentee want to learn?"
                value={addMenteeData.description}
                onChange={(e) => setAddMenteeData({...addMenteeData, description: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Phase</label>
              <input type="text" value={currentPhaseId ? `Phase ${currentPhaseId}` : 'Loading...'} disabled className="phase-input" />
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowAddMenteeForm(false)}>Cancel</button>
              <button className="modal-submit" onClick={handleAddMentee} disabled={addLoading}>
                {addLoading ? 'Adding...' : 'Add Mentee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MENTOR ASSIGNMENT DETAILS MODAL ========== */}
      {showMentorAssignmentModal && (
        <div className="modal-overlay mentor-assignment-modal-overlay">
          <div className="modal-container mentor-assignment-modal-container">
            <div className="modal-header">
              <h3>
                {selectedMentorForAssignment ? (
                  `${selectedMentorForAssignment.name || getDisplayName(selectedMentorForAssignment)} - Assignments`
                ) : (
                  'Mentor Assignments'
                )}
              </h3>
              <button className="modal-close" onClick={closeMentorAssignmentModal}>✕</button>
            </div>
            
            <div className="modal-body mentor-assignment-modal-body">
              {mentorAssignmentLoading ? (
                <div className="md-loading-container">
                  <div className="md-spinner"></div>
                  <p>Loading assignments...</p>
                </div>
              ) : mentorAssignmentError ? (
                <div className="mentor-assignment-error">
                  <span className="error-icon">⚠️</span>
                  <p className="error-title">{mentorAssignmentError}</p>
                  {mentorAssignmentError.includes('not been assigned') && (
                    <p className="error-hint">
                      This mentor needs to be assigned to mentees first. 
                      You can assign mentees from the <strong>Assignments</strong> tab.
                    </p>
                  )}
                  {selectedMentorForAssignment && (
                    <div className="mentor-info-box">
                      <div><strong>Mentor:</strong> {selectedMentorForAssignment.name || getDisplayName(selectedMentorForAssignment)}</div>
                      <div><strong>Email:</strong> {selectedMentorForAssignment.email || 'No email'}</div>
                      <div><strong>Phase:</strong> {selectedMentorForAssignment.phaseId || 'N/A'}</div>
                      <div><strong>Status:</strong> {selectedMentorForAssignment.status || 'pending'}</div>
                    </div>
                  )}
                  <button 
                    className="modal-cancel-btn" 
                    onClick={closeMentorAssignmentModal}
                    style={{ marginTop: '16px' }}
                  >
                    Close
                  </button>
                </div>
              ) : mentorAssignmentDetails && mentorAssignmentDetails.assignments && mentorAssignmentDetails.assignments.length > 0 ? (
                <div className="mentor-assignments-list">
                  <div className="mentor-assignment-summary">
                    <div className="summary-item">
                      <span className="summary-label">Total Assignments</span>
                      <span className="summary-value">{mentorAssignmentDetails.assignments.length}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Total Mentees</span>
                      <span className="summary-value">
                        {mentorAssignmentDetails.assignments.reduce((total, a) => total + (a.mentees?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Current Phase</span>
                      <span className="summary-value">
                        {mentorAssignmentDetails.currentPhaseId || 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  {mentorAssignmentDetails.assignments.map((assignment, index) => (
                    <div key={assignment._id || index} className="mentor-assignment-card">
                      <div className="assignment-card-header">
                        <div className="assignment-phase-info">
                          <span className="phase-id-badge">Phase {assignment.phaseId}</span>
                          {assignment.isCurrentPhase && (
                            <span className="current-phase-badge">Current</span>
                          )}
                          <span className="assignment-date">
                            {formatDate(assignment.assignedDate || assignment.createdAt)}
                          </span>
                        </div>
                        <div className="assignment-mentee-count">
                          <span className="count-badge">
                            {assignment.mentees?.length || 0} Mentees
                          </span>
                        </div>
                      </div>
                      
                      {assignment.mentees && assignment.mentees.length > 0 ? (
                        <div className="assignment-mentees-grid">
                          <div className="mentees-grid-header">
                            <span>#</span>
                            <span>Name</span>
                            <span>Department</span>
                            <span>Email</span>
                            <span>Phone</span>
                          </div>
                          {assignment.mentees.map((mentee, idx) => (
                            <div key={mentee._id || idx} className="mentee-grid-row">
                              <span>{idx + 1}</span>
                              <span className="mentee-name">{getDisplayName(mentee)}</span>
                              <span className="mentee-dept">{getDepartment(mentee)}</span>
                              <span className="mentee-email">{mentee.email || 'No email'}</span>
                              <span className="mentee-phone">{getDisplayPhoneNumber(mentee)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-mentees-assigned">
                          <p>No mentees assigned for this phase</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mentor-assignment-empty">
                  <span className="empty-icon">📭</span>
                  <p>No assignments found for this mentor</p>
                  <small>This mentor has not been assigned to any mentees yet</small>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={closeMentorAssignmentModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete this {deleteType}?
              {deleteType === 'assignment' && ' This will also reset mentor and mentee status to pending.'}
            </p>
            <div className="delete-confirm-actions">
              <button className="delete-confirm-yes" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button className="delete-confirm-no" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}