const express = require('express');
const router = express.Router();

// POST endpoint to register for a webinar
router.post('/register', async (req, res) => {
  try {
    const { email, webinarId, phaseId } = req.body;

    // Validate required fields
    if (!email || !webinarId || !phaseId) {
      return res.status(400).json({ error: 'Email, webinarId, and phaseId are required' });
    }

    // Check if already registered
    const Register = req.app.locals.Register;
    const existingRegistration = await Register.findOne({ email, webinarId });
    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered for this webinar' });
    }

    // Create new registration
    const newRegistration = new Register({
      email,
      webinarId,
      phaseId
    });

    // Save to database
    await newRegistration.save();

    res.status(201).json({ message: 'Registration successful' });

  } catch (error) {
    console.error('Error registering for webinar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to get registrations for a webinar
router.get('/registrations/:webinarId', async (req, res) => {
  try {
    const { webinarId } = req.params;
    const Register = req.app.locals.Register;
    const registrations = await Register.find({ webinarId }).sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to get registrations for a user
router.get('/registrations/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const Register = req.app.locals.Register;
    const registrations = await Register.find({ email }).sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
