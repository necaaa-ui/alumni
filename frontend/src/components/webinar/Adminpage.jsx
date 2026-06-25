import React, { useState, useEffect } from 'react';
import './Common.css';
import './AdminDashboard.css';
import * as XLSX from 'xlsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// V
const validateDomain = (value) => {
  const trimmed = value.trim();

  if (!trimmed) return "Domain cannot be empty.";
  if (trimmed.length < 3) return "Domain must be at least 3 characters.";
  if (trimmed.length > 50) return "Domain cannot exceed 50 characters.";
  if (!/^[A-Za-z0-9 ()\[\]{}.,'"\-_&+#@!?;:\/\\]+$/.test(trimmed))
     return "Domain must contain only English letters, numbers, spaces, and standard punctuation.";

  return "";
};

const getMonthKey = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
};

const getMonthsBetween = (startDateValue, endDateValue) => {
  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];

  const months = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= end) {
    const value = getMonthKey(cursor);
    months.push({ value, label: getMonthLabel(value) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};

const Adminpage = ({ userEmail }) => {
  const [isWebinarCoordinator, setIsWebinarCoordinator] = useState(true); // FORCE BYPASS - Admin always has access

  useEffect(() => {
    console.log('Adminpage loaded for email:', userEmail);
  }, [userEmail]);
  const [activeView, setActiveView] = useState('phase');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRemoveDomain, setShowRemoveDomain] = useState(false);
  const [domains, setDomains] = useState([{ department: '', domain: '' }]);
  const [activeCoordinatorView, setActiveCoordinatorView] = useState(null);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [showAddDepartmentForm, setShowAddDepartmentForm] = useState(false);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentCoordinatorData, setStudentCoordinatorData] = useState({ name: '', department: '', phoneNumber: '' });
  const [studentCoordinatorLoading, setStudentCoordinatorLoading] = useState(false);
  const [studentEmailError, setStudentEmailError] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminCoordinatorData, setAdminCoordinatorData] = useState({ name: '', department: '', phoneNumber: '' });
  const [adminCoordinatorLoading, setAdminCoordinatorLoading] = useState(false);
  const [adminEmailError, setAdminEmailError] = useState('');
  const [deptCoordinator, setDeptCoordinator] = useState({ name: '', email: '', department: '', phoneNumber: '' });
  const [deptCoordinatorLoading, setDeptCoordinatorLoading] = useState(false);
  const [deptCoordinatorErrors, setDeptCoordinatorErrors] = useState({ name: '', email: '', department: '', phoneNumber: '' });
  const [coordinators, setCoordinators] = useState([]);
  const [coordinatorsLoading, setCoordinatorsLoading] = useState(false);
  const [phaseId, setPhaseId] = useState('');
  const [startingDate, setStartingDate] = useState('');
  const [endingDate, setEndingDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [currentPhase, setCurrentPhase] = useState(null);
  const [phaseLoading, setPhaseLoading] = useState(true);
  const [webinars, setWebinars] = useState([]);
  const [webinarsLoading, setWebinarsLoading] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  const [speakerSearchTerm, setSpeakerSearchTerm] = useState('');
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ phaseIds: [], phases: [], domains: [], batches: [], departments: [] });
  const [phaseOptions, setPhaseOptions] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({ phaseId: '', domain: '', speakerName: '', batch: '', department: '', month: '' });
  const [lastPhaseDomains, setLastPhaseDomains] = useState([]);

  // Prize winners
  const [prizeWinners, setPrizeWinners] = useState([]);
  const [prizeWinnersLoading, setPrizeWinnersLoading] = useState(false);

  // Fetch current phase on component mount
  useEffect(() => {
    const fetchCurrentPhase = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/current-phase`);
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

  // Fetch last phase domains when phase view is active
  useEffect(() => {
    if (activeView === 'phase') {
      const fetchLastPhaseDomains = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/phases`);
          const data = await response.json();
          if (data.success && data.phases && data.phases.length > 0) {
            // Sort phases by createdAt descending to get the most recently created phase
            const sortedPhases = data.phases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const lastPhase = sortedPhases[0];
            setLastPhaseDomains(lastPhase.domains || []);
          }
        } catch (error) {
          console.error('Error fetching last phase domains:', error);
        }
      };

      fetchLastPhaseDomains();
    }
  }, [activeView]);

  // Fetch webinars, filter options, and speakers when webinar view is active
  useEffect(() => {
    if (activeView === 'webinar') {
      const fetchWebinars = async () => {
        setWebinarsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/webinars`);
          const webinarsData = await response.json();

          // Fetch phone numbers for each speaker
          const webinarsWithPhones = await Promise.all(
            webinarsData.map(async (webinar) => {
              if (webinar.speaker?.email) {
                try {
                  const memberResponse = await fetch(`${API_BASE_URL}/api/coordinators/member-by-email?email=${webinar.speaker.email}`);
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
          const response = await fetch(`${API_BASE_URL}/api/filter-options`);
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
          const response = await fetch(`${API_BASE_URL}/api/speakers`);
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
          const response = await fetch(`${API_BASE_URL}/api/speakers`);
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

  // Fetch prize winners when prize winners view is active
  useEffect(() => {
    const fetchPrizeWinners = async () => {
      setPrizeWinnersLoading(true);
      try {
        const [prizeWinnerResponse, filterResponse, phasesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/prize-winners`),
          fetch(`${API_BASE_URL}/api/filter-options`),
          fetch(`${API_BASE_URL}/api/phases`)
        ]);

        const data = await prizeWinnerResponse.json();
        const filterData = await filterResponse.json();
        const phasesData = await phasesResponse.json();

        if (filterResponse.ok) {
          setFilterOptions(filterData);
        }

        if (phasesResponse.ok && phasesData?.success) {
          setPhaseOptions(Array.isArray(phasesData.phases) ? phasesData.phases : []);
        }

        if (prizeWinnerResponse.ok && data?.success) {
          setPrizeWinners(Array.isArray(data.data) ? data.data : []);
        } else {
          setPrizeWinners([]);
        }
      } catch (error) {
        console.error('Error fetching prize winners:', error);
        setPrizeWinners([]);
      } finally {
        setPrizeWinnersLoading(false);
      }
    };

    if (activeView === 'prizeWinners') {
      fetchPrizeWinners();
    }
  }, [activeView]);


  const handleCreatePhase = async () => {
    // Clear previous errors
    setErrors({});

    // Validate inputs
    const newErrors = {};

    if (!phaseId.trim()) {
      newErrors.phaseId = 'Phase ID is required.';
    } else if (!/^\d+$/.test(phaseId)) {
      newErrors.phaseId = "Phase ID must contain only numbers.";
    } else if (phaseId.length > 4) {
      newErrors.phaseId = "Phase ID cannot exceed 4 digits.";
    } else {
      // Check if Phase ID already exists
      try {
        const response = await fetch(`${API_BASE_URL}/api/phases`);
        const data = await response.json();
        if (response.ok && data.success) {
          const existingPhase = data.phases.find(phase => phase.phaseId === parseInt(phaseId));
          if (existingPhase) {
            newErrors.phaseId = "Phase ID already exists. Please choose a different ID.";
          }
        }
      } catch (error) {
        console.error('Error checking phase uniqueness:', error);
        // Don't block submission if uniqueness check fails, let backend handle it
      }
    }

    if (!startingDate) {
      newErrors.startingDate = 'Starting date is required.';
    }

    if (!endingDate) {
      newErrors.endingDate = 'Ending date is required.';
    }

    // Validate dates if both are provided
    if (startingDate && endingDate) {
      const start = new Date(startingDate);
      const end = new Date(endingDate);
      if (isNaN(start)) {
        newErrors.startingDate = "Please enter a valid starting date.";
      }
      if (isNaN(end)) {
        newErrors.endingDate = "Please enter a valid ending date.";
      }
      if (!isNaN(start) && !isNaN(end) && end < start) {
        newErrors.endingDate = "Ending date cannot be earlier than starting date.";
      }
    }

    // Validate domains
    const validDomains = domains.filter(d => d.department && d.domain);
    if (validDomains.length === 0) {
      newErrors.domains = 'Please add at least one domain with department and domain name.';
    } else {
      // Validate each domain
      for (let i = 0; i < domains.length; i++) {
        const d = domains[i];
        if (d.department && d.domain) {
          const error = validateDomain(d.domain);
          if (error) {
            newErrors[`domain_${i}`] = `Domain Error (${d.department}): ${error}`;
          }
        }
      }
    }

    // Set errors if any
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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

      const response = await fetch(`${API_BASE_URL}/api/webinar-phases`, {
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
        setErrors({});
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

  // Handle student email change with validation and auto-fetch
  const handleStudentEmailChange = async (email) => {
    setStudentEmail(email);
    setStudentEmailError('');

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setStudentEmailError('Please enter a valid email address.');
      setStudentCoordinatorData({ name: '', department: '', phoneNumber: '' });
      return;
    }

    if (!email.trim()) {
      setStudentCoordinatorData({ name: '', department: '', phoneNumber: '' });
      return;
    }

    setStudentCoordinatorLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/coordinators/member-by-email?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();

      if (data.found) {
        setStudentCoordinatorData({
          name: data.name || '',
          department: data.department || '',
          phoneNumber: data.contact_no || ''
        });
        setStudentEmailError('');
      } else {
        setStudentCoordinatorData({ name: '', department: '', phoneNumber: '' });
        setStudentEmailError('Email not found in member database. Please enter a valid registered email.');
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      setStudentCoordinatorData({ name: '', department: '', phoneNumber: '' });
      setStudentEmailError('Error fetching student details. Please try again.');
    } finally {
      setStudentCoordinatorLoading(false);
    }
  };

  // Handle adding student coordinator
  const handleAddStudentCoordinator = async () => {
    // Clear previous errors
    setStudentEmailError('');

    // Validate email
    if (!studentEmail.trim()) {
      setStudentEmailError('Email is required.');
      document.querySelector('input[placeholder="Enter student email to fetch details"]').focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail.trim())) {
      setStudentEmailError('Please enter a valid email address.');
      document.querySelector('input[placeholder="Enter student email to fetch details"]').focus();
      return;
    }

    // Check if student data was successfully fetched
    if (!studentCoordinatorData.name || !studentCoordinatorData.department) {
      setStudentEmailError('Please enter a valid registered email to fetch student details.');
      document.querySelector('input[placeholder="Enter student email to fetch details"]').focus();
      return;
    }

    // Check for duplicates
    const existingCoordinator = coordinators.find(coord =>
      coord.email.toLowerCase() === studentEmail.trim().toLowerCase() && coord.role === 'student'
    );
    if (existingCoordinator) {
      setStudentEmailError('This student is already registered as a coordinator.');
      document.querySelector('input[placeholder="Enter student email to fetch details"]').focus();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/coordinators/add`, {
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
        setStudentCoordinatorData({ name: '', department: '', phoneNumber: '' });
        setStudentEmailError('');
        setShowAddStudentForm(false);
        // Refresh coordinators list
        fetchCoordinators();
      } else {
        setStudentEmailError(result.message || 'Failed to add student coordinator.');
        document.querySelector('input[placeholder="Enter student email to fetch details"]').focus();
      }
    } catch (error) {
      console.error('Error adding student coordinator:', error);
      setStudentEmailError('An error occurred while adding the student coordinator.');
      document.querySelector('input[placeholder="Enter student email to fetch details"]').focus();
    }
  };

  // Handle admin email change with validation and auto-fetch
  const handleAdminEmailChange = async (email) => {
    setAdminEmail(email);
    setAdminEmailError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setAdminEmailError('Please enter a valid email address.');
      setAdminCoordinatorData({ name: '', department: '', phoneNumber: '' });
      return;
    }

    if (!email.trim()) {
      setAdminCoordinatorData({ name: '', department: '', phoneNumber: '' });
      return;
    }

    setAdminCoordinatorLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/coordinators/member-by-email?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();

      if (data.found) {
        setAdminCoordinatorData({
          name: data.name || '',
          department: data.department || '',
          phoneNumber: data.contact_no || ''
        });
        setAdminEmailError('');
      } else {
        setAdminCoordinatorData({ name: '', department: '', phoneNumber: '' });
        setAdminEmailError('Email not found in member database. Please enter a valid registered email.');
      }
    } catch (error) {
      console.error('Error fetching admin details:', error);
      setAdminCoordinatorData({ name: '', department: '', phoneNumber: '' });
      setAdminEmailError('Error fetching admin details. Please try again.');
    } finally {
      setAdminCoordinatorLoading(false);
    }
  };

  // Handle adding admin coordinator
  const handleAddAdminCoordinator = async () => {
    setAdminEmailError('');

    if (!adminEmail.trim()) {
      setAdminEmailError('Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail.trim())) {
      setAdminEmailError('Please enter a valid email address.');
      return;
    }

    if (!adminCoordinatorData.name) {
      setAdminEmailError('Please enter a valid registered email to fetch admin details.');
      return;
    }

    const existingCoordinator = coordinators.find(coord =>
      coord.email.toLowerCase() === adminEmail.trim().toLowerCase() && coord.role === 'admin'
    );
    if (existingCoordinator) {
      setAdminEmailError('This admin is already registered.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/coordinators/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: adminEmail.trim(), role: 'admin' }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Admin added successfully!');
        setAdminEmail('');
        setAdminCoordinatorData({ name: '', department: '', phoneNumber: '' });
        setAdminEmailError('');
        setShowAddAdminForm(false);
        fetchCoordinators();
      } else {
        setAdminEmailError(result.message || 'Failed to add admin.');
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      setAdminEmailError('An error occurred while adding the admin.');
    }
  };

  // Handle email change for department coordinator auto-fetch
  const handleDeptCoordinatorEmailChange = async (email) => {
    setDeptCoordinator({ ...deptCoordinator, email });
    setDeptCoordinatorErrors({ ...deptCoordinatorErrors, email: '' });

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setDeptCoordinatorErrors({ ...deptCoordinatorErrors, email: 'Please enter a valid email address.' });
      setDeptCoordinator({
        name: '',
        email: email.trim(),
        department: '',
        phoneNumber: ''
      });
      return;
    }

    if (!email.trim()) {
      setDeptCoordinator({
        name: '',
        email: '',
        department: '',
        phoneNumber: ''
      });
      return;
    }

    setDeptCoordinatorLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/coordinators/member-by-email?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();

      if (data.found) {
        setDeptCoordinator({
          name: data.name || '',
          email: email.trim(),
          department: data.department || '',
          phoneNumber: data.contact_no || ''
        });
        setDeptCoordinatorErrors({ ...deptCoordinatorErrors, email: '' });
      } else {
        // Clear other fields if member not found
        setDeptCoordinator({
          name: '',
          email: email.trim(),
          department: '',
          phoneNumber: ''
        });
        setDeptCoordinatorErrors({ ...deptCoordinatorErrors, email: 'Email not found in member database. Please enter a valid registered email.' });
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
      setDeptCoordinatorErrors({ ...deptCoordinatorErrors, email: 'Error fetching member details. Please try again.' });
    } finally {
      setDeptCoordinatorLoading(false);
    }
  };

  // Handle adding department coordinator
  const handleAddDepartmentCoordinator = async () => {
    // Clear previous errors
    setDeptCoordinatorErrors({ name: '', email: '', department: '', phoneNumber: '' });

    // Validate fields
    const newErrors = {};
    if (!deptCoordinator.name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!deptCoordinator.email.trim()) {
      newErrors.email = 'Email is required.';
    }
    if (!deptCoordinator.department.trim()) {
      newErrors.department = 'Department is required.';
    }
    if (!deptCoordinator.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone Number is required.';
    }

    // Set errors if any
    if (Object.keys(newErrors).length > 0) {
      setDeptCoordinatorErrors(newErrors);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/coordinators/add`, {
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
        setDeptCoordinatorErrors({ name: '', email: '', department: '', phoneNumber: '' });
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
      const response = await fetch(`${API_BASE_URL}/api/coordinators`);
      const data = await response.json();
      setCoordinators(data);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
    } finally {
      setCoordinatorsLoading(false);
    }
  };

  // Handle deleting coordinator
  const handleDeleteCoordinator = async (coordinatorId, coordinatorName) => {
    if (!window.confirm(`Are you sure you want to delete coordinator "${coordinatorName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/coordinators/${coordinatorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Coordinator deleted successfully!');
        // Refresh coordinators list
        fetchCoordinators();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to delete coordinator.');
      }
    } catch (error) {
      console.error('Error deleting coordinator:', error);
      alert('An error occurred while deleting the coordinator.');
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

  const exportFilteredSpeakerDetails = () => {
    const exportData = filteredWebinars.map((webinar, index) => ({
      'Serial Number': index + 1,
      'Phase ID': webinar.phaseId || 'N/A',
      'Domain': webinar.domain || 'N/A',
      'Webinar Topic': webinar.topic || 'N/A',
      'Speaker Name': webinar.speaker?.name || 'N/A',
      'Speaker Email': webinar.speaker?.email || 'N/A',
      'Speaker Phone': webinar.speaker?.phoneNumber || 'N/A',
      'Speaker Batch': webinar.speaker?.batch || 'N/A',
      'Speaker Department': webinar.speaker?.department || 'N/A',
      'Designation & Company': webinar.speaker?.designation ? `${webinar.speaker.designation} & ${webinar.speaker.companyName || 'N/A'}` : 'N/A',
      'City': webinar.alumniCity || 'N/A'
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Speaker Details');
    const fileName = `webinar_speaker_details_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const filteredSpeakers = speakers.filter(speaker =>
    speaker.name?.toLowerCase().includes(speakerSearchTerm.toLowerCase())
  );

  const [completedDocsRows, setCompletedDocsRows] = useState([]);
  const [completedDocsLoading, setCompletedDocsLoading] = useState(false);

  // Webinar Docs filters + export (like prize winners page)
  const [webinarDocsFilters, setWebinarDocsFilters] = useState({
    phaseId: '',
    department: '',
    month: '',
    topic: '',
  });

  const getMonthKeyFromRow = (row) => {
    if (!row?.webinarDate) return '';
    const date = new Date(row.webinarDate);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const webinarDocsPhaseOptions = Array.from(
    new Set(completedDocsRows.map((r) => r.phaseId).filter(Boolean))
  ).sort((a, b) => Number(a) - Number(b));

  const webinarDocsDepartmentOptions = Array.from(
    new Set(completedDocsRows.map((r) => r.department).filter(Boolean))
  ).sort();

  const webinarDocsMonthOptions = Array.from(
    new Set(completedDocsRows.map((r) => getMonthKeyFromRow(r)).filter(Boolean))
  )
    .sort()
    .map((value) => ({ value, label: getMonthLabel(value) }));

  const webinarDocsTopicOptions = Array.from(
    new Set(completedDocsRows.map((r) => r.topic || r.webinarTopic).filter(Boolean))
  ).sort();

  const filteredCompletedDocsRows = completedDocsRows.filter((row) => {
    const phaseId = String(row.phaseId ?? '');
    const department = row.department ?? '';
    const month = getMonthKeyFromRow(row);
    const topic = (row.topic ?? row.webinarTopic ?? '').toString();

    return (
      (!webinarDocsFilters.phaseId || phaseId === String(webinarDocsFilters.phaseId)) &&
      (!webinarDocsFilters.department || department === webinarDocsFilters.department) &&
      (!webinarDocsFilters.month || month === webinarDocsFilters.month) &&
      (!webinarDocsFilters.topic || topic === webinarDocsFilters.topic)
    );
  });

  const exportFilteredWebinarDocs = () => {
    if (!filteredCompletedDocsRows.length) {
      alert('No completed webinar documents available to export.');
      return;
    }

    const exportData = filteredCompletedDocsRows.map((row, idx) => {
      const registeredCount = row.registeredCount ?? row.reg_count ?? 'N/A';
      const attendedCount = row.attendedCount ?? row.attended ?? 'N/A';
      const docsAvailable = row.hasDocuments ?? row.documentsAvailable ?? false;

      return {
        'Serial Number': idx + 1,
        'Phase ID': row.phaseId ?? 'N/A',
        'Department': row.department ?? 'N/A',
        'Webinar Topic': row.topic ?? row.webinarTopic ?? 'N/A',
        'Webinar Date': row.webinarDate ? new Date(row.webinarDate).toLocaleDateString() : 'N/A',
        'Registered Count': registeredCount,
        'Attended Count': attendedCount,
        'Documents Available': docsAvailable ? 'Yes' : 'No',
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Completed Webinar Docs');

    const fileName = `webinar_completed_documents_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // -------------------------
  // Prize Winners helpers
  // -------------------------
  const getPrizeWinnerMonthKey = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const prizeWinnerDomainOptions = Array.from(
    new Set((prizeWinners || []).map((w) => w.domain).filter(Boolean))
  ).sort();

  const prizeWinnerMonthOptions = Array.from(
    new Set((prizeWinners || []).map((w) => getPrizeWinnerMonthKey(w.webinarDate)).filter(Boolean))
  )
    .sort()
    .map((value) => ({ value, label: getMonthLabel(value) }));

  const filteredPrizeWinners = (prizeWinners || []).filter((w) => {
    const phaseId = String(w.phaseId ?? '');
    const domain = w.domain ?? '';
    const month = getPrizeWinnerMonthKey(w.webinarDate);

    return (
      (!selectedFilters.phaseId || phaseId === String(selectedFilters.phaseId)) &&
      (!selectedFilters.domain || domain === selectedFilters.domain) &&
      (!selectedFilters.month || month === selectedFilters.month)
    );
  });

  const exportFilteredPrizeWinners = () => {
    if (!filteredPrizeWinners.length) {
      alert('No prize winners available to export for the selected filters.');
      return;
    }

    const exportData = filteredPrizeWinners.map((w, idx) => ({
      'Serial Number': idx + 1,
      'Phase': w.phaseId ?? 'N/A',
      'Webinar Domain': w.domain ?? 'N/A',
      'Webinar Topic': w.topic ?? 'N/A',
      'Webinar Date': w.webinarDate ? new Date(w.webinarDate).toLocaleDateString() : 'N/A',
      'Prize Winner Name': w.prizeWinnerName ?? 'N/A',
      'Prize Winner Email': w.prizeWinnerEmail ?? 'N/A',
      'Prize Winner Mobile': w.prizeWinnerMobile ?? 'N/A',
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Prize Winners');

    const fileName = `prize_winners_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  useEffect(() => {
    if (activeView !== 'webinarDocs') return;

    const fetchRows = async () => {
      try {
        setCompletedDocsLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/admin/webinars/completed-documents`);
        const json = await res.json();
        setCompletedDocsRows(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        console.error('Error fetching completed documents table:', e);
        setCompletedDocsRows([]);
      } finally {
        setCompletedDocsLoading(false);
      }
    };

    fetchRows();
  }, [activeView]);

const renderContent = () => {
  switch (activeView) {
    case 'webinarDocs':
      return (
        <div className="form-card filter-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: '1 1 auto', minWidth: '220px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Webinar Details Active Page</h2>
            </div>

            <button
              type="button"
              className="submit1-btn"
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              onClick={exportFilteredWebinarDocs}
            >
              Export Completed Docs
            </button>
          </div>

          <div className="filters webinar-filters">
            <select
              className="input-field"
              value={webinarDocsFilters.phaseId}
              onChange={(e) => setWebinarDocsFilters({ ...webinarDocsFilters, phaseId: e.target.value })}
            >
              <option value="">All Phases</option>
              {webinarDocsPhaseOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              className="input-field"
              value={webinarDocsFilters.department}
              onChange={(e) => setWebinarDocsFilters({ ...webinarDocsFilters, department: e.target.value })}
            >
              <option value="">All Departments</option>
              {webinarDocsDepartmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              className="input-field"
              value={webinarDocsFilters.month}
              onChange={(e) => setWebinarDocsFilters({ ...webinarDocsFilters, month: e.target.value })}
            >
              <option value="">All Months</option>
              {webinarDocsMonthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <select
              className="input-field"
              value={webinarDocsFilters.topic}
              onChange={(e) => setWebinarDocsFilters({ ...webinarDocsFilters, topic: e.target.value })}
            >
              <option value="">All Topics</option>
              {webinarDocsTopicOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="table-scroll-wrap webinar-table-desktop" style={{ overflowX: 'auto', width: '100%', marginTop: '1rem' }}>
            <table className="admin-data-table webinar-table" style={{ minWidth: '1100px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: '#eee' }}>
                  <th style={{ minWidth: '90px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Phase ID</th>
                  <th style={{ minWidth: '170px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Department</th>
                  <th style={{ minWidth: '250px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Webinar Topic</th>
                  <th style={{ minWidth: '160px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Webinar Date</th>
                  <th style={{ minWidth: '130px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Registered Count</th>
                  <th style={{ minWidth: '110px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Attended Count</th>
                  <th style={{ minWidth: '160px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Documents</th>
                </tr>
              </thead>
              <tbody>
                {completedDocsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Loading completed docs...</td>
                  </tr>
                ) : filteredCompletedDocsRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No completed webinar documents found for the selected filters.</td>
                  </tr>
                ) : (
                  filteredCompletedDocsRows.map((row, idx) => {
                    const webinarId = row.webinarId;
                    const registeredCount = row.registeredCount ?? row.reg_count ?? 'N/A';
                    const attendedCount = row.attendedCount ?? row.attended ?? 'N/A';
                    const docsAvailable = row.hasDocuments ?? row.documentsAvailable ?? false;

                    return (
                      <tr key={webinarId || idx}>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{row.phaseId ?? 'N/A'}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{row.department ?? 'N/A'}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{row.topic ?? row.webinarTopic ?? 'N/A'}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{row.webinarDate ? new Date(row.webinarDate).toLocaleDateString() : 'N/A'}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{registeredCount}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{attendedCount}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                          {docsAvailable ? (
                            <a
                              href={`${API_BASE_URL}/api/admin/webinars/${webinarId}/completed-documents/download`}
                              style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}
                            >
                              Download
                            </a>
                          ) : (
                            'Not Available'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      );


    case 'phase':
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
                min="1"
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
              />
              {errors.phaseId && (
                <div className="error-text">{errors.phaseId}</div>
              )}
            </div>

            <div className="form-group">
              <label>Starting Date</label>
              <input
                type="date"
                className="input-field"
                value={startingDate}
                onChange={(e) => setStartingDate(e.target.value)}
              />
              {errors.startingDate && (
                <div className="error-text">{errors.startingDate}</div>
              )}
            </div>

            <div className="form-group">
              <label>Ending Date</label>
              <input
                type="date"
                className="input-field"
                value={endingDate}
                onChange={(e) => setEndingDate(e.target.value)}
              />
              {errors.endingDate && (
                <div className="error-text">{errors.endingDate}</div>
              )}
            </div>
            <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: "bold" , fontSize: '20px', margin: 0 }}>Domain Details</h2>
              {lastPhaseDomains.length > 0 && (
                <button
                  className="submit1-btn"
                  onClick={() => {
                    if (window.confirm('This will replace current domain details with last phase domains. Continue?')) {
                      setDomains(lastPhaseDomains.map(d => ({ department: d.department, domain: d.domain })));
                    }
                  }}
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  Auto-fill from Last Phase
                </button>
              )}
            </div>
            {domains.map((domain, index) => (
                <div key={index} className="domain-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
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
                        <option value="AI & DS">AI & DS</option>
                      </select>
                    </div>

                  <div className="form-group" style={{ flex: '2 1 0%' }}>
                    <label>Domain </label>
                    <input
                      type="text"
                      placeholder="Domain"
                      className="input-field"
                      maxLength={50}
                      value={domain.domain}
                      onChange={(e) => {
                        const newDomains = [...domains];
                        newDomains[index].domain = e.target.value;
                        setDomains(newDomains);
                      }}
                      onKeyDown={(e) => {
                        if ( e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const paste = e.clipboardData.getData('text');
                        const newDomains = [...domains];
                        newDomains[index].domain = paste;
                        setDomains(newDomains);
                      }}
                      onBlur={(e) => {
                        const newDomains = [...domains];
                        newDomains[index].domain = e.target.value.trim();
                        setDomains(newDomains);
                      }}
                    />
                    {errors[`domain_${index}`] && (
                      <div className="error-text">{errors[`domain_${index}`]}</div>
                    )}
                  </div>
                  <div className="domain-row-action" style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem' }}>
                    <button
                      className="submit1-btn"
                      onClick={() => {
                        if (domains.length > 1) {
                          const newDomains = domains.filter((_, i) => i !== index);
                          setDomains(newDomains);
                        }
                      }}
                      disabled={domains.length <= 1}
                      style={{
                        fontSize: '16px',
                        padding: '6px 12px',
                        minWidth: '40px',
                        backgroundColor: domains.length <= 1 ? '#ccc' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: domains.length <= 1 ? 'not-allowed' : 'pointer'
                      }}
                      title="Remove this domain"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: '1 1 auto', minWidth: '220px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Webinar Speaker Listings</h2>
              </div>
              <button
                type="button"
                onClick={exportFilteredSpeakerDetails}
                className="submit1-btn"
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Export Speaker Details
              </button>
            </div>

            <div className="filters webinar-filters">
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
        <div className="table-scroll-wrap webinar-table-desktop" style={{ overflowX: 'auto', width: '100%', marginTop: '1rem' }}>
              <table className="admin-data-table webinar-table" style={{ minWidth: "1200px", borderCollapse: "collapse", tableLayout: "fixed" }}>
    <thead>
      <tr style={{ backgroundColor: "#eee", paddingTop: "15px", paddingBottom: "15px" }}>
        <th style={{ minWidth: "100px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Phase ID</th>
        <th style={{ minWidth: "150px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Domain</th>
        <th style={{ minWidth: "200px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Webinar Topic</th>
        <th style={{ minWidth: "150px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Name</th>
        <th style={{ minWidth: "400px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Email</th>
        <th style={{ minWidth: "120px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Phone Number</th>
        <th style={{ minWidth: "150px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Batch & Dept</th>
        <th style={{ minWidth: "180px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Speaker Designation & Company</th>
        <th style={{ minWidth: "100px", padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>City</th>
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
            <td className="email-scroll-cell" style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center", overflowX: "auto", whiteSpace: "nowrap" }}>{webinar.speaker?.email || 'N/A'}</td>
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

        <div className="webinar-mobile-cards">
          {webinarsLoading ? (
            <div className="webinar-mobile-empty">Loading webinars...</div>
          ) : filteredWebinars.length === 0 ? (
            <div className="webinar-mobile-empty">No webinars found</div>
          ) : (
            filteredWebinars.map((webinar, index) => (
              <div key={index} className="webinar-mobile-card">
                <div><strong>Phase ID:</strong> {webinar.phaseId || 'N/A'}</div>
                <div><strong>Domain:</strong> {webinar.domain || 'N/A'}</div>
                <div><strong>Topic:</strong> {webinar.topic || 'N/A'}</div>
                <div><strong>Speaker:</strong> {webinar.speaker?.name || 'N/A'}</div>
                <div className="mobile-email"><strong>Email:</strong> {webinar.speaker?.email || 'N/A'}</div>
                <div><strong>Phone:</strong> {webinar.speaker?.phoneNumber || 'N/A'}</div>
                <div><strong>Batch & Dept:</strong> {webinar.speaker?.batch ? `${webinar.speaker.batch} & ${webinar.speaker.department || 'N/A'}` : 'N/A'}</div>
                <div><strong>Designation & Company:</strong> {webinar.speaker?.designation ? `${webinar.speaker.designation} & ${webinar.speaker.companyName || 'N/A'}` : 'N/A'}</div>
                <div><strong>City:</strong> {webinar.alumniCity || 'N/A'}</div>
              </div>
            ))
          )}
        </div>
          </div>
        );
      case 'coordiators':
        return (
          <div className="form-card">
            <h2 className="form-title" style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>Coordinators Management</h2>
            <div className="admin-buttons coord-switch-buttons" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button className={`submit1-btn ${activeCoordinatorView === 'student' ? 'active' : ''}`} onClick={() => { setActiveCoordinatorView('student'); setShowAddDepartmentForm(false); setShowAddStudentForm(false); setShowAddAdminForm(false); }}>Student Coordinators</button>
                <button className={`submit1-btn ${activeCoordinatorView === 'department' ? 'active' : ''}`} onClick={() => { setActiveCoordinatorView('department'); setShowAddStudentForm(false); setShowAddDepartmentForm(false); setShowAddAdminForm(false); }}>Department Coordinators</button>
                <button className={`submit1-btn ${activeCoordinatorView === 'admin' ? 'active' : ''}`} onClick={() => { setActiveCoordinatorView('admin'); setShowAddStudentForm(false); setShowAddDepartmentForm(false); setShowAddAdminForm(false); }}>Admin Management</button>
            </div>
            {activeCoordinatorView === 'student' && (
                <div>
                    <div className="coordinator-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className="coordinator-title" style={{fontWeight: "bold" , fontSize: '30px' ,margin: 0}}>Student Coordinators</h3>
                        <button className="submit2-btn" onClick={() => setShowAddStudentForm(!showAddStudentForm)}>Add Coordinator</button>
                    </div>

                    {showAddStudentForm && (
                        <div className="form-fields" style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '8px' }}>
                            <div className="form-group">
                                <label>Student Email</label>
                                <input
                                    type="email"
                                    placeholder="Enter student email to fetch details"
                                    className={`input-field ${studentEmailError ? 'error' : ''}`}
                                    value={studentEmail}
                                    onChange={(e) => handleStudentEmailChange(e.target.value)}
                                    disabled={studentCoordinatorLoading}
                                />
                                {studentEmailError && (
                                    <div className="error-text">{studentEmailError}</div>
                                )}
                                {studentCoordinatorLoading && (
                                    <span style={{ marginLeft: '10px', color: '#666' }}>Fetching student details...</span>
                                )}
                            </div>

                            {studentCoordinatorData.name && (
                                <div className="form-group">
                                    <label>Student Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={studentCoordinatorData.name}
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            {studentCoordinatorData.department && (
                                <div className="form-group">
                                    <label>Department</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={studentCoordinatorData.department}
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            {studentCoordinatorData.phoneNumber && (
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={studentCoordinatorData.phoneNumber}
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            <button
                                className="submit-btn"
                                onClick={handleAddStudentCoordinator}
                                disabled={studentCoordinatorLoading || !!studentEmailError || !studentCoordinatorData.name}
                            >
                                Add
                            </button>
                        </div>
                    )}

                    <div className="table-scroll-wrap coordinator-table-desktop">
                    <table className="admin-data-table coordinator-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#eee' }}>
                                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Student Name</th>
                                <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>Email</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Department</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Phone Number</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coordinatorsLoading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                        Loading coordinators...
                                    </td>
                                </tr>
                            ) : coordinators.filter(coord => coord.role === 'student').length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
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
                                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                                            <button
                                                className="coordinator-delete-btn"
                                                onClick={() => handleDeleteCoordinator(coord._id, coord.name)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>

                    <div className="coordinator-mobile-cards">
                      {coordinatorsLoading ? (
                        <div className="coordinator-mobile-empty">Loading coordinators...</div>
                      ) : coordinators.filter(coord => coord.role === 'student').length === 0 ? (
                        <div className="coordinator-mobile-empty">No student coordinators found</div>
                      ) : (
                        coordinators.filter(coord => coord.role === 'student').map((coord, index) => (
                          <div key={index} className="coordinator-mobile-card">
                            <div><strong>Student Name:</strong> {coord.name || 'N/A'}</div>
                            <div><strong>Email:</strong> {coord.email || 'N/A'}</div>
                            <div><strong>Department:</strong> {coord.department || 'N/A'}</div>
                            <div><strong>Phone Number:</strong> {coord.phoneNumber || 'N/A'}</div>
                            <button
                              className="coordinator-delete-btn"
                              onClick={() => handleDeleteCoordinator(coord._id, coord.name)}
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                </div>
            )}

            {activeCoordinatorView === 'department' && (
                <div>
                    <div className="coordinator-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className="coordinator-title" style={{fontWeight: "bold" , fontSize: '30px' ,margin: 0}}>Department Coordinators</h3>
                        <button className="submit2-btn" onClick={() => setShowAddDepartmentForm(!showAddDepartmentForm)}>Add Coordinator</button>
                    </div>

                    {showAddDepartmentForm && (
                        <div className="form-fields" style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '8px' }}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    placeholder="Name"
                                    className={`input-field ${deptCoordinatorErrors.name ? 'error' : ''}`}
                                    value={deptCoordinator.name}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^A-Za-z]/g, '');
                                        setDeptCoordinator({ ...deptCoordinator, name: value });
                                        if (e.target.value !== value) {
                                            setDeptCoordinatorErrors({ ...deptCoordinatorErrors, name: 'Only English letters are allowed.' });
                                        } else {
                                            setDeptCoordinatorErrors({ ...deptCoordinatorErrors, name: '' });
                                        }
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); } }}
                                    onPaste={(e) => { e.preventDefault(); const paste = e.clipboardData.getData('text').replace(/[^A-Za-z]/g, ''); setDeptCoordinator({ ...deptCoordinator, name: paste }); setDeptCoordinatorErrors({ ...deptCoordinatorErrors, name: '' }); }}
                                    onBlur={(e) => setDeptCoordinator({ ...deptCoordinator, name: e.target.value.trim() })}
                                />
                                {deptCoordinatorErrors.name && (
                                    <div className="error-text">{deptCoordinatorErrors.name}</div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="Enter email to auto-fetch details"
                                    className={`input-field ${deptCoordinatorErrors.email ? 'error' : ''}`}
                                    value={deptCoordinator.email}
                                    onChange={(e) => handleDeptCoordinatorEmailChange(e.target.value.replace(/[^A-Za-z0-9@._+\-]/g, ''))}
                                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); }}
                                    onPaste={(e) => { e.preventDefault(); const paste = e.clipboardData.getData('text').replace(/[^A-Za-z0-9@._+\-]/g, ''); handleDeptCoordinatorEmailChange(paste); }}
                                    onBlur={(e) => setDeptCoordinator({ ...deptCoordinator, email: e.target.value.trim() })}
                                    disabled={deptCoordinatorLoading}
                                />
                                {deptCoordinatorErrors.email && (
                                    <div className="error-text">{deptCoordinatorErrors.email}</div>
                                )}
                                {deptCoordinatorLoading && <span style={{ marginLeft: '10px', color: '#666' }}>Fetching details...</span>}
                            </div>
                            <div className="form-group">
                                <label>Department</label>
                                <input
                                    type="text"
                                    placeholder="Department"
                                    className={`input-field ${deptCoordinatorErrors.department ? 'error' : ''}`}
                                    value={deptCoordinator.department}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^A-Za-z]/g, '');
                                        setDeptCoordinator({ ...deptCoordinator, department: value });
                                        if (e.target.value !== value) {
                                            setDeptCoordinatorErrors({ ...deptCoordinatorErrors, department: 'Only English letters are allowed.' });
                                        } else {
                                            setDeptCoordinatorErrors({ ...deptCoordinatorErrors, department: '' });
                                        }
                                    }}
                                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); }}
                                    onPaste={(e) => { e.preventDefault(); const paste = e.clipboardData.getData('text').replace(/[^A-Za-z]/g, ''); setDeptCoordinator({ ...deptCoordinator, department: paste }); setDeptCoordinatorErrors({ ...deptCoordinatorErrors, department: '' }); }}
                                    onBlur={(e) => setDeptCoordinator({ ...deptCoordinator, department: e.target.value.trim() })}
                                />
                                {deptCoordinatorErrors.department && (
                                    <div className="error-text">{deptCoordinatorErrors.department}</div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="Phone Number"
                                    className={`input-field ${deptCoordinatorErrors.phoneNumber ? 'error' : ''}`}
                                    value={deptCoordinator.phoneNumber}
                                    onChange={(e) => setDeptCoordinator({ ...deptCoordinator, phoneNumber: e.target.value.replace(/[^0-9]/g, '') })}
                                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); }}
                                    onPaste={(e) => { e.preventDefault(); const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, ''); setDeptCoordinator({ ...deptCoordinator, phoneNumber: paste }); }}
                                    onBlur={(e) => setDeptCoordinator({ ...deptCoordinator, phoneNumber: e.target.value.trim() })}
                                />
                                {deptCoordinatorErrors.phoneNumber && (
                                    <div className="error-text">{deptCoordinatorErrors.phoneNumber}</div>
                                )}
                            </div>
                            <button className="submit-btn" onClick={handleAddDepartmentCoordinator}>Add</button>
                        </div>
                    )}

                    <div className="table-scroll-wrap coordinator-table-desktop">
                    <table className="admin-data-table coordinator-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#eee' }}>
                                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Faculty Name</th>
                                <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>Email</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Department</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Phone Number</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coordinatorsLoading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                        Loading coordinators...
                                    </td>
                                </tr>
                            ) : coordinators.filter(coord => coord.role === 'department').length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
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
                                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                                            <button
                                                className="coordinator-delete-btn"
                                                onClick={() => handleDeleteCoordinator(coord._id, coord.name)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>

                    <div className="coordinator-mobile-cards">
                      {coordinatorsLoading ? (
                        <div className="coordinator-mobile-empty">Loading coordinators...</div>
                      ) : coordinators.filter(coord => coord.role === 'department').length === 0 ? (
                        <div className="coordinator-mobile-empty">No department coordinators found</div>
                      ) : (
                        coordinators.filter(coord => coord.role === 'department').map((coord, index) => (
                          <div key={index} className="coordinator-mobile-card">
                            <div><strong>Faculty Name:</strong> {coord.name || 'N/A'}</div>
                            <div><strong>Email:</strong> {coord.email || 'N/A'}</div>
                            <div><strong>Department:</strong> {coord.department || 'N/A'}</div>
                            <div><strong>Phone Number:</strong> {coord.phoneNumber || 'N/A'}</div>
                            <button
                              className="coordinator-delete-btn"
                              onClick={() => handleDeleteCoordinator(coord._id, coord.name)}
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                </div>
            )}

            {activeCoordinatorView === 'admin' && (
                <div>
                    <div className="coordinator-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className="coordinator-title" style={{fontWeight: "bold" , fontSize: '30px' ,margin: 0}}>Admin Users</h3>
                        <button className="submit2-btn" onClick={() => setShowAddAdminForm(!showAddAdminForm)}>Add Admin</button>
                    </div>

                    {showAddAdminForm && (
                        <div className="form-fields" style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '8px' }}>
                            <div className="form-group">
                                <label>Admin Email</label>
                                <input
                                    type="email"
                                    placeholder="Enter admin email to fetch details"
                                    className={`input-field ${adminEmailError ? 'error' : ''}`}
                                    value={adminEmail}
                                    onChange={(e) => handleAdminEmailChange(e.target.value)}
                                    disabled={adminCoordinatorLoading}
                                />
                                {adminEmailError && (
                                    <div className="error-text">{adminEmailError}</div>
                                )}
                                {adminCoordinatorLoading && (
                                    <span style={{ marginLeft: '10px', color: '#666' }}>Fetching admin details...</span>
                                )}
                            </div>

                            {adminCoordinatorData.name && (
                                <div className="form-group">
                                    <label>Admin Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={adminCoordinatorData.name}
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            {adminCoordinatorData.department && (
                                <div className="form-group">
                                    <label>Department</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={adminCoordinatorData.department}
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            {adminCoordinatorData.phoneNumber && (
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={adminCoordinatorData.phoneNumber}
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                </div>
                            )}

                            <button
                                className="submit-btn"
                                onClick={handleAddAdminCoordinator}
                                disabled={adminCoordinatorLoading || !!adminEmailError || !adminCoordinatorData.name}
                            >
                                Add
                            </button>
                        </div>
                    )}

                    <div className="table-scroll-wrap coordinator-table-desktop">
                      <table className="admin-data-table coordinator-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                          <thead>
                              <tr style={{ backgroundColor: '#eee' }}>
                                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Admin Name</th>
                                  <th style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>Email</th>
                                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Department</th>
                                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Phone Number</th>
                                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {coordinatorsLoading ? (
                                  <tr>
                                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                          Loading admins...
                                      </td>
                                  </tr>
                              ) : coordinators.filter(coord => coord.role === 'admin').length === 0 ? (
                                  <tr>
                                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                          No admins found
                                      </td>
                                  </tr>
                              ) : (
                                  coordinators.filter(coord => coord.role === 'admin').map((coord, index) => (
                                      <tr key={index}>
                                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.name || 'N/A'}</td>
                                          <td style={{ padding: '15px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.email || 'N/A'}</td>
                                          <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.department || 'N/A'}</td>
                                          <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{coord.phoneNumber || 'N/A'}</td>
                                          <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                                              <button
                                                  className="coordinator-delete-btn"
                                                  onClick={() => handleDeleteCoordinator(coord._id, coord.name)}
                                              >
                                                  Delete
                                              </button>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                    </div>

                    <div className="coordinator-mobile-cards">
                      {coordinatorsLoading ? (
                        <div className="coordinator-mobile-empty">Loading admins...</div>
                      ) : coordinators.filter(coord => coord.role === 'admin').length === 0 ? (
                        <div className="coordinator-mobile-empty">No admins found</div>
                      ) : (
                        coordinators.filter(coord => coord.role === 'admin').map((coord, index) => (
                          <div key={index} className="coordinator-mobile-card">
                            <div><strong>Admin Name:</strong> {coord.name || 'N/A'}</div>
                            <div><strong>Email:</strong> {coord.email || 'N/A'}</div>
                            <div><strong>Department:</strong> {coord.department || 'N/A'}</div>
                            <div><strong>Phone Number:</strong> {coord.phoneNumber || 'N/A'}</div>
                            <button
                              className="coordinator-delete-btn"
                              onClick={() => handleDeleteCoordinator(coord._id, coord.name)}
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                </div>
            )}
          </div>
        );
    case 'prizeWinners':
      return (
        <div className="form-card filter-card admin-prize-winners">
          <div className="mobile-compact-filters">
            <button
              type="button"
              className="mobile-export-btn"
              onClick={exportFilteredPrizeWinners}
            >
              Export
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: '1 1 auto', minWidth: '220px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Prize Winners Details</h2>
            </div>
            <button
              type="button"
              className="submit1-btn desktop-export-btn"
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              onClick={exportFilteredPrizeWinners}
            >
              Export Prize Winners
            </button>
          </div>

          <div className="filters webinar-filters">
            <select
              className="input-field"
              value={selectedFilters.phaseId}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, phaseId: e.target.value, domain: '', month: '' })}
            >
              <option value="">All Phases</option>
              {filterOptions.phases?.map((phase) => (
                <option key={phase.id} value={phase.id}>{phase.name}</option>
              ))}
            </select>

            <select
              className="input-field"
              value={selectedFilters.domain}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, domain: e.target.value })}
            >
              <option value="">All Domains</option>
              {prizeWinnerDomainOptions.map((domain) => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>

            <select
              className="input-field"
              value={selectedFilters.month}
              onChange={(e) => setSelectedFilters({ ...selectedFilters, month: e.target.value })}
            >
              <option value="">All Months</option>
              {prizeWinnerMonthOptions.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <div className="table-scroll-wrap webinar-table-desktop" style={{ overflowX: 'auto', width: '100%', marginTop: '1rem' }}>
            <table className="admin-data-table webinar-table" style={{ minWidth: '1100px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: '#eee' }}>
                  <th style={{ minWidth: '100px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Phase</th>
                  <th style={{ minWidth: '180px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Webinar Domain</th>
                  <th style={{ minWidth: '220px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Webinar Topic</th>
                  <th style={{ minWidth: '160px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Webinar Date</th>
                  <th style={{ minWidth: '200px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Prize Winner Name</th>
                  <th style={{ minWidth: '250px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Prize Winner Email</th>
                  <th style={{ minWidth: '160px', padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Prize Winner Mobile</th>
                </tr>
              </thead>
              <tbody>
                {prizeWinnersLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Loading prize winners...</td>
                  </tr>
                ) : filteredPrizeWinners.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No prize winners found.</td>
                  </tr>
                ) : (
                  filteredPrizeWinners.map((w, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{w.phaseId ?? 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{w.domain ?? 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{w.topic ?? 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{w.webinarDate ? new Date(w.webinarDate).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{w.prizeWinnerName ?? 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{w.prizeWinnerEmail ?? 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{w.prizeWinnerMobile ?? 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    default:
      return null;
  }
};

return (
    <div className="student-form-page admin-page-scroll">
      <div className="background-orbs">
        <div className="orb orb-purple"></div>
        <div className="orb orb-blue"></div>
        <div className="orb orb-pink"></div>
      </div>
      <div className="form-wrapper">

        <div>
          <div className="form-header">
                      {/* Mobile header: hamburger + sidebar */}
          <div className="mobile-top-menu">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
         
            <h1 className="text-2xl font-bold text-[#7d48b9] mb-4 tracking-wider">
              <br></br>
              Webinar Coordinator Dashboard</h1>
           
        </div>
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
          {sidebarOpen && (
            <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)}>
              <aside className="admin-sidebar" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="admin-sidebar-close"
                  aria-label="Close menu"
                  onClick={() => setSidebarOpen(false)}
                >
                  ✕
                </button>

                <div className="admin-sidebar-items">
                  <button
                    type="button"
                    className={`admin-sidebar-item ${activeView === 'phase' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveView('phase');
                      setSidebarOpen(false);
                    }}
                  >
                    Phase Management
                  </button>

                  <button
                    type="button"
                    className={`admin-sidebar-item ${activeView === 'webinarDocs' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveView('webinarDocs');
                      setSidebarOpen(false);
                    }}
                  >
                    Webinar Details
                  </button>

                  <button
                    type="button"
                    className={`admin-sidebar-item ${activeView === 'webinar' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveView('webinar');
                      setSidebarOpen(false);
                    }}
                  >
                    Webinar Speaker Details
                  </button>

                  <button
                    type="button"
                    className={`admin-sidebar-item ${activeView === 'prizeWinners' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveView('prizeWinners');
                      setSidebarOpen(false);
                    }}
                  >
                    Prize Winner Details
                  </button>

                  <button
                    type="button"
                    className={`admin-sidebar-item ${activeView === 'coordiators' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveView('coordiators');
                      setSidebarOpen(false);
                    }}
                  >
                    Coordinator Management
                  </button>
                </div>
              </aside>
            </div>
          )}

          <div className="admin-buttons">
            <button className="submit-btn" onClick={() => setActiveView('phase')}>Phase Management</button>
            {/* <button className="submit-btn" onClick={() => setActiveView('webinar')}>Webinar Details</button> */}
            <button className="submit-btn" onClick={() => setActiveView('webinarDocs')}>Webinar Details</button>
            <button className="submit-btn" onClick={() => setActiveView('webinar')}>Webinar Speaker Details</button>

            <button className="submit-btn" onClick={() => setActiveView('prizeWinners')}>Prize Winners Details</button>
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