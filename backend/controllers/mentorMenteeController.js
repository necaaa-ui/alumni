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
// GET ALL MENTORS FOR CURRENT PHASE (WITH ASSIGNMENT COUNT)
// ================================
exports.getMentors = async (req, res) => {
  try {
    const currentPhaseId = await getCurrentPhaseId();
    
    if (!currentPhaseId) {
      console.log("No current phase active. Returning empty mentors list.");
      return res.json([]);
    }
    
    console.log(`\n========== FETCHING MENTORS FOR PHASE: ${currentPhaseId} ==========`);
    
    // Get ALL mentors registered for current phase (both pending and assigned)
    const mentors = await MentorRegistration.find({ 
      phaseId: currentPhaseId
    });
    console.log(`Total mentors in phase ${currentPhaseId}: ${mentors.length}`);
    
    if (mentors.length === 0) {
      console.log(`No mentors found for phase ${currentPhaseId}`);
      return res.json([]);
    }
    
    const formatted = await Promise.all(
      mentors.map(async (m) => {
        const user = await User.findById(m.mentor_id);
        
        // Check existing assignment for this mentor in current phase
        const assignment = await MentorMenteeAssignment.findOne({
          mentor_user_id: m.mentor_id,
          phaseId: currentPhaseId
        });
        
        const assignedCount = assignment ? assignment.mentee_user_ids.length : 0;
        const isFullyAssigned = assignedCount >= 3;
        
        // Return ALL mentors with status information
        return {
          user_id: user?._id || m.mentor_id || null,
          name: user?.basic?.name || "Unknown Mentor",
          email: user?.basic?.email_id || "No email found",
          areas_of_interest: m.areas_of_interest || "Not specified",
          status: m.status || 'pending', // Include status from MentorRegistration
          assignedMentees: assignedCount,
          isFullyAssigned: isFullyAssigned,
          maxMentees: 3,
          availableSlots: Math.max(0, 3 - assignedCount)
        };
      })
    );
    
    // Filter out fully assigned mentors (those with 3 mentees)
    const availableMentors = formatted.filter(m => !m.isFullyAssigned);
    console.log(`Returning ${availableMentors.length} available mentors (${formatted.length - availableMentors.length} fully assigned)\n`);
    res.json(availableMentors);
    
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
    
    // Get all pending mentees for current phase (not yet assigned)
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
          status: m.status || 'pending'
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
// GET ALL MENTEES (INCLUDING ASSIGNED) FOR ADMIN VIEW
// ================================
exports.getAllMentees = async (req, res) => {
  try {
    const currentPhaseId = await getCurrentPhaseId();
    
    if (!currentPhaseId) {
      return res.json([]);
    }
    
    const mentees = await MenteeRequest.find({ 
      phaseId: currentPhaseId 
    });
    
    const formatted = await Promise.all(
      mentees.map(async (m) => {
        const user = await User.findById(m.mentee_user_id);
        return {
          user_id: user?._id || m.mentee_user_id,
          name: user?.basic?.name || "Unknown Mentee",
          email: user?.basic?.email_id || "No email",
          area_of_interest: m.area_of_interest || "Not specified",
          status: m.status || 'pending',
          assignedMentorId: m.assignedMentorId || null,
          assignedDate: m.assignedDate || null
        };
      })
    );
    
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching all mentees:", err);
    res.status(500).json({ message: "Server error fetching all mentees" });
  }
};

// ================================
// ASSIGN MENTOR (UPDATES EXISTING ASSIGNMENT)
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
    
    // Verify mentor exists (check if registered for this phase)
    const mentor = await MentorRegistration.findOne({
      mentor_id: mentor_user_id,
      phaseId: currentPhaseId
    });
    
    if (!mentor) {
      console.log(`❌ Mentor ${mentor_user_id} is not registered for this phase`);
      return res.status(400).json({
        success: false,
        message: "Mentor is not registered for this phase"
      });
    }
    
    // Check if mentor already has an assignment in this phase
    let existingAssignment = await MentorMenteeAssignment.findOne({
      mentor_user_id: mentor_user_id,
      phaseId: currentPhaseId
    });
    
    // Calculate current and new counts
    const currentMenteeCount = existingAssignment ? existingAssignment.mentee_user_ids.length : 0;
    const newMenteeCount = mentee_user_ids.length;
    const totalMentees = currentMenteeCount + newMenteeCount;
    
    // Check if adding these mentees would exceed 3
    if (totalMentees > 3) {
      console.log(`❌ Cannot assign ${newMenteeCount} mentees. Mentor already has ${currentMenteeCount} mentees.`);
      return res.status(400).json({
        success: false,
        message: `Cannot assign ${newMenteeCount} mentees. Mentor already has ${currentMenteeCount} mentee(s). Maximum is 3 mentees per mentor.`,
        currentMenteeCount: currentMenteeCount,
        maxMentees: 3,
        availableSlots: Math.max(0, 3 - currentMenteeCount)
      });
    }
    
    // Verify all mentees exist and are pending
    const mentees = await MenteeRequest.find({
      mentee_user_id: { $in: mentee_user_ids },
      phaseId: currentPhaseId,
      status: "pending"
    });
    
    if (mentees.length !== mentee_user_ids.length) {
      console.log(`❌ Some mentees are not available for assignment`);
      const foundMenteeIds = mentees.map(m => m.mentee_user_id.toString());
      const notFoundMentees = mentee_user_ids.filter(id => !foundMenteeIds.includes(id.toString()));
      console.log(`Not available mentees: ${notFoundMentees}`);
      return res.status(400).json({
        success: false,
        message: "Some mentees are already assigned or not registered",
        notAvailableMentees: notFoundMentees
      });
    }
    
    let savedAssignment;
    let isUpdate = false;
    let mentorStatusUpdated = false;
    let menteesStatusUpdated = [];
    
    if (existingAssignment) {
      // Update existing assignment - add new mentees
      isUpdate = true;
      console.log(`📝 Updating existing assignment. Current mentees: ${existingAssignment.mentee_user_ids.length}`);
      
      // Combine existing and new mentees, remove duplicates
      const allMenteeIds = [...existingAssignment.mentee_user_ids, ...mentee_user_ids];
      const uniqueMenteeIds = [...new Set(allMenteeIds.map(id => id.toString()))];
      
      existingAssignment.mentee_user_ids = uniqueMenteeIds;
      existingAssignment.assignedDate = new Date();
      savedAssignment = await existingAssignment.save();
      
      console.log(`✅ Assignment updated. New total mentees: ${savedAssignment.mentee_user_ids.length}`);
    } else {
      // Create new assignment
      const assignment = new MentorMenteeAssignment({
        mentor_user_id,
        mentee_user_ids,
        phaseId: currentPhaseId,
        assignedDate: new Date(),
      });
      
      savedAssignment = await assignment.save();
      console.log(`✅ New assignment created with ID: ${savedAssignment._id}`);
    }
    
    // Update mentor status based on total mentees
    const finalMenteeCount = savedAssignment.mentee_user_ids.length;
    let newStatus = "pending";
    let statusMessage = "";
    
    // If mentor has at least 1 mentee, set status to "assigned"
    if (finalMenteeCount >= 1) {
      newStatus = "assigned";
      mentorStatusUpdated = true;
      if (finalMenteeCount >= 3) {
        statusMessage = "Mentor fully assigned with 3 mentees";
      } else {
        statusMessage = `Mentor now has ${finalMenteeCount} mentee(s). ${3 - finalMenteeCount} slot(s) remaining.`;
      }
    } else {
      statusMessage = "Mentor has no mentees assigned";
    }
    
    // Update mentor status
    await MentorRegistration.updateOne(
      { 
        mentor_id: mentor_user_id,
        phaseId: currentPhaseId 
      },
      { 
        status: newStatus,
        assignedDate: new Date()
      }
    );
    console.log(`✅ Mentor status updated to '${newStatus}'`);
    
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
    
    // Get list of updated mentee IDs
    const updatedMentees = await MenteeRequest.find({
      mentee_user_id: { $in: mentee_user_ids },
      phaseId: currentPhaseId,
      status: "assigned"
    });
    menteesStatusUpdated = updatedMentees.map(m => m.mentee_user_id);
    
    console.log(`✅ Updated ${updateResult.modifiedCount} mentees status to 'assigned'`);
    console.log(`========== ASSIGNMENT COMPLETE ==========\n`);
    
    res.json({ 
      success: true, 
      message: isUpdate ? `Mentor updated: ${statusMessage}` : `Mentor assigned: ${statusMessage}`,
      phaseId: currentPhaseId,
      assignedMentorId: mentor_user_id,
      assignedMenteeIds: mentee_user_ids,
      totalMentees: finalMenteeCount,
      maxMentees: 3,
      assignmentId: savedAssignment._id,
      isFullyAssigned: finalMenteeCount >= 3,
      availableSlots: Math.max(0, 3 - finalMenteeCount),
      isUpdate: isUpdate,
      mentorStatusUpdated: mentorStatusUpdated,
      menteesStatusUpdated: menteesStatusUpdated,
      mentorNewStatus: newStatus
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
        const mentorReg = await MentorRegistration.findOne({
          mentor_id: assignment.mentor_user_id,
          phaseId: currentPhaseId
        });
        
        const mentees = await Promise.all(
          assignment.mentee_user_ids.map(async (menteeId) => {
            const mentee = await User.findById(menteeId);
            const menteeReq = await MenteeRequest.findOne({
              mentee_user_id: menteeId,
              phaseId: currentPhaseId
            });
            return {
              user_id: menteeId,
              name: mentee?.basic?.name || "Unknown",
              email: mentee?.basic?.email_id || "No email",
              status: menteeReq?.status || 'pending'
            };
          })
        );
        
        return {
          assignmentId: assignment._id,
          mentor: {
            user_id: assignment.mentor_user_id,
            name: mentor?.basic?.name || "Unknown Mentor",
            email: mentor?.basic?.email_id || "No email",
            status: mentorReg?.status || 'pending'
          },
          mentees: mentees,
          assignedDate: assignment.assignedDate,
          phaseId: assignment.phaseId,
          menteeCount: assignment.mentee_user_ids.length,
          isFullyAssigned: assignment.mentee_user_ids.length >= 3
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
          const menteeReq = await MenteeRequest.findOne({
            mentee_user_id: menteeId,
            phaseId: currentPhaseId
          });
          return {
            mentee_id: menteeId,
            name: mentee?.basic?.name || "Unknown Mentee",
            email: mentee?.basic?.email_id || "No email",
            status: menteeReq?.status || 'pending'
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
            const menteeReq = await MenteeRequest.findOne({
              mentee_user_id: menteeId,
              phaseId: assignment.phaseId
            });
            return {
              mentee_id: menteeId,
              name: mentee?.basic?.name || "Unknown Mentee",
              email: mentee?.basic?.email_id || "No email",
              status: menteeReq?.status || 'pending'
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

// ================================
// UPDATE MENTOR STATUS MANUALLY (IF NEEDED)
// ================================
exports.updateMentorStatus = async (req, res) => {
  try {
    const { mentor_id, phaseId, status } = req.body;
    
    if (!mentor_id || !phaseId || !status) {
      return res.status(400).json({
        success: false,
        message: "mentor_id, phaseId, and status are required"
      });
    }
    
    const validStatuses = ['pending', 'assigned', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }
    
    const result = await MentorRegistration.updateOne(
      { mentor_id, phaseId },
      { status, updatedAt: new Date() }
    );
    
    res.json({
      success: true,
      message: `Mentor status updated to '${status}'`,
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
  } catch (err) {
    console.error("Error updating mentor status:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating mentor status"
    });
  }
};

// ================================
// UPDATE MENTEE STATUS MANUALLY (IF NEEDED)
// ================================
exports.updateMenteeStatus = async (req, res) => {
  try {
    const { mentee_id, phaseId, status } = req.body;
    
    if (!mentee_id || !phaseId || !status) {
      return res.status(400).json({
        success: false,
        message: "mentee_id, phaseId, and status are required"
      });
    }
    
    const validStatuses = ['pending', 'assigned', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }
    
    const result = await MenteeRequest.updateOne(
      { mentee_user_id: mentee_id, phaseId },
      { status, updatedAt: new Date() }
    );
    
    res.json({
      success: true,
      message: `Mentee status updated to '${status}'`,
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
  } catch (err) {
    console.error("Error updating mentee status:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating mentee status"
    });
  }
};

// Debug log to confirm all functions are loaded
console.log("✅ mentorMenteeController loaded. Available functions:", {
  getMentors: typeof exports.getMentors,
  getMentees: typeof exports.getMentees,
  getAllMentees: typeof exports.getAllMentees,
  assignMentor: typeof exports.assignMentor,
  getAssignedMentors: typeof exports.getAssignedMentors,
  checkMentorAssignmentInCurrentPhase: typeof exports.checkMentorAssignmentInCurrentPhase,
  getMentorAssignmentDetails: typeof exports.getMentorAssignmentDetails,
  updateMentorStatus: typeof exports.updateMentorStatus,
  updateMenteeStatus: typeof exports.updateMenteeStatus
});