import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowLeft, Eye, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import stringSimilarity from 'string-similarity';
import Popup from './Popup';
import './Common.css';
import './WebinarDashboard.css';

export default function TopicApprovalForm() {
  const navigate = useNavigate();
  const [selectedPhase, setSelectedPhase] = useState('');
  const [isPhaseDropdownOpen, setIsPhaseDropdownOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApprovalPopupVisible, setIsApprovalPopupVisible] = useState(false);
  const [approvalPopupMessage, setApprovalPopupMessage] = useState('');
  const [phases, setPhases] = useState([]);
  const [phasesLoading, setPhasesLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Function to group topics using fuzzy matching
  const groupTopics = (topics) => {
    let groups = [];
    topics.forEach(t => {
      let found = false;
      for (let g of groups) {
        if (stringSimilarity.compareTwoStrings(t, g[0]) > 0.6) {
          g.push(t);
          found = true;
          break;
        }
      }
      if (!found) groups.push([t]);
    });
    return groups;
  };

  // Fetch all phases on component mount
  useEffect(() => {
    const fetchPhases = async () => {
      try {
        setPhasesLoading(true);
        const response = await fetch('http://localhost:5000/api/phases');
        const data = await response.json();
        const phasesArray = data.phases || (Array.isArray(data) ? data : []);
        if (Array.isArray(phasesArray) && phasesArray.length > 0) {
          const phaseNames = phasesArray.map(phase => `Phase ${phase.phaseId}`).sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]));
          setPhases(phaseNames);
          if (phaseNames.length > 0 && !selectedPhase) {
            setSelectedPhase(phaseNames[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching phases:', error);
      } finally {
        setPhasesLoading(false);
      }
    };
    fetchPhases();
  }, []);

  // Fetch topic approvals when selectedPhase changes
  useEffect(() => {
    if (selectedPhase) {
      fetchTopicApprovals(selectedPhase);
    }
  }, [selectedPhase]);

  const fetchTopicApprovals = async (phase = selectedPhase) => {
    try {
      setLoading(true);
      const url = phase
        ? `http://localhost:5000/api/topic-approvals?phase=${encodeURIComponent(phase)}`
        : 'http://localhost:5000/api/topic-approvals';
      const response = await fetch(url);
      const data = await response.json();
      setTopics(data.map(item => ({
        ...item,
        totalRequested: item.total_requested,
        status: item.approval
      })));
    } catch (error) {
      console.error('Error fetching topic approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseChange = (phase) => {
    setSelectedPhase(phase);
    setIsPhaseDropdownOpen(false);
    // Here you would typically fetch data for the selected phase
    fetchTopicApprovals(phase);
  };

  const handleApprove = async (index) => {
    const topic = topics[index];
    const newStatus = topic.status === "Approved" ? "On Hold" : "Approved";

    try {
      const response = await fetch(`http://localhost:5000/api/topic-approvals/${topic._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approval: newStatus }),
      });

      if (response.ok) {
        const updatedTopics = [...topics];
        updatedTopics[index].status = newStatus;
        setTopics(updatedTopics);

        // Show approval popup
        setApprovalPopupMessage(`Topic "${topic.topic}" is now ${newStatus}.`);
        setIsApprovalPopupVisible(true);
      }
    } catch (error) {
      console.error('Error updating approval:', error);
    }
  };

  const handleView = async (topic) => {
    try {
      const response = await fetch(`http://localhost:5000/api/student-requests/${encodeURIComponent(topic.domain)}/${encodeURIComponent(topic.topic)}`);
      const students = await response.json();

      // Fetch member details for each student email
      const studentsWithDetails = await Promise.all(
        students.map(async (student, index) => {
          try {
            const memberResponse = await fetch(`http://localhost:5000/api/member-by-email?email=${encodeURIComponent(student.email)}`);
            const memberData = await memberResponse.json();

            return {
              serialNumber: index + 1,
              email: student.email,
              name: memberData.found ? memberData.name : 'N/A',
              department: memberData.found ? memberData.department : 'N/A',
              topic: student.topic,
              reason: student.reason
            };
          } catch (error) {
            console.error('Error fetching member details for email:', student.email, error);
            return {
              serialNumber: index + 1,
              email: student.email,
              name: 'N/A',
              department: 'N/A',
              topic: student.topic,
              reason: student.reason
            };
          }
        })
      );

      setSelectedTopic({
        ...topic,
        students: studentsWithDetails
      });
      setIsPopupOpen(true);
    } catch (error) {
      console.error('Error fetching student requests:', error);
    }
  };

  const toggleRow = (index) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

  return (
    <div className="student-form-page">
      {/* Background Orbs */}
      <div className="background-orbs">
        <div className="orb orb-purple"></div>
        <div className="orb orb-blue animation-delay-2000"></div>
        <div className="orb orb-pink animation-delay-4000"></div>
      </div>

      <div className="form-wrapper">
        <div className="form-container">
          <button className="back-btn" onClick={() => navigate("/")}>
            <ArrowLeft className="back-btn-icon" /> Back to Dashboard
          </button>

          <div className="form-header">
            <div className="icon-wrapper">
              <CheckCircle className="header-icon" />
            </div>
            <h1 className="form-title">Requested Topic Approval</h1>
          </div>

          {/* Phase Dropdown */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedPhase}
                onChange={(e) => handlePhaseChange(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: 'white',
                  border: '2px solid #7c3aed',
                  borderRadius: '8px',
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#5b21b6',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '150px'
                }}
              >
                {phases.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
              <div style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#5b21b6'
              }}>
               ▼
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-6 gap-4 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold p-4 md:p-10 text-center">
            <div>DOMAIN</div>
            <div>TOPIC</div>
            <div>TOTAL REQUESTED</div>
            <div>STATUS</div>
            <div>ACTION</div>
            <div>DETAILS</div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold p-4 text-center">
            <h3 className="text-lg">Topic Approval Requests</h3>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-600 to-blue-500">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">DOMAIN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">TOPIC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">TOTAL REQUESTED</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">STATUS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">ACTION</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">DETAILS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topics.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.domain}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.topic}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-center text-gray-900">{item.totalRequested}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleApprove(index)}
                          disabled={item.status === "Approved"}
                          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${
                            item.status === "Approved"
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                          }`}
                        >
                          ✓ Approve
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => toggleRow(index)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          {expandedRows.has(index) ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                          {expandedRows.has(index) ? 'Hide' : 'Show'}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(index) && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Topic Details</h4>
                                <p className="text-sm text-gray-600"><strong>Domain:</strong> {item.domain}</p>
                                <p className="text-sm text-gray-600"><strong>Topic:</strong> {item.topic}</p>
                                <p className="text-sm text-gray-600"><strong>Total Requested:</strong> {item.totalRequested}</p>
                                <p className="text-sm text-gray-600"><strong>Status:</strong> {item.status}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Actions</h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApprove(index)}
                                    disabled={item.status === "Approved"}
                                    className={`flex items-center justify-center gap-2 shadow-md
                                      px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                                      item.status === "Approved"
                                        ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                                        : "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white"
                                    }`}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    onClick={() => handleView(item)}
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-500
                                      hover:from-purple-700 hover:to-blue-600 text-white shadow-md
                                      px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Students
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Designed with 💜 for Alumni Network
        </div>
      </div>

      {/* Popup */}
      {isPopupOpen && selectedTopic && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Students Requested for "{selectedTopic.topic}"</h3>
            </div>

            <div className="modal-body">
              <div className="stats-grid">
                <div className="stat">
                  <div className="label">Domain</div>
                  <div className="value">{selectedTopic.domain}</div>
                </div>
                <div className="stat">
                  <div className="label">Total Requested</div>
                  <div className="value">{selectedTopic.totalRequested}</div>
                </div>
                <div className="stat">
                  <div className="label">Status</div>
                  <div className="value">{selectedTopic.status}</div>
                </div>
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px', color: '#5b21b6', fontWeight: '600', fontSize: '18px' }}>Student Details</h4>

              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-5 gap-4 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold p-4 text-center" style={{ borderRadius: '8px 8px 0 0' }}>
                <div>Serial Number</div>
                <div>Name</div>
                <div>Email</div>
                <div>Department</div>
                <div>Reason</div>
              </div>

              {/* Mobile Header */}
              <div className="md:hidden bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold p-4 text-center">
                <h5 className="text-sm">Student Details</h5>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-200" style={{ backgroundColor: 'white', borderRadius: '0 0 8px 8px' }}>
                {selectedTopic.students.map((student, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 items-center hover:bg-purple-50 transition-colors"
                  >
                    {/* Mobile */}
                    <div className="md:hidden space-y-2">
                      <div className="font-semibold text-purple-800">#{student.serialNumber} - {student.name}</div>
                      <div className="text-sm text-gray-700">{student.email}</div>
                      <div className="text-sm text-gray-600">Department: {student.department}</div>
                      <div className="text-sm text-gray-600">Reason: {student.reason}</div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden md:block text-gray-800 font-medium text-center">{student.serialNumber}</div>
                    <div className="hidden md:block text-gray-700 text-center">{student.name}</div>
                    <div className="hidden md:block text-gray-700 text-center">{student.email}</div>
                    <div className="hidden md:block text-gray-700 text-center font-semibold">{student.department}</div>
                    <div className="hidden md:block text-gray-700 text-center">{student.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setIsPopupOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Popup */}
      {isApprovalPopupVisible && (
        <Popup
          message={approvalPopupMessage}
          type="success"
          onClose={() => setIsApprovalPopupVisible(false)}
        />
      )}
    </div>
  );
}