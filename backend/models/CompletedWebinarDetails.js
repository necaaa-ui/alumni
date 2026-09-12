const mongoose = require('mongoose');

const completedWebinarDetailsSchema = new mongoose.Schema(
  {
    webinarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webinar',
      required: true,
      unique: true,
    },

    // Keep existing fields for prize winners.
    // This collection is created automatically after first insert (Mongoose upsert).
    // If the collection is not visible in MongoDB, it usually means no document was inserted yet.


    // Attendance workbook (stored as base64 preview string for now)
    attendanceSheet: {
      type: String,
      default: '',
    },

    // Signed report copy (uploaded as base64 string)
    signedReport: {
      type: String,
      default: '',
    },

    signedReportName: {
      type: String,
      default: '',
    },

    // Event images thumbnails/paths (stored as array of strings for now)
    eventImages: {
      type: [String],
      default: [],
    },

    attendanceCount: {
      type: Number,
      default: 0,
    },

    prizeWinnerEmail: {
      type: String,
      default: '',
    },

    prizeWinnerName: {
      type: String,
      default: '',
    },

    prizeWinnerMobile: {
      type: String,
      default: '',
    },

    prizeWinnerDepartment: {
      type: String,
      default: '',
    },

    prizeWinnerBatch: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const CompletedWebinarDetails =
  mongoose.models.CompletedWebinarDetails ||
  mongoose.model('CompletedWebinarDetails', completedWebinarDetailsSchema);

module.exports = CompletedWebinarDetails;