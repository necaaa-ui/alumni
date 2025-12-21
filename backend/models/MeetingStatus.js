const mentorshipDB = require("../config/mentorshipDB");
const mongoose = require("mongoose");

const meetingStatusSchema = new mongoose.Schema({
  meeting_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MeetingSchedule",
    required: true, // track status per specific meeting
  },
  mentor_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  mentee_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["Scheduled", "Completed", "Postponed", "Cancelled", "In Progress"],
    required: true,
    default: "Scheduled",
  },
  meeting_minutes: {
    type: String,
    default: "",
  },
  postponed_reason: {
    type: String,
    default: "",
  },
  statusApproval: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending", // approval workflow
  },
}, { timestamps: true });

module.exports = mentorshipDB.model("MeetingStatus", meetingStatusSchema);
