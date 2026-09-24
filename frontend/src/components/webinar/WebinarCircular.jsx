import React from "react";
import "./Common.css"; // Add CSS below

export default function WebinarCircular({ date = " ", data = [], month = "", onClose ,onDownload}) {
  return (
    <div className="circular-container">
      <div className="header">
        <h2>NATIONAL ENGINEERING COLLEGE</h2>
        <p>(An Autonomous Institution, Affiliated to Anna University - Chennai)</p>
        <p>K.R. NAGAR, KOVILPATTI – 628 503</p>
        <h2>NEC ALUMNI ASSOCIATION</h2>
        <p className="date-field">[Date: {date}]</p>
      </div>

      <p className="intro">
        In association with the conduction of webinar series the following speakers are
        identified for the month of {month}.
      </p>

      <table className="circular-table">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Date</th>
            <th>Timing</th>
            <th>Topic</th>
            <th>Speaker</th>
            <th>Designation</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td>{row.branch}</td>
              <td>{row.date}</td>
              <td>{row.time}</td>
              <td>{row.topic}</td>
              <td>
                {row.speaker.split('\n').map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </td>
              <td>{row.designation}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginBottom: '20px' }}></div>

      <table className="footer-table">
        <tbody>
          <tr>
            <td>PROGRAM COORDINATOR</td>
            <td>ASSOCIATE ALUMNI COORDINATOR</td>
            <td>DEAN (IR & AA)</td>
            <td>PRINCIPAL</td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          onClick={onDownload}
          className="submit-btn"
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          Download Circular
        </button>
      </div>
    </div>
  );
}