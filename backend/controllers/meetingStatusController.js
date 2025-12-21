const mongoose = require("mongoose");
const MeetingStatus = require("../models/MeetingStatus");
const User = require("../models/User");
const MentorMenteeAssignment = require("../models/MentorMenteeAssignment");

// ================================
// 1. FETCH MENTEES BY MENTOR EMAIL
// ================================
exports.getMenteesByMentor = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Mentor email required" });

    const mentor = await User.findOne({ "basic.email_id": email.trim().toLowerCase() });
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    const assignment = await MentorMenteeAssignment.findOne({ mentor_user_id: mentor._id });
    let assignedMentees = [];

    if (assignment?.mentee_user_ids?.length > 0) {
      assignedMentees = await User.find({ _id: { $in: assignment.mentee_user_ids } })
        .select("basic.name basic.email_id");
    }

    res.json({ assignedMentees });
  } catch (err) {
    console.error("GET MENTEES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// GET /api/meeting-status/mentee/by-email?email=<menteeEmail>
exports.getMenteeByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Mentee email required" });

    const mentee = await User.findOne({ "basic.email_id": email.trim().toLowerCase() })
      .select("_id basic.name basic.email_id");

    if (!mentee) return res.status(404).json({ message: "Mentee not found" });

    res.json({
      _id: mentee._id,
      name: mentee.basic?.name || "",
      email: mentee.basic?.email_id || ""
    });
  } catch (err) {
    console.error("GET MENTEE BY EMAIL ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ================================================
// 2. CREATE OR UPDATE MEETING STATUS (by meeting_id)
exports.updateMeetingStatus = async (req, res) => {
  try {
    const {
      mentorEmail,
      menteeId,
      menteeIds,
      meetingId,
      status,
      meetingMinutes,
      postponedReason
    } = req.body;

    if (!mentorEmail || (!menteeIds?.length && !menteeId) || !meetingId || !status) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const mentor = await User.findOne({
      "basic.email_id": mentorEmail.trim().toLowerCase()
    });
    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    const menteeArray = menteeIds?.length
      ? menteeIds
      : menteeId
      ? [menteeId]
      : [];

    const createdStatuses = [];

    for (const id of menteeArray) {
      if (!mongoose.Types.ObjectId.isValid(id)) continue;

      // Validation
      if (status === "Completed" && !meetingMinutes) {
        return res.status(400).json({
          message: "Meeting minutes required for completed status"
        });
      }

      if (status === "Postponed" && !postponedReason) {
        return res.status(400).json({
          message: "Postponed reason required for postponed status"
        });
      }

      // 👇 IMPORTANT LOGIC
      let finalMinutes = "";

      if (status === "Completed") {
        finalMinutes = meetingMinutes;
      }

      if (status === "Postponed") {
        finalMinutes = postponedReason; // 👈 store here
      }

      const updatedStatus = await MeetingStatus.findOneAndUpdate(
        { meeting_id: meetingId, mentee_user_id: id },
        {
          mentor_user_id: mentor._id,
          status,
          meeting_minutes: finalMinutes, // ✅ unified field
          statusApproval: "Pending"       // reset approval
        },
        { upsert: true, new: true }
      );

      createdStatuses.push(updatedStatus);
    }

    res.status(201).json({
      message: "Meeting status updated successfully",
      count: createdStatuses.length,
      statuses: createdStatuses
    });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateMeetingMinutes = async (req, res) => {
  try {
    const { statusId, minutes } = req.body;

    const status = await MeetingStatus.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });

    // Mentee updates minutes → Reset approval to Pending
    status.minutes = minutes;
    status.statusApproval = "Pending";  
    await status.save();

    res.json({ message: "Minutes updated and approval reset to pending" });
  } catch (err) {
    console.error("UPDATE MINUTES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// 3. GET ALL MEETING STATUSES
// ================================
exports.getAllMeetingStatuses = async (req, res) => {
  try {
    const statuses = await MeetingStatus.find().sort({ createdAt: -1 });

    const populated = await Promise.all(
      statuses.map(async (status) => {
        const mentor = await User.findById(status.mentor_user_id).select("basic.name basic.email_id");
        const mentee = await User.findById(status.mentee_user_id).select("basic.name basic.email_id");
        return {
          ...status.toObject(),
          mentor_user: mentor,
          mentee_user: mentee
        };
      })
    );

    res.json({ statuses: populated });
  } catch (err) {
    console.error("GET ALL STATUSES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// ==================================================
// 4. GET MEETING STATUS BY MEETING ID
// ==================================================
exports.getMeetingStatusByMeetingId = async (req, res) => {
  try {
    const { meetingId, menteeId } = req.query;
    if (!meetingId || !menteeId) {
      return res.status(400).json({ message: "Required params missing" });
    }

    const statuses = await MeetingStatus.find({
      meeting_id: meetingId,
      mentee_user_id: menteeId
    });

    const populated = await Promise.all(
      statuses.map(async (status) => {
        const mentor = await User.findById(status.mentor_user_id).select("basic.name basic.email_id");
        const mentee = await User.findById(status.mentee_user_id).select("basic.name basic.email_id");
        return {
          ...status.toObject(),
          mentor_user: mentor,
          mentee_user: mentee
        };
      })
    );

    res.json({ statuses: populated });
  } catch (err) {
    console.error("GET STATUS BY MEETING ID ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// 5. APPROVE OR REJECT STATUS
// ================================
exports.updateStatusApproval = async (req, res) => {
  try {
    const { statusId, action } = req.body;
    if (!statusId || !["Approved", "Rejected"].includes(action)) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const status = await MeetingStatus.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });

    status.statusApproval = action;
    await status.save();

    res.json({ message: `Status ${action.toLowerCase()} successfully` });
  } catch (err) {
    console.error("STATUS APPROVAL ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
