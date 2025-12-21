// Simple test script to verify the member-by-email API
const fetch = require('node-fetch');

async function testMemberByEmailAPI() {
  try {
    console.log('Testing /api/member-by-email endpoint...');

    // Test with a sample email - you'll need to replace this with a real email from your database
    const testEmail = 'test@example.com'; // Replace with actual email

    const response = await fetch(`http://localhost:5000/api/member-by-email?email=${encodeURIComponent(testEmail)}`);
    const data = await response.json();

    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.found) {
      console.log('✅ Member found');
      console.log('Name:', data.name);
      console.log('Contact:', data.contact_no);
      console.log('Department:', data.department);
    } else {
      console.log('❌ Member not found');
    }

  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

// Run the test
testMemberByEmailAPI();
