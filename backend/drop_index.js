require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndex() {
  try {
    const mongoURI = process.env.MONGO_URI.replace('/test?', '/webinar?');
    await mongoose.connect(mongoURI);
    const db = mongoose.connection.db;
    const collection = db.collection('speakers');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    const emailIndex = indexes.find(idx => idx.name === 'email_1');
    if (emailIndex) {
      await collection.dropIndex('email_1');
      console.log('Dropped email unique index');
    } else {
      console.log('No email unique index found');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropIndex();
