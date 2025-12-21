const axios = require('axios');

async function testFeedbackEndpoints() {
  console.log('Testing feedback endpoints...\n');

  try {
    console.log('1. Testing student feedback endpoint...');
    const studentResponse = await axios.get('http://localhost:5000/api/student-feedback');
    console.log(`✓ Student feedback endpoint works: ${studentResponse.data.length} items`);
    if (studentResponse.data.length > 0) {
      console.log('Sample student feedback item:');
      console.log(JSON.stringify(studentResponse.data[0], null, 2));
    }
  } catch (e) {
    console.log('✗ Student feedback endpoint error:', e.message);
  }

  try {
    console.log('\n2. Testing alumni feedback endpoint...');
    const alumniResponse = await axios.get('http://localhost:5000/api/feedbacks');
    console.log(`✓ Alumni feedback endpoint works: ${alumniResponse.data.length} items`);
    if (alumniResponse.data.length > 0) {
      console.log('Sample alumni feedback item:');
      console.log(JSON.stringify(alumniResponse.data[0], null, 2));
    }
  } catch (e) {
    console.log('✗ Alumni feedback endpoint error:', e.message);
  }

  try {
    console.log('\n3. Testing alumni feedback by webinar topic...');
    const alumniByTopicResponse = await axios.get('http://localhost:5000/api/alumni-feedback/webinar/Test%20Webinar');
    console.log(`✓ Alumni feedback by topic endpoint works: ${alumniByTopicResponse.data.length} items`);
  } catch (e) {
    console.log('✗ Alumni feedback by topic endpoint error:', e.message);
  }
}

testFeedbackEndpoints().catch(console.error);
