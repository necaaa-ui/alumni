const mongoose = require('mongoose');
const MemberSchema = require('./backend/models/Member');
require('dotenv').config();

async function testMemberData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Member = mongoose.model('Member', MemberSchema, 'members');
    const members = await Member.find({}, 'basic.email_id contact_details').limit(5);

    console.log('Sample member data:');
    members.forEach((member, index) => {
      console.log(`Member ${index + 1}:`);
      console.log('  Email:', member.basic?.email_id);
      console.log('  Full contact_details:', JSON.stringify(member.contact_details, null, 2));
      console.log('  Direct mobile:', member.contact_details?.mobile);
      console.log('  Direct phone:', member.contact_details?.phone);
      console.log('  Top level mobile:', member.mobile);
      console.log('  Top level phone:', member.phone);
      console.log('  Top level contact:', member.contact);
      console.log('---');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testMemberData();
