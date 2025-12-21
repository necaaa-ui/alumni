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

const StudentRequestFormSchema = new mongoose.Schema({
  email: { type: String, required: true },
  domain: { type: String, required: true },
  topic: { type: String, required: true },
  reason: { type: String, required: true },
  phaseId: { type: Number, required: true }
}, { timestamps: true });

const StudentRequestForm = mongoose.model('StudentRequestForm', StudentRequestFormSchema, 'StudentRequestForm');

async function checkPhases() {
  try {
    console.log('Checking WebinarPhase collection:');
    const phases = await WebinarPhase.find({}).sort({ phaseId: 1 });
    console.log('Found phases:', phases.map(p => ({ phaseId: p.phaseId, startingDate: p.startingDate, endingDate: p.endingDate })));

    console.log('\nChecking StudentRequestForm collection:');
    const requests = await StudentRequestForm.find({}, 'phaseId domain topic').sort({ phaseId: 1 });
    console.log('Found requests:', requests.map(r => ({ phaseId: r.phaseId, domain: r.domain, topic: r.topic })));

    // Check phaseId distribution
    const phaseIds = [...new Set(requests.map(r => r.phaseId))];
    console.log('\nUnique phaseIds in StudentRequestForm:', phaseIds);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPhases();
