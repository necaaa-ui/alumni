// Test script to verify webinars API and member-by-email integration
const fetch = require('node-fetch');

async function testWebinarsAndMemberAPI() {
  try {
    console.log('Testing /api/webinars endpoint...');

    // Test webinars API
    const webinarsResponse = await fetch('http://localhost:5000/api/webinars');
    const webinars = await webinarsResponse.json();

    console.log(`Found ${webinars.length} webinars`);

    if (webinars.length > 0) {
      const firstWebinar = webinars[0];
      console.log('First webinar:', {
        topic: firstWebinar.topic,
        speaker: {
          name: firstWebinar.speaker?.name,
          email: firstWebinar.speaker?.email,
          department: firstWebinar.speaker?.department
        }
      });

      // Check if speaker email is populated
      if (firstWebinar.speaker?.email) {
        console.log('✅ Speaker email is populated:', firstWebinar.speaker.email);

        // Test member-by-email API with this email
        console.log('\nTesting member-by-email API...');
        const memberResponse = await fetch(`http://localhost:5000/api/member-by-email?email=${encodeURIComponent(firstWebinar.speaker.email)}`);
        const memberData = await memberResponse.json();

        console.log('Member lookup result:', memberData);

        if (memberData.found) {
          console.log('✅ Member found with batch:', memberData.batch);
          console.log('✅ Integration test PASSED');
        } else {
          console.log('❌ Member not found for email:', firstWebinar.speaker.email);
          console.log('❌ Integration test FAILED');
        }
      } else {
        console.log('❌ Speaker email is not populated');
        console.log('❌ Integration test FAILED - cannot test member lookup');
      }
    } else {
      console.log('❌ No webinars found to test');
    }

  } catch (error) {
    console.error('Error testing APIs:', error.message);
  }
}

// Run the test
testWebinarsAndMemberAPI();
