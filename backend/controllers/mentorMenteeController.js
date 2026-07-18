// controllers/mentorMenteeController.js
const MentorRegistration = require("../models/MentorRegistration");
const MenteeRequest = require("../models/MenteeRequest");
const MentorMenteeAssignment = require("../models/MentorMenteeAssignment");
const User = require("../models/User");
const Phase = require("../models/Phase"); 

const getCurrentPhaseId = async () => {
  try {
    const today = new Date();
    const currentPhase = await Phase.findOne({
      startDate: { $lte: today },
      endDate: { $gte: today }
    });
    
    if (currentPhase) {
      console.log(`Current active phase found: ${currentPhase.phaseId} (${currentPhase.name})`);
      return currentPhase.phaseId;
    } else {
      console.log("No active phase found for today's date");
      return null;
    }
  } catch (err) {
    console.error("Error getting current phase:", err);
    return null;
  }
};

// ================================
// GET ALL MENTORS FOR CURRENT PHASE - NEVER HIDE ANY MENTOR
// ================================
exports.getMentors = async (req, res) => {
  try {
    const currentPhaseId = await getCurrentPhaseId();
    
    if (!currentPhaseId) {
      console.log("No current phase active. Returning empty mentors list.");
      return res.json([]);
    }
    
    console.log(`\n========== FETCHING ALL MENTORS FOR PHASE: ${currentPhaseId} ==========`);
    
    // Get ALL mentors registered for current phase - NO FILTERS AT ALL
    const mentors = await MentorRegistration.find({ 
      phaseId: currentPhaseId
      // REMOVED: ALL filters including status
    });
    console.log(`Total mentors in phase ${currentPhaseId}: ${mentors.length}`);
    
    if (mentors.length === 0) {
      console.log(`No mentors found for phase ${currentPhaseId}`);
      return res.json([]);
    }
    
    // Get all mentors with their assignment count
    const allMentors = [];
    
    for (const mentor of mentors) {
      // Count how many mentees this mentor has been assigned in current phase
      const existingAssignments = await MentorMenteeAssignment.find({
        mentor_user_id: mentor.mentor_id,
        phaseId: currentPhaseId
      });
      
      // Calculate total mentees assigned to this mentor
      let totalAssignedMentees = 0;
      for (const assignment of existingAssignments) {
        totalAssignedMentees += assignment.mentee_user_ids.length;
      }
      
      console.log(`Mentor ${mentor.mentor_id} has ${totalAssignedMentees} mentees assigned`);
      
      const user = await User.findById(mentor.mentor_id);
      
      // ALWAYS include the mentor regardless of assignments
      allMentors.push({
        user_id: user?._id || mentor.mentor_id || null,
        name: user?.basic?.name || "Unknown Mentor",
        email: user?.basic?.email_id || "No email found",
        areas_of_interest: mentor.areas_of_interest || "Not specified",
        assignedMenteeCount: totalAssignedMentees
      });
    }
    
    console.log(`Returning ALL ${allMentors.length} mentors (including those with assignments)\n`);
    res.json(allMentors);
    
  } catch (err) {
    console.error("Error fetching mentors:", err);
    res.status(500).json({ message: "Server error fetching mentors" });
  }
};

// ================================
// GET ALL PENDING MENTEES FOR CURRENT PHASE (NOT YET ASSIGNED)
// ================================
exports.getMentees = async (req, res) => {
  try {
    const currentPhaseId = await getCurrentPhaseId();
    
    if (!currentPhaseId) {
      console.log("No current phase active. Returning empty mentees list.");
      return res.json([]);
    }
    
    console.log(`\n========== FETCHING MENTEES FOR PHASE: ${currentPhaseId} ==========`);
    
    // Get all pending mentees for current phase
    const mentees = await MenteeRequest.find({ 
      status: "pending",
      phaseId: currentPhaseId 
    });
    console.log(`Total pending mentees in phase ${currentPhaseId}: ${mentees.length}`);
    
    const formatted = await Promise.all(
      mentees.map(async (m) => {
        const user = await User.findById(m.mentee_user_id);
        
        return {
          user_id: user?._id || m.mentee_user_id,
          name: user?.basic?.name || "Unknown Mentee",
          email: user?.basic?.email_id || "No email",
          area_of_interest: m.area_of_interest || "Not specified",
          status: m.status
        };
      })
    );
    
    console.log(`Returning ${formatted.length} pending mentees\n`);
    res.json(formatted);
    
  } catch (err) {
    console.error("Error fetching mentees:", err);
    res.status(500).json({ message: "Server error fetching mentees" });
  }
};

// ================================
// ASSIGN MENTOR
// ================================
exports.assignMentor = async (req, res) => {
  try {
    const { mentor_user_id, mentee_user_ids, phaseId } = req.body;
    
    console.log(`\n========== ASSIGNING MENTOR ==========`);
    console.log(`Mentor ID: ${mentor_user_id}`);
    console.log(`Mentee IDs: ${mentee_user_ids}`);
    
    // Get current phase ID
    let currentPhaseId = phaseId;
    if (!currentPhaseId) {
      currentPhaseId = await getCurrentPhaseId();
    }
    
    if (!currentPhaseId) {
      console.log('❌ No active phase found');
      return res.status(400).json({ 
        success: false,
        message: "Cannot assign mentor: No active phase found" 
      });
    }
    
    console.log(`Using Phase ID: ${currentPhaseId}`);
    
    // Check if mentor exists (NO status check)
    const mentor = await MentorRegistration.findOne({
      mentor_id: mentor_user_id,
      phaseId: currentPhaseId
    });
    
    if (!mentor) {
      console.log(`❌ Mentor ${mentor_user_id} not found`);
      return res.status(400).json({
        success: false,
        message: "Mentor not found for this phase"
      });
    }
    
    console.log(`✅ Mentor found: ${mentor.mentor_id}`);
    
    // Verify all mentees exist and are pending
    const mentees = await MenteeRequest.find({
      mentee_user_id: { $in: mentee_user_ids },
      phaseId: currentPhaseId,
      status: "pending"
    });
    
    if (mentees.length !== mentee_user_ids.length) {
      console.log(`❌ Some mentees are not available for assignment`);
      return res.status(400).json({
        success: false,
        message: "Some mentees are already assigned or not registered"
      });
    }
    
    // Create assignment
    const assignment = new MentorMenteeAssignment({
      mentor_user_id,
      mentee_user_ids,
      phaseId: currentPhaseId,
      assignedDate: new Date(),
    });
    
    const savedAssignment = await assignment.save();
    console.log(`✅ Assignment saved successfully with ID: ${savedAssignment._id}`);
    
    // Update mentee status to 'assigned'
    const updateResult = await MenteeRequest.updateMany(
      { 
        mentee_user_id: { $in: mentee_user_ids },
        phaseId: currentPhaseId 
      },
      { 
        status: "assigned",
        assignedMentorId: mentor_user_id,
        assignedDate: new Date()
      }
    );
    console.log(`✅ Updated ${updateResult.modifiedCount} mentees status to 'assigned'`);
    
    console.log(`========== ASSIGNMENT COMPLETE ==========\n`);
    
    res.json({ 
      success: true, 
      message: "Mentor assigned successfully",
      phaseId: currentPhaseId,
      assignedMentorId: mentor_user_id,
      assignedMenteeIds: mentee_user_ids,
      assignmentId: savedAssignment._id
    });
    
  } catch (err) {
    console.error("Error assigning mentor:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error assigning mentor",
      error: err.message 
    });
  }
};

// ================================
// GET ASSIGNED MENTORS FOR CURRENT PHASE
// ================================
exports.getAssignedMentors = async (req, res) => {
  try {
    const currentPhaseId = await getCurrentPhaseId();
    
    if (!currentPhaseId) {
      return res.json([]);
    }
    
    const assignments = await MentorMenteeAssignment.find({ 
      phaseId: currentPhaseId 
    });
    
    const formatted = await Promise.all(
      assignments.map(async (assignment) => {
        const mentor = await User.findById(assignment.mentor_user_id);
        const mentees = await Promise.all(
          assignment.mentee_user_ids.map(async (menteeId) => {
            const mentee = await User.findById(menteeId);
            return {
              user_id: menteeId,
              name: mentee?.basic?.name || "Unknown",
              email: mentee?.basic?.email_id || "No email"
            };
          })
        );
        
        return {
          assignmentId: assignment._id,
          mentor: {
            user_id: assignment.mentor_user_id,
            name: mentor?.basic?.name || "Unknown Mentor",
            email: mentor?.basic?.email_id || "No email"
          },
          mentees: mentees,
          assignedDate: assignment.assignedDate,
          phaseId: assignment.phaseId
        };
      })
    );
    
    res.json(formatted);
    
  } catch (err) {
    console.error("Error fetching assigned mentors:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// CHECK IF MENTOR IS ASSIGNED IN CURRENT PHASE (BY OBJECT ID)
// ================================
exports.checkMentorAssignmentInCurrentPhase = async (req, res) => {
  try {
    const { mentorObjectId } = req.params;
    
    if (!mentorObjectId) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor ObjectId is required" 
      });
    }
    
    console.log(`\n========== CHECKING MENTOR ASSIGNMENT IN CURRENT PHASE ==========`);
    console.log(`Mentor ObjectId: ${mentorObjectId}`);
    
    // Get current active phase
    const currentPhaseId = await getCurrentPhaseId();
    
    if (!currentPhaseId) {
      console.log("No active phase found");
      return res.json({ 
        success: true, 
        isAssigned: false,
        message: "No active phase found for assignment",
        mentorObjectId: mentorObjectId,
        currentPhaseId: null,
        assignment: null
      });
    }
    
    console.log(`Current phase ID: ${currentPhaseId}`);
    
    // Check if mentor is assigned in the CURRENT phase only
    const assignment = await MentorMenteeAssignment.findOne({
      mentor_user_id: mentorObjectId,
      phaseId: currentPhaseId
    });
    
    const isAssigned = !!assignment;
    
    console.log(`Mentor ${mentorObjectId} is ${isAssigned ? 'ALREADY ASSIGNED ✅' : 'NOT ASSIGNED ❌'} in current phase ${currentPhaseId}`);
    
    if (isAssigned && assignment) {
      console.log(`Assignment details:`);
      console.log(`  - Assignment ID: ${assignment._id}`);
      console.log(`  - Assigned mentees: ${assignment.mentee_user_ids.length}`);
      console.log(`  - Assigned date: ${assignment.assignedDate}`);
      
      // Get mentee details
      const menteeDetails = await Promise.all(
        assignment.mentee_user_ids.map(async (menteeId) => {
          const mentee = await User.findById(menteeId);
          return {
            mentee_id: menteeId,
            name: mentee?.basic?.name || "Unknown Mentee",
            email: mentee?.basic?.email_id || "No email"
          };
        })
      );
      
      return res.json({ 
        success: true, 
        isAssigned: true,
        message: "Mentor is already assigned in the current phase",
        mentorObjectId: mentorObjectId,
        currentPhaseId: currentPhaseId,
        assignment: {
          assignmentId: assignment._id,
          assignedMentees: menteeDetails,
          assignedDate: assignment.assignedDate,
          menteeCount: assignment.mentee_user_ids.length
        }
      });
    }
    
    res.json({ 
      success: true, 
      isAssigned: false,
      message: "Mentor is not assigned in the current phase",
      mentorObjectId: mentorObjectId,
      currentPhaseId: currentPhaseId,
      assignment: null
    });
    
  } catch (err) {
    console.error("Error checking mentor assignment:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error checking mentor assignment",
      error: err.message 
    });
  }
};

// ================================
// GET MENTOR ASSIGNMENT DETAILS BY OBJECT ID
// ================================
exports.getMentorAssignmentDetails = async (req, res) => {
  try {
    const { mentorObjectId } = req.params;
    
    if (!mentorObjectId) {
      return res.status(400).json({ 
        success: false, 
        message: "Mentor ObjectId is required" 
      });
    }
    
    console.log(`\n========== FETCHING MENTOR ASSIGNMENT DETAILS ==========`);
    console.log(`Mentor ObjectId: ${mentorObjectId}`);
    
    // Get current active phase
    const currentPhaseId = await getCurrentPhaseId();
    
    // Find all assignments for this mentor
    const assignments = await MentorMenteeAssignment.find({
      mentor_user_id: mentorObjectId
    });
    
    if (assignments.length === 0) {
      return res.json({
        success: true,
        hasAssignments: false,
        message: "No assignments found for this mentor",
        mentorObjectId: mentorObjectId,
        assignments: []
      });
    }
    
    // Get detailed assignment information
    const assignmentDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const isCurrentPhase = currentPhaseId === assignment.phaseId;
        
        const menteeDetails = await Promise.all(
          assignment.mentee_user_ids.map(async (menteeId) => {
            const mentee = await User.findById(menteeId);
            return {
              mentee_id: menteeId,
              name: mentee?.basic?.name || "Unknown Mentee",
              email: mentee?.basic?.email_id || "No email"
            };
          })
        );
        
        return {
          assignmentId: assignment._id,
          phaseId: assignment.phaseId,
          isCurrentPhase: isCurrentPhase,
          assignedMentees: menteeDetails,
          assignedDate: assignment.assignedDate,
          menteeCount: assignment.mentee_user_ids.length
        };
      })
    );
    
    console.log(`Found ${assignments.length} assignment(s) for mentor`);
    
    res.json({
      success: true,
      hasAssignments: true,
      mentorObjectId: mentorObjectId,
      currentPhaseId: currentPhaseId,
      totalAssignments: assignments.length,
      assignments: assignmentDetails
    });
    
  } catch (err) {
    console.error("Error fetching mentor assignment details:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching mentor assignment details",
      error: err.message 
    });
  }
};

// Debug log to confirm all functions are loaded
console.log("✅ mentorMenteeController loaded. Available functions:", {
  getMentors: typeof exports.getMentors,
  getMentees: typeof exports.getMentees,
  assignMentor: typeof exports.assignMentor,
  getAssignedMentors: typeof exports.getAssignedMentors,
  checkMentorAssignmentInCurrentPhase: typeof exports.checkMentorAssignmentInCurrentPhase,
  getMentorAssignmentDetails: typeof exports.getMentorAssignmentDetails
});