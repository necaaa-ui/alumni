import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './components/Home';
import PlacementDashboard from './components/PlacementDashboard';
import WebinarDashboard from "./components/WebinarDashboard";

import WebinarAlumniFeedbackForm from "./components/WebinarAlumniFeedbackForm";
import WebinarCompletedDetailsForm from "./components/WebinarCompletedDetailsForm";
import StudentRequestForm from "./components/StudentRequestForm";
import WebinarSpeakerAssignmentForm from "./components/WebinarSpeakerAssignmentForm";
import WebinarStudentFeedbackForm from "./components/WebinarStudentFeedbackForm";
import TopicApprovalForm from './components/TopicApprovalForm';
import WebinarCircular from './components/WebinarCircular';
import WebinarCertificate from './components/WebinarCertificate';
import WebinarEvents from './components/WebinarEvents';
import Adminpage from './components/Adminpage';
import WebinarDetails from './components/WebinarDetails';
import OverallWebinarReport from './components/OverallWebinarReport';
import LoginPage from "./components/LoginPage";

import MenteeRegistration from './components/mentorship/MenteeRegistration';
import MentorRegistration from './components/mentorship/MentorRegistration';

import MenteeMentorAssignment from './components/mentorship/Mentee-Mentor';
import MentorshipSchedulingForm from './components/mentorship/Mentor_scheduling';
import MeetingStatusUpdateForm from './components/mentorship/Meeting_Status';
import ProgramFeedbackForm from './components/mentorship/Feedback';
import Dashboard from './components/mentorship/Dashboard';
import ScheduledDashboard from './components/mentorship/ScheduledDashboard';


import LoginPage1 from './components/mentorship/LoginPage';
import AdminDashboard from './components/mentorship/AdminDashboard';
import MentorshipDashboard from './components/mentorship/MentorshipDashboard';
function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/placement-dashboard" element={<PlacementDashboard />} />
        <Route path="/webinar-dashboard" element={<WebinarDashboard />} />
        <Route path="/mentorship-dashboard" element={<MentorshipDashboard />} />
        <Route path="/student-request/:email" element={<StudentRequestForm />} />
        <Route path="/speaker-assignment/:email" element={<WebinarSpeakerAssignmentForm />} />
        <Route path="/webinar-events/:email" element={<WebinarEvents />} />
        <Route path="/webinar-details/:id/:encodedUserEmail" element={<WebinarDetails />} />
        <Route path="/webinar-details-upload/:id/:encodedUserEmail" element={<WebinarCompletedDetailsForm />} />
        <Route path="/alumni-feedback/:email" element={<WebinarAlumniFeedbackForm />} />
        <Route path="/student-feedback" element={<WebinarStudentFeedbackForm />} />
        <Route path="/requested-topic-approval/:email" element={<TopicApprovalForm />} />
        <Route path="/webinar-circular" element={<WebinarCircular />} />
        <Route path="/student-certificate/:webinarId" element={<WebinarCertificate />} />
        <Route path="/admin" element={<Adminpage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login1" element={<LoginPage1 />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/menteeregistration" element={<MenteeRegistration />} />
        <Route path="/mentorregistration" element={<MentorRegistration />} />
        <Route path="/menteementor_assign" element={<MenteeMentorAssignment/>} />
        <Route path="/mentor_scheduling" element={<MentorshipSchedulingForm/>} />
        <Route path="/meeting_updatation" element={<MeetingStatusUpdateForm/>} />
        <Route path="/program_feedback" element={<ProgramFeedbackForm/>} />
                                               
        <Route path="/scheduled_dashboard/:email" element={<ScheduledDashboard/>} />
                
                        
        <Route path="/admin_dashboard" element={<AdminDashboard/>} />
        <Route path="/co-ordinator" element={<MentorshipDashboard/>} />
                    
        
              
      </Routes>
    </Router>
  );
}

export default App;
