import React, { useState } from "react";
import "./OverallWebinarReport.css";

const OverallWebinarReport = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Sample domains data (replace with actual data fetching)
  const domains = [
    { id: 'd1', name: 'Full Stack Development', conducted: 4 },
    { id: 'd2', name: 'Artificial Intelligence', conducted: 2 },
    { id: 'd3', name: 'Cyber Security', conducted: 4 },
    { id: 'd4', name: 'Data Science', conducted: 4 },
    { id: 'd5', name: 'Cloud Computing', conducted: 4 },
    { id: 'd6', name: 'Embedded Systems', conducted: 4 },
    { id: 'd7', name: 'DevOps', conducted: 4 }
  ];

  return (
    <div className="report-container">
      <h2 className="report-title">Overall Webinar Report</h2>

      {/* Search Bar */}
      <input
        type="text"
        className="search-input"
        placeholder="Search by Alumni, Topic, etc."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Domain-wise Detailed Reports */}
      {domains.map((domain) => (
        <div key={domain.id} className="domain-section">
          <h3 className="domain-title">Detailed Report for {domain.name}</h3>

          {/* Table */}
          <div className="table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Alumni Name</th>
                  <th>Batch</th>
                  <th>Designation</th>
                  <th>Webinar Topic</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Registered Count</th>
                  <th>Attended Count</th>
                  <th>Prize Winner Details</th>
                </tr>
              </thead>

              <tbody>
                {Array(domain.conducted)
                  .fill(0)
                  .map((_, index) => (
                    <tr key={index}>
                      <td colSpan="9" className="placeholder-text">
                        Data fetched from DB will appear here
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Back Link */}
      <a href="/dashboard" className="back-link">← Back to Dashboard</a>
    </div>
  );
};

export default OverallWebinarReport;
