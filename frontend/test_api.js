// Simple test script to verify the API changes
const fetch = require('node-fetch');

async function testNamesAPI() {
  try {
    console.log('Testing /api/names endpoint...');
    const response = await fetch('http://localhost:5000/api/names');
    const data = await response.json();

    console.log('API Response:', data);

    // Check if the response is an array of objects with name and email
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (firstItem.name && firstItem.email) {
        console.log('✅ API format is correct: {name, email}');
        console.log('Sample data:', firstItem);
      } else {
        console.log('❌ API format is incorrect. Expected {name, email}');
      }
    } else {
      console.log('❌ API did not return expected array format');
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

// Run the test
testNamesAPI();
