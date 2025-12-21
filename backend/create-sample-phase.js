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

async function createSamplePhase() {
  try {
    // Create a sample phase that covers the current date
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // Start of current month
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0); // End of next 3 months

    const samplePhase = {
      phaseId: 6,
      startingDate: startDate,
      endingDate: endDate,
      domains: [
        { department: 'CSE', domain: 'Full Stack Development (IT department)' },
        { department: 'CSE', domain: 'Cloud Computing (CSE department)' },
        { department: 'ECE', domain: 'Embedded Systems (ECE department)' },
        { department: 'MECH', domain: 'Robotic and Automation (MECH department)' },
        { department: 'EEE', domain: 'Electrical Power System (EEE department)' },
        { department: 'CIVIL', domain: 'Structural Engineering (CIVIL department)' },
        { department: 'AI & DS', domain: 'Artificial Intelligence & Data Science (AI & DS department)' }
      ]
    };

    const existingPhase = await WebinarPhase.findOne({ phaseId: 6 });
    if (existingPhase) {
      console.log('Phase 6 already exists, updating...');
      await WebinarPhase.findOneAndUpdate({ phaseId: 6 }, samplePhase, { new: true });
      console.log('Phase 6 updated successfully');
    } else {
      const newPhase = new WebinarPhase(samplePhase);
      await newPhase.save();
      console.log('Phase 6 created successfully');
    }

    console.log('Sample phase details:', samplePhase);
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample phase:', error);
    process.exit(1);
  }
}

createSamplePhase();
