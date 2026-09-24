// controllers/dashboardController.js - WITH PHONE NUMBERS ADDED & FIXED ASSIGNMENTS & PHASE ID FROM MENTOR & BASIC OBJECT FOR MENTEES
const Phase = require("../models/Phase");
const MenteeRequest = require("../models/MenteeRequest");
const MentorRegistration = require("../models/MentorRegistration");
const MentorMenteeAssignment = require("../models/MentorMenteeAssignment");
const MeetingSchedule = require("../models/MeetingSchedule");
const MeetingStatus = require("../models/MeetingStatus");
const ProgramFeedback = require("../models/ProgramFeedback");
const User = require("../models/User");

// Helper function to extract phone number from user
const extractPhoneNumber = (user) => {
  if (!user) return 'N/A';
  
  // Check contact_details.mobile
  if (user.contact_details) {
    if (user.contact_details.mobile && user.contact_details.mobile !== '') 
      return user.contact_details.mobile;
    if (user.contact_details.phone && user.contact_details.phone !== '') 
      return user.contact_details.phone;
    if (user.contact_details.home && user.contact_details.home !== '') 
      return user.contact_details.home;
  }
  
  // Check basic.mobile if exists
  if (user.basic && user.basic.mobile && user.basic.mobile !== '') 
    return user.basic.mobile;
  
  // Check direct fields
  if (user.mobile && user.mobile !== '') return user.mobile;
  if (user.phone && user.phone !== '') return user.phone;
  
  return 'N/A';
};

// ==================== GET ALL MENTORS WITH FORMATTED DATA ====================
exports.getAllMentors = async (req, res) => {
  try {
    console.log("🔍 Fetching all mentors...");
    
    // Get all mentor registrations
    const mentors = await MentorRegistration.find();
    console.log(`📊 Found ${mentors.length} mentor registrations`);

    // Format mentors with user details (following your working pattern)
    const formatted = await Promise.all(
      mentors.map(async (m) => {
        const user = await User.findById(m.mentor_id);
        console.log(`Looking up User for mentor_id: ${m.mentor_id} => ${user ? "Found" : "Not found"}`);

        return {
          _id: m._id,
          mentor_id: m.mentor_id,
          user_id: user?._id || m.mentor_id || null,
          name: user?.basic?.name || "Unknown Mentor",
          email: user?.basic?.email_id || "No email found",
          phone_number: extractPhoneNumber(user),
          areas_of_interest: m.areas_of_interest || [],
          description: m.description || "",
          phaseId: m.phaseId || "N/A",
          status: m.status || "pending",
          assignedDate: m.assignedDate || null,
          createdAt: m.createdAt
        };
      })
    );

    console.log(`✅ Final mentors sent to frontend: ${formatted.length}`);
    console.log(`📊 Status distribution:`, {
      pending: formatted.filter(m => m.status === 'pending').length,
      assigned: formatted.filter(m => m.status === 'assigned').length
    });
    
    res.json({ 
      success: true, 
      mentors: formatted,
      stats: {
        total: formatted.length,
        withName: formatted.filter(m => m.name !== "Unknown Mentor").length,
        withEmail: formatted.filter(m => m.email !== "No email found").length,
        withPhone: formatted.filter(m => m.phone_number !== 'N/A').length,
        pending: formatted.filter(m => m.status === 'pending').length,
        assigned: formatted.filter(m => m.status === 'assigned').length
      }
    });

  } catch (err) {
    console.error("❌ Error fetching mentors:", err);
    res.status(500).json({ success: false, message: "Server error fetching mentors" });
  }
};

// ==================== GET ALL MENTEES WITH FORMATTED DATA ====================
exports.getAllMentees = async (req, res) => {
  try {
    console.log("🔍 Fetching all mentees...");
    
    const mentees = await MenteeRequest.find();
    console.log(`📊 Found ${mentees.length} mentee requests`);

    // Get already assigned mentees
    const assignments = await MentorMenteeAssignment.find();
    const assignedIds = assignments.flatMap(a => 
      a.mentee_user_ids.map(id => id.toString())
    );

    const formatted = await Promise.all(
      mentees.map(async (m) => {
        const user = await User.findById(m.mentee_user_id);

        return {
          _id: m._id,
          mentee_user_id: m.mentee_user_id,
          user_id: user?._id || m.mentee_user_id,
          basic: user?.basic || null, // ✅ ADD THIS - includes name, email_id, label, department info
          name: user?.basic?.name || "Unknown Mentee",
          email: user?.basic?.email_id || "No email found",
          phone_number: extractPhoneNumber(user),
          area_of_interest: m.area_of_interest || "Not specified",
          description: m.description || "",
          phaseId: m.phaseId || "N/A",
          status: m.status || "pending",
          assigned: assignedIds.includes(m.mentee_user_id.toString()),
          createdAt: m.createdAt
        };
      })
    );

    console.log(`✅ Final mentees sent to frontend: ${formatted.length}`);
    res.json({ 
      success: true, 
      mentees: formatted,
      stats: {
        total: formatted.length,
        withPhone: formatted.filter(m => m.phone_number !== 'N/A').length,
        pending: formatted.filter(m => m.status === "pending").length,
        assigned: formatted.filter(m => m.assigned).length,
        unassigned: formatted.filter(m => !m.assigned).length
      }
    });

  } catch (err) {
    console.error("❌ Error fetching mentees:", err);
    res.status(500).json({ success: false, message: "Server error fetching mentees" });
  }
};

// ==================== GET ALL ASSIGNMENTS WITH FORMATTED DATA (FIXED - PHASE FROM MENTOR) ====================
exports.getAllAssignments = async (req, res) => {
  try {
    console.log("🔍 Fetching all assignments...");
    
    const assignments = await MentorMenteeAssignment.find();
    console.log(`📊 Found ${assignments.length} assignments`);

    const formatted = await Promise.all(
      assignments.map(async (assignment) => {
        // Get mentor details with phone number
        const mentor = await User.findById(assignment.mentor_user_id);
        
        // Get mentor registration to fetch phaseId
        const mentorRegistration = await MentorRegistration.findOne({ 
          mentor_id: assignment.mentor_user_id 
        });
        
        // Get mentor phone number
        let mentorPhone = 'N/A';
        if (mentor) {
          if (mentor.contact_details?.mobile) {
            mentorPhone = mentor.contact_details.mobile;
          } else if (mentor.contact_details?.phone) {
            mentorPhone = mentor.contact_details.phone;
          } else if (mentor.basic?.mobile) {
            mentorPhone = mentor.basic.mobile;
          }
        }
        
        // Get phaseId from mentor registration (NOT from assignment)
        const phaseId = mentorRegistration?.phaseId || assignment.phaseId || 'N/A';
        
        // Get all mentees details with phone numbers and additional info
        const mentees = await Promise.all(
          assignment.mentee_user_ids.map(async (menteeId) => {
            const mentee = await User.findById(menteeId);
            
            // Get mentee phone number
            let menteePhone = 'N/A';
            if (mentee) {
              if (mentee.contact_details?.mobile) {
                menteePhone = mentee.contact_details.mobile;
              } else if (mentee.contact_details?.phone) {
                menteePhone = mentee.contact_details.phone;
              } else if (mentee.basic?.mobile) {
                menteePhone = mentee.basic.mobile;
              }
            }
            
            // Get mentee request details for additional info
            const menteeRequest = await MenteeRequest.findOne({ mentee_user_id: menteeId });
            
            return {
              _id: menteeId,
              basic: mentee?.basic || null, // ✅ ADD THIS
              name: mentee?.basic?.name || "Unknown Mentee",
              email: mentee?.basic?.email_id || "No email",
              phone_number: menteePhone,
              area_of_interest: menteeRequest?.area_of_interest || "Not specified",
              description: menteeRequest?.description || "",
              phaseId: menteeRequest?.phaseId || phaseId
            };
          })
        );

        return {
          _id: assignment._id,
          mentor_user_id: assignment.mentor_user_id,
          mentorDetails: {
            name: mentor?.basic?.name || "Unknown Mentor",
            email: mentor?.basic?.email_id || "No email",
            phone_number: mentorPhone
          },
          mentees: mentees,
          commencement_date: assignment.commencement_date,
          end_date: assignment.end_date,
          phaseId: phaseId,
          createdAt: assignment.createdAt
        };
      })
    );

    console.log(`✅ Final assignments sent to frontend: ${formatted.length}`);
    console.log(`📊 Assignment phase details:`, formatted.map(a => ({
      mentor: a.mentorDetails.name,
      phaseId: a.phaseId,
      menteesCount: a.mentees.length
    })));
    
    res.json({ 
      success: true, 
      assignments: formatted,
      stats: {
        total: formatted.length,
        totalMentees: formatted.reduce((sum, a) => sum + a.mentees.length, 0),
        avgMenteesPerMentor: formatted.length > 0 ? (formatted.reduce((sum, a) => sum + a.mentees.length, 0) / formatted.length).toFixed(1) : 0
      }
    });

  } catch (err) {
    console.error("❌ Error fetching assignments:", err);
    res.status(500).json({ success: false, message: "Server error fetching assignments" });
  }
};

// ==================== GET ALL MEETINGS ====================
exports.getAllMeetings = async (req, res) => {
  try {
    console.log("🔍 Fetching all meetings...");

    const { dateFrom, dateTo, status } = req.query;

    // ---------------- FILTER FOR MEETING SCHEDULE ----------------
    const filter = {};
    if (dateFrom || dateTo) {
      filter["meeting_dates.date"] = {};
      if (dateFrom) filter["meeting_dates.date"].$gte = new Date(dateFrom);
      if (dateTo) filter["meeting_dates.date"].$lte = new Date(dateTo);
    }

    const meetings = await MeetingSchedule.find(filter);
    console.log(`📊 Found ${meetings.length} meeting schedules`);

    // ---------------- FORMAT MEETINGS ----------------
    const formatted = await Promise.all(
      meetings.map(async (meeting) => {
        const mentor = await User.findById(meeting.mentor_user_id);

        const mentees = await Promise.all(
          meeting.mentee_user_ids.map(async (menteeId) => {
            const mentee = await User.findById(menteeId);
            return {
              _id: menteeId,
              basic: mentee?.basic || null, // ✅ ADD THIS
              name: mentee?.basic?.name || "Unknown Mentee",
              email: mentee?.basic?.email_id || "No email",
              phone_number: extractPhoneNumber(mentee)
            };
          })
        );

        // 🔴 IMPORTANT: get ALL statuses for this meeting
        const statusDocs = await MeetingStatus.find({
          meeting_id: meeting._id
        });

        // Decide display status (priority-based)
        let meetingStatus = "Scheduled";
        if (statusDocs.some(s => s.status === "In Progress")) {
          meetingStatus = "In Progress";
        } else if (statusDocs.some(s => s.status === "Scheduled")) {
          meetingStatus = "Scheduled";
        } else if (statusDocs.some(s => s.status === "Completed")) {
          meetingStatus = "Completed";
        } else if (statusDocs.some(s => s.status === "Postponed")) {
          meetingStatus = "Postponed";
        } else if (statusDocs.some(s => s.status === "Cancelled")) {
          meetingStatus = "Cancelled";
        }

        return {
          _id: meeting._id,
          mentor_user_id: meeting.mentor_user_id,
          mentorDetails: {
            name: mentor?.basic?.name || "Unknown Mentor",
            email: mentor?.basic?.email_id || "No email",
            phone_number: extractPhoneNumber(mentor)
          },
          mentees,
          meeting_dates: meeting.meeting_dates || [],
          meeting_time: meeting.meeting_time,
          duration_minutes: meeting.duration_minutes,
          platform: meeting.platform,
          meeting_link: meeting.meeting_link,
          agenda: meeting.agenda,
          preferred_day: meeting.preferred_day,
          number_of_meetings: meeting.number_of_meetings,
          createdAt: meeting.createdAt,
          status: meetingStatus
        };
      })
    );

    // ---------------- STATUS FILTER ----------------
    let filteredMeetings = formatted;
    if (status && status !== "all") {
      filteredMeetings = formatted.filter(
        m => m.status.toLowerCase() === status.toLowerCase()
      );
    }

    // ---------------- ✅ STATUS COUNTS FROM MeetingStatus ----------------
    const meetingStatuses = await MeetingStatus.find();

    const stats = {
      total: meetingStatuses.length,
      completed: meetingStatuses.filter(s => s.status === "Completed").length,
      postponed: meetingStatuses.filter(
        s => s.status === "Postponed" || s.status === "Cancelled"
      ).length,
      scheduled: meetingStatuses.filter(
        s => s.status === "Scheduled" || s.status === "In Progress"
      ).length
    };

    console.log("✅ Meeting stats:", stats);

    res.json({
      success: true,
      meetings: filteredMeetings,
      stats
    });

  } catch (err) {
    console.error("❌ Error fetching meetings:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching meetings"
    });
  }
};

// ==================== GET ALL FEEDBACKS WITH FORMATTED DATA ====================
exports.getAllFeedbacks = async (req, res) => {
  try {
    console.log("🔍 Fetching all feedbacks...");
    
    const feedbacks = await ProgramFeedback.find();
    console.log(`📊 Found ${feedbacks.length} feedbacks`);

    const formatted = await Promise.all(
      feedbacks.map(async (feedback) => {
        const user = await User.findById(feedback.user_id);

        return {
          _id: feedback._id,
          user_id: feedback.user_id,
          userDetails: {
            name: user?.basic?.name || "Anonymous User",
            email: user?.basic?.email_id || "No email",
            phone_number: extractPhoneNumber(user)
          },
          role: feedback.role,
          programOrganization: feedback.programOrganization,
          matchingProcess: feedback.matchingProcess,
          supportProvided: feedback.supportProvided,
          overallSatisfaction: feedback.overallSatisfaction,
          generalFeedback: feedback.generalFeedback,
          suggestions: feedback.suggestions,
          participateAgain: feedback.participateAgain,
          createdAt: feedback.createdAt
        };
      })
    );

    console.log(`✅ Final feedbacks sent to frontend: ${formatted.length}`);
    res.json({ 
      success: true, 
      feedbacks: formatted,
      stats: {
        total: formatted.length,
        mentors: formatted.filter(f => f.role === "mentor").length,
        mentees: formatted.filter(f => f.role === "mentee").length
      }
    });

  } catch (err) {
    console.error("❌ Error fetching feedbacks:", err);
    res.status(500).json({ success: false, message: "Server error fetching feedbacks" });
  }
};

// ==================== GET DASHBOARD STATISTICS ====================
exports.getDashboardStats = async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get counts using the same pattern
    const totalMentors = await MentorRegistration.countDocuments();
    const totalMentees = await MenteeRequest.countDocuments();
    
    // New this week
    const newMentorsThisWeek = await MentorRegistration.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });
    
    const newMenteesThisWeek = await MenteeRequest.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });
    
    // Get phase-wise counts
    const phases = await Phase.find().sort({ phaseId: 1 });
    const phaseStats = await Promise.all(
      phases.map(async (phase) => {
        const mentorCount = await MentorRegistration.countDocuments({ phaseId: phase.phaseId });
        const menteeCount = await MenteeRequest.countDocuments({ phaseId: phase.phaseId });
        
        return {
          phaseId: phase.phaseId,
          phaseName: phase.name,
          startDate: phase.startDate,
          endDate: phase.endDate,
          totalMentors: mentorCount,
          totalMentees: menteeCount
        };
      })
    );

    // Meeting stats
    const totalMeetings = await MeetingSchedule.countDocuments();
    const upcomingMeetings = await MeetingSchedule.countDocuments({
      'meeting_dates.date': { $gte: new Date() }
    });

    res.json({
      success: true,
      stats: {
        totalMentors,
        totalMentees,
        newMentorsThisWeek,
        newMenteesThisWeek,
        totalMeetings,
        upcomingMeetings,
        phaseStats
      },
      lastUpdated: new Date()
    });

  } catch (err) {
    console.error("❌ Error fetching dashboard stats:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== GET RECENT ACTIVITY ====================
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Recent mentor registrations
    const recentMentors = await MentorRegistration.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    const activities = await Promise.all(
      recentMentors.map(async (mentor) => {
        const user = await User.findById(mentor.mentor_id);
        return {
          type: 'mentor_registration',
          user: user?.basic?.name || "New Mentor",
          email: user?.basic?.email_id || "",
          timestamp: mentor.createdAt,
          message: 'registered as a mentor'
        };
      })
    );

    res.json({
      success: true,
      activities: activities.slice(0, limit)
    });

  } catch (err) {
    console.error("❌ Error fetching recent activity:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== DEBUG: CHECK USER DATA ====================
exports.debugUserData = async (req, res) => {
  try {
    // Check a specific mentor from your data
    const mentorId = "68dfc1c151c797667a437b54"; // From your example
    const user = await User.findById(mentorId);
    
    // Check mentor registration
    const mentorReg = await MentorRegistration.findOne({ mentor_id: mentorId });
    
    // Check all users structure
    const allUsers = await User.find().limit(3);
    
    res.json({
      success: true,
      debug: {
        userExists: !!user,
        userData: user ? {
          _id: user._id,
          hasBasic: !!user.basic,
          basicFields: user.basic ? Object.keys(user.basic) : [],
          name: user.basic?.name,
          email: user.basic?.email_id,
          phoneFromContactDetails: user.contact_details?.mobile,
          phoneFromBasic: user.basic?.mobile
        } : null,
        mentorRegistration: mentorReg,
        sampleUsers: allUsers.map(u => ({
          _id: u._id,
          name: u.basic?.name,
          email: u.basic?.email_id,
          phone: u.contact_details?.mobile || u.basic?.mobile
        }))
      }
    });

  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ==================== DASHBOARD SUMMARY (For Cards Display) ====================
exports.getDashboardSummary = async (req, res) => {
  try {
    console.log("📊 Fetching dashboard summary...");
    
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get all counts in parallel
    const [
      totalMentors,
      totalMentees,
      totalMeetings,
      assignments
    ] = await Promise.all([
      MentorRegistration.countDocuments(),
      MenteeRequest.countDocuments(),
      MeetingSchedule.countDocuments(),
      MentorMenteeAssignment.find()
    ]);
    
    // Calculate assigned mentees
    const assignedMentees = assignments.reduce((sum, assignment) => 
      sum + assignment.mentee_user_ids.length, 0);
    
    // Get meeting status counts
    const meetings = await MeetingSchedule.find();
    let completedMeetings = 0;
    let postponedMeetings = 0;
    let upcomingMeetings = 0;
    
    for (const meeting of meetings) {
      if (meeting.meeting_dates && meeting.meeting_dates.length > 0) {
        for (const dateObj of meeting.meeting_dates) {
          if (dateObj.meeting_id) {
            const statusDoc = await MeetingStatus.findOne({ 
              meeting_id: dateObj.meeting_id 
            });
            
            if (statusDoc) {
              if (statusDoc.status === 'Completed') completedMeetings++;
              if (statusDoc.status === 'Postponed' || statusDoc.status === 'Cancelled') postponedMeetings++;
            }
          }
        }
      }
    }
    
    // Get phase-wise counts for graph
    const phases = await Phase.find().sort({ phaseId: 1 });
    const phaseData = await Promise.all(
      phases.map(async (phase) => {
        const [mentorCount, menteeCount] = await Promise.all([
          MentorRegistration.countDocuments({ phaseId: phase.phaseId }),
          MenteeRequest.countDocuments({ phaseId: phase.phaseId })
        ]);
        
        return {
          phaseId: phase.phaseId,
          phaseName: phase.name,
          mentors: mentorCount,
          mentees: menteeCount,
          total: mentorCount + menteeCount
        };
      })
    );
    
    // Get mentor interests for carousel
    const mentors = await MentorRegistration.find().limit(10);
    const mentorInterests = await Promise.all(
      mentors.map(async (mentor) => {
        const user = await User.findById(mentor.mentor_id);
        return {
          name: user?.basic?.name || "Unknown Mentor",
          interests: mentor.areas_of_interest || [],
          phaseId: mentor.phaseId || "N/A"
        };
      })
    );
    
    // Calculate percentages
    const assignmentRate = totalMentees > 0 
      ? ((assignedMentees / totalMentees) * 100).toFixed(1) 
      : 0;
      
    const completionRate = totalMeetings > 0 
      ? ((completedMeetings / totalMeetings) * 100).toFixed(1) 
      : 0;

    res.json({
      success: true,
      summary: {
        // Key Metrics Cards
        metrics: [
          {
            title: "Total Mentors",
            value: totalMentors,
            icon: "👨‍🏫",
            color: "blue",
            change: "+12%",
            description: "Registered mentors"
          },
          {
            title: "Total Mentees",
            value: totalMentees,
            icon: "👨‍🎓",
            color: "green",
            change: "+18%",
            description: "Mentee requests"
          },
          {
            title: "Assigned Mentees",
            value: assignedMentees,
            icon: "🤝",
            color: "purple",
            change: assignmentRate + "%",
            description: "Successfully assigned"
          },
          {
            title: "Total Meetings",
            value: totalMeetings,
            icon: "📅",
            color: "orange",
            change: completedMeetings + " completed",
            description: "All scheduled meetings"
          }
        ],
        
        // Meeting Status Cards
        meetingStats: [
          {
            title: "Completed Meetings",
            value: completedMeetings,
            icon: "✅",
            color: "success",
            rate: completionRate + "%",
            description: "Successfully conducted"
          },
          {
            title: "Upcoming Meetings",
            value: upcomingMeetings,
            icon: "⏰",
            color: "warning",
            description: "Scheduled for next 7 days"
          },
          {
            title: "Postponed/Cancelled",
            value: postponedMeetings,
            icon: "⏸️",
            color: "danger",
            description: "Meetings rescheduled or cancelled"
          }
        ],
        
        // Phase-wise Data for Graph
        phaseGraphData: {
          phases: phaseData.map(p => p.phaseName),
          mentors: phaseData.map(p => p.mentors),
          mentees: phaseData.map(p => p.mentees)
        },
        
        // Phase Cards for Carousel
        phaseCards: phaseData.map(phase => ({
          phaseId: phase.phaseId,
          phaseName: phase.name,
          mentors: phase.mentors,
          mentees: phase.mentees,
          total: phase.total,
          mentorColor: getRandomColor(),
          menteeColor: getRandomColor()
        })),
        
        // Mentor Interests Carousel
        mentorInterests: mentorInterests,
        
        // Statistics
        statistics: {
          assignmentRate: assignmentRate + "%",
          completionRate: completionRate + "%",
          mentorToMenteeRatio: totalMentors > 0 ? (totalMentees / totalMentors).toFixed(1) : 0,
          upcomingMeetingsNext7Days: upcomingMeetings
        },
        
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("❌ Error fetching dashboard summary:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Helper function for random colors
function getRandomColor() {
  const colors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', 
    '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ==================== GET PHASE-WISE STATISTICS (FINAL FIX) ====================
exports.getPhaseStatistics = async (req, res) => {
  try {
    const phases = await Phase.find().sort({ phaseId: 1 });
    const today = new Date();

    const result = await Promise.all(
      phases.map(async (phase) => {

        const phaseId = phase.phaseId;

        // 1️⃣ Mentors & mentees by phase
        const mentors = await MentorRegistration.find({ phaseId });
        const mentees = await MenteeRequest.find({ phaseId });

        const mentorIds = mentors.map(m => m.mentor_id);
        const menteeIds = mentees.map(m => m.mentee_user_id);

        // 2️⃣ Assignments (NO phaseId here)
        const assignments = await MentorMenteeAssignment.find({
          mentor_user_id: { $in: mentorIds }
        });

        const assignedMenteeSet = new Set();
        assignments.forEach(a => {
          a.mentee_user_ids?.forEach(id =>
            assignedMenteeSet.add(id.toString())
          );
        });

        const assignedMentees = assignedMenteeSet.size;

        // 3️⃣ MeetingStatus — PHASE BASED (FIXED ✅)
        const meetingStatuses = await MeetingStatus.find({ phaseId });

        // Group by meeting_id
        const meetingMap = new Map();

        meetingStatuses.forEach(ms => {
          const mid = ms.meeting_id.toString();

          if (!meetingMap.has(mid)) {
            meetingMap.set(mid, {
              completed: false,
              cancelledOrPostponed: false
            });
          }

          if (ms.status === "Completed") {
            meetingMap.get(mid).completed = true;
          }

          if (ms.status === "Cancelled" || ms.status === "Postponed") {
            meetingMap.get(mid).cancelledOrPostponed = true;
          }
        });

        const totalMeetings = meetingMap.size;

        let completedMeetings = 0;
        let cancelledOrPostponed = 0;

        meetingMap.forEach(v => {
          if (v.completed) completedMeetings++;
          if (v.cancelledOrPostponed) cancelledOrPostponed++;
        });

        // 4️⃣ Upcoming meetings (phase-based)
        let upcomingMeetings = 0;

        const schedules = await MeetingSchedule.find({ phaseId });

        schedules.forEach(s => {
          s.meeting_dates?.forEach(d => {
            if (d?.date && new Date(d.date) > today) {
              upcomingMeetings++;
            }
          });
        });

        // 5️⃣ Mentor list (top 3)
        const mentorList = await Promise.all(
          mentors.slice(0, 3).map(async mentor => {
            const user = await User.findById(mentor.mentor_id);
            return {
              name: user?.basic?.name || "Unknown",
              interests: mentor.areas_of_interest || []
            };
          })
        );

        return {
          phaseId,
          phaseName: phase.name,
          startDate: phase.startDate,
          endDate: phase.endDate,
          isActive: today >= phase.startDate && today <= phase.endDate,
          stats: {
            totalMentors: mentors.length,
            totalMentees: mentees.length,
            assignedMentees,
            assignmentRate: mentees.length
              ? ((assignedMentees / mentees.length) * 100).toFixed(1) + "%"
              : "0%",
            totalMeetings,
            completedMeetings,
            upcomingMeetings,
            cancelledOrPostponed,
            completionRate: totalMeetings
              ? ((completedMeetings / totalMeetings) * 100).toFixed(1) + "%"
              : "0%"
          },
          mentorList
        };
      })
    );

    res.json({ success: true, phases: result });

  } catch (err) {
    console.error("❌ Phase stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== GET MENTOR INTERESTS CAROUSEL ====================
exports.getMentorInterestsCarousel = async (req, res) => {
  try {
    const mentors = await MentorRegistration.find();
    
    // Group by area of interest
    const interestCounts = {};
    const mentorsByInterest = {};
    
    for (const mentor of mentors) {
      const user = await User.findById(mentor.mentor_id);
      const mentorName = user?.basic?.name || "Unknown Mentor";
      
      if (mentor.areas_of_interest && mentor.areas_of_interest.length > 0) {
        for (const interest of mentor.areas_of_interest) {
          if (!interestCounts[interest]) {
            interestCounts[interest] = 0;
            mentorsByInterest[interest] = [];
          }
          interestCounts[interest]++;
          mentorsByInterest[interest].push({
            name: mentorName,
            phaseId: mentor.phaseId || "N/A"
          });
        }
      }
    }
    
    // Convert to array for carousel
    const interestsArray = Object.entries(interestCounts)
      .map(([interest, count]) => ({
        interest,
        count,
        mentors: mentorsByInterest[interest].slice(0, 5),
        color: getRandomColor()
      }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      interests: interestsArray,
      totalInterests: Object.keys(interestCounts).length,
      mostPopular: interestsArray.length > 0 ? interestsArray[0] : null
    });
    
  } catch (err) {
    console.error("❌ Error fetching mentor interests:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== GET UPCOMING MEETINGS ====================
exports.getUpcomingMeetings = async (req, res) => {
  try {
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const meetings = await MeetingSchedule.find({
      'meeting_dates.date': { 
        $gte: today, 
        $lte: nextMonth 
      }
    }).sort({ 'meeting_dates.date': 1 });
    
    const formattedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        const mentor = await User.findById(meeting.mentor_user_id);
        const upcomingDates = meeting.meeting_dates
          .filter(dateObj => dateObj.date && new Date(dateObj.date) >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3);
        
        return {
          _id: meeting._id,
          mentorName: mentor?.basic?.name || "Unknown Mentor",
          mentorPhone: extractPhoneNumber(mentor),
          menteeCount: meeting.mentee_user_ids.length,
          nextMeeting: upcomingDates.length > 0 ? upcomingDates[0].date : null,
          allUpcomingDates: upcomingDates.map(d => d.date),
          platform: meeting.platform,
          agenda: meeting.agenda || "No agenda specified"
        };
      })
    );
    
    res.json({
      success: true,
      meetings: formattedMeetings,
      next7Days: formattedMeetings.filter(m => {
        if (!m.nextMeeting) return false;
        const meetingDate = new Date(m.nextMeeting);
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return meetingDate <= weekFromNow;
      }).length
    });
    
  } catch (err) {
    console.error("❌ Error fetching upcoming meetings:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================================
// DELETE MENTEE BY ID
// ================================
exports.deleteMentee = async (req, res) => {
  try {
    const { menteeId } = req.params;
    
    if (!menteeId) {
      return res.status(400).json({
        success: false,
        message: "Mentee ID is required"
      });
    }
    
    console.log(`🗑️ Deleting mentee with ID: ${menteeId}`);
    
    // Find the mentee first to get details
    const mentee = await MenteeRequest.findById(menteeId);
    
    if (!mentee) {
      return res.status(404).json({
        success: false,
        message: "Mentee not found"
      });
    }
    
    // Check if mentee is assigned to any mentor
    const assignment = await MentorMenteeAssignment.findOne({
      mentee_user_ids: mentee.mentee_user_id
    });
    
    if (assignment) {
      // Remove mentee from assignment
      await MentorMenteeAssignment.updateOne(
        { _id: assignment._id },
        { $pull: { mentee_user_ids: mentee.mentee_user_id } }
      );
      console.log(`✅ Removed mentee from assignment ${assignment._id}`);
    }
    
    // Delete the mentee
    await MenteeRequest.findByIdAndDelete(menteeId);
    console.log(`✅ Mentee deleted successfully`);
    
    res.json({
      success: true,
      message: "Mentee deleted successfully"
    });
    
  } catch (err) {
    console.error("Error deleting mentee:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting mentee",
      error: err.message
    });
  }
};

// ================================
// DELETE MENTOR BY ID
// ================================
exports.deleteMentor = async (req, res) => {
  try {
    const { mentorId } = req.params;
    
    if (!mentorId) {
      return res.status(400).json({
        success: false,
        message: "Mentor ID is required"
      });
    }
    
    console.log(`🗑️ Deleting mentor with ID: ${mentorId}`);
    
    // Find the mentor first
    const mentor = await MentorRegistration.findById(mentorId);
    
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found"
      });
    }
    
    // Check if mentor has any assignments
    const assignment = await MentorMenteeAssignment.findOne({
      mentor_user_id: mentor.mentor_id
    });
    
    if (assignment) {
      // Delete the assignment completely
      await MentorMenteeAssignment.findByIdAndDelete(assignment._id);
      console.log(`✅ Deleted assignment for mentor`);
    }
    
    // Delete the mentor
    await MentorRegistration.findByIdAndDelete(mentorId);
    console.log(`✅ Mentor deleted successfully`);
    
    res.json({
      success: true,
      message: "Mentor deleted successfully"
    });
    
  } catch (err) {
    console.error("Error deleting mentor:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting mentor",
      error: err.message
    });
  }
};

// ================================
// DELETE MENTOR-MENTEE ASSIGNMENT BY ID
// ================================
exports.deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID is required"
      });
    }
    
    console.log(`🗑️ Deleting assignment with ID: ${assignmentId}`);
    
    // Find the assignment first
    const assignment = await MentorMenteeAssignment.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }
    
    // Update mentee status back to 'pending'
    await MenteeRequest.updateMany(
      {
        mentee_user_id: { $in: assignment.mentee_user_ids },
        phaseId: assignment.phaseId
      },
      {
        status: "pending",
        assignedMentorId: null,
        assignedDate: null
      }
    );
    console.log(`✅ Updated ${assignment.mentee_user_ids.length} mentees status to 'pending'`);
    
    // Update mentor status back to 'pending'
    await MentorRegistration.updateOne(
      {
        mentor_id: assignment.mentor_user_id,
        phaseId: assignment.phaseId
      },
      {
        status: "pending",
        assignedDate: null
      }
    );
    console.log(`✅ Updated mentor status to 'pending'`);
    
    // Delete the assignment
    await MentorMenteeAssignment.findByIdAndDelete(assignmentId);
    console.log(`✅ Assignment deleted successfully`);
    
    res.json({
      success: true,
      message: "Assignment deleted successfully. Mentor and mentees status reset to pending."
    });
    
  } catch (err) {
    console.error("Error deleting assignment:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting assignment",
      error: err.message
    });
  }
};

// ================================
// BULK DELETE MENTEES BY PHASE
// ================================
exports.deleteMenteesByPhase = async (req, res) => {
  try {
    const { phaseId } = req.params;
    
    if (!phaseId) {
      return res.status(400).json({
        success: false,
        message: "Phase ID is required"
      });
    }
    
    console.log(`🗑️ Deleting all mentees for phase: ${phaseId}`);
    
    // Find all mentees in this phase
    const mentees = await MenteeRequest.find({ phaseId: parseInt(phaseId) });
    
    // Get mentee IDs
    const menteeIds = mentees.map(m => m.mentee_user_id);
    
    // Remove these mentees from any assignments
    await MentorMenteeAssignment.updateMany(
      {},
      { $pull: { mentee_user_ids: { $in: menteeIds } } }
    );
    
    // Delete all mentees in this phase
    const result = await MenteeRequest.deleteMany({ phaseId: parseInt(phaseId) });
    
    console.log(`✅ Deleted ${result.deletedCount} mentees for phase ${phaseId}`);
    
    res.json({
      success: true,
      message: `${result.deletedCount} mentees deleted successfully for phase ${phaseId}`,
      deletedCount: result.deletedCount
    });
    
  } catch (err) {
    console.error("Error deleting mentees by phase:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting mentees",
      error: err.message
    });
  }
};

// ================================
// BULK DELETE MENTORS BY PHASE
// ================================
exports.deleteMentorsByPhase = async (req, res) => {
  try {
    const { phaseId } = req.params;
    
    if (!phaseId) {
      return res.status(400).json({
        success: false,
        message: "Phase ID is required"
      });
    }
    
    console.log(`🗑️ Deleting all mentors for phase: ${phaseId}`);
    
    // Find all mentors in this phase
    const mentors = await MentorRegistration.find({ phaseId: parseInt(phaseId) });
    
    // Get mentor IDs
    const mentorIds = mentors.map(m => m.mentor_id);
    
    // Delete assignments for these mentors
    await MentorMenteeAssignment.deleteMany({
      mentor_user_id: { $in: mentorIds }
    });
    
    // Delete all mentors in this phase
    const result = await MentorRegistration.deleteMany({ phaseId: parseInt(phaseId) });
    
    console.log(`✅ Deleted ${result.deletedCount} mentors for phase ${phaseId}`);
    
    res.json({
      success: true,
      message: `${result.deletedCount} mentors deleted successfully for phase ${phaseId}`,
      deletedCount: result.deletedCount
    });
    
  } catch (err) {
    console.error("Error deleting mentors by phase:", err);
    res.status(500).json({
      success: false,
      message: "Server error deleting mentors",
      error: err.message
    });
  }
};
