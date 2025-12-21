const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI.replace('/test?', '/webinar?'));

const WebinarPhaseSchema = new mongoose.Schema({
  phaseId: { type: Number, required: true, unique: true },
  startingDate: { type: Date, required: true },
  endingDate: { type: Date, required: true },
  domains: [{ department: { type: String, required: true }, domain: { type: String, required: true } }]
}, { timestamps: true });

const WebinarPhase = mongoose.model('WebinarPhase', WebinarPhaseSchema, 'webinarphase');

async function checkDuplicates() {
  try {
    console.log('Checking for duplicates in WebinarPhase collection:');
    const phases = await WebinarPhase.find({}).sort({ phaseId: 1 });
    console.log('All phases:', phases.map(p => p.phaseId));

    const phaseIds = phases.map(p => p.phaseId);
    const uniquePhaseIds = [...new Set(phaseIds)];
    console.log('Unique phaseIds:', uniquePhaseIds);

    if (phaseIds.length !== uniquePhaseIds.length) {
      console.log('Duplicates found!');
      const duplicates = phaseIds.filter((id, index) => phaseIds.indexOf(id) !== index);
      console.log('Duplicate phaseIds:', duplicates);
    } else {
      console.log('No duplicates found.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDuplicates();
