const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI.replace('/test?', '/webinar?'));

const TopicApprovalSchema = new mongoose.Schema({
  domain: { type: String, required: true },
  topic: { type: String, required: true },
  total_requested: { type: Number, required: true },
  approval: { type: String, enum: ['Approved', 'On Hold', 'Rejected'], default: 'On Hold' },
  phaseId: { type: Number, required: true }
}, { timestamps: true });

const TopicApproval = mongoose.model('TopicApproval', TopicApprovalSchema, 'TopicApproval');

async function cleanupDuplicates() {
  try {
    // Find all topic approvals for phaseId 6
    const approvals = await TopicApproval.find({ phaseId: 6 });
    console.log('Found', approvals.length, 'approvals for phase 6');

    if (approvals.length > 1) {
      // Keep the first one and delete the rest
      const toDelete = approvals.slice(1).map(a => a._id);
      await TopicApproval.deleteMany({ _id: { $in: toDelete } });
      console.log('Deleted', toDelete.length, 'duplicate approvals');
    }

    const remaining = await TopicApproval.find({ phaseId: 6 });
    console.log('Remaining approvals:', remaining.length);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupDuplicates();
