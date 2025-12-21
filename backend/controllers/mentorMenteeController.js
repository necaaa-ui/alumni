// controllers/mentorMenteeController.js
const MentorRegistration = require("../models/MentorRegistration");
const MenteeRequest = require("../models/MenteeRequest");
const MentorMenteeAssignment = require("../models/MentorMenteeAssignment");
const User = require("../models/User");

// ================================
// GET ALL MENTORS
// ================================
exports.getMentors = async (req, res) => {
  try {
    const mentors = await MentorRegistration.find();
    console.log("MentorRegistration records:", mentors);

    const formatted = await Promise.all(
      mentors.map(async (m) => {
        const user = await User.findById(m.mentor_id);
        console.log("Looking up User for mentor_id:", m.mentor_id, "=>", user);

        return {
          user_id: user?._id || m.mentor_id || null,
          name: user?.basic?.name || "Unknown Mentor",
          email: user?.basic?.email_id || "No email found",
          areas_of_interest: m.areas_of_interest || "Not specified",
        };
      })
    );

    console.log("Final Mentors Sent to Frontend:", formatted);
    res.json(formatted);

  } catch (err) {
    console.error("Error fetching mentors:", err);
    res.status(500).json({ message: "Server error fetching mentors" });
  }
};


// ================================
// GET ALL PENDING MENTEES
// ================================
exports.getMentees = async (req, res) => {
  try {
    const mentees = await MenteeRequest.find({ status: "pending" });

    // Get already assigned mentees
    const assigned = await MentorMenteeAssignment.find();
    const assignedIds = assigned.flatMap(a => a.mentee_user_ids.map(id => id.toString()));

    const formatted = await Promise.all(
      mentees.map(async (m) => {
        const user = await User.findById(m.mentee_user_id);

        return {
          user_id: user?._id || m.mentee_user_id,
          name: user?.basic?.name || "Unknown Mentee",
          email: user?.basic?.email_id || "No email",
          area_of_interest: m.area_of_interest || "Not specified",
          assigned: assignedIds.includes(m.mentee_user_id.toString())
        };
      })
    );

    // Only send mentees that are NOT assigned already
    res.json(formatted.filter(m => !m.assigned));

  } catch (err) {
    res.status(500).json({ message: "Server error fetching mentees" });
  }
};



// ================================
// ASSIGN MENTOR (UPDATED)
// ================================
exports.assignMentor = async (req, res) => {
  try {
    const { mentor_user_id, mentee_user_ids } = req.body;

    if (!mentor_user_id || !mentee_user_ids || mentee_user_ids.length === 0) {
      return res.status(400).json({ message: "Mentor and at least one mentee required" });
    }

    const assignment = new MentorMenteeAssignment({
      mentor_user_id,
      mentee_user_ids
      // Removed commencement_date & end_date
    });

    await assignment.save();

    res.status(201).json({
      success: true,
      message: "Mentor assigned successfully",
    });

  } catch (err) {
    console.error("Error assigning mentor:", err);
    res.status(500).json({ message: "Server error assigning mentor" });
  }
};
