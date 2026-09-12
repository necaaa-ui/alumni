
const mongoose = require('mongoose');

const completedWebinarDocumentsSchema = new mongoose.Schema(
  {
    webinarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webinar',
      required: true,
      unique: true,
    },

    // Attendance sheet (sent as base64 string from frontend)
    attendanceSheet: {
      type: String,
      default: '',
    },

    // Signed report copy (uploaded file as base64 string)
    signedReport: {
      type: String,
      default: '',
    },

    signedReportName: {
      type: String,
      default: '',
    },

    // Event images (array of base64 strings)
    eventImages: {
      type: [String],
      default: [],
    },

    attendanceCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const CompletedWebinarDocuments =
  mongoose.models.CompletedWebinarDocuments ||
  mongoose.model('CompletedWebinarDocuments', completedWebinarDocumentsSchema);

module.exports = CompletedWebinarDocuments;
