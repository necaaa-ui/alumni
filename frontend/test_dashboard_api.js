const fetch = require('node-fetch');

async function testDashboardStatsAPI() {
  try {
    console.log('Testing /api/dashboard-stats endpoint for Phase 6...');
    const response = await fetch('http://localhost:5000/api/dashboard-stats?phase=Phase 6');
    const data = await response.json();

    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.months && data.domains) {
      console.log('✅ API returned expected structure');
      console.log('Months:', data.months);
      console.log('Number of domains:', data.domains.length);
      data.domains.forEach((domain, index) => {
        console.log(`Domain ${index + 1}: ${domain.name} - Planned: ${domain.planned}, Conducted: ${domain.conducted}, Total Speakers: ${domain.totalSpeakers}, New Speakers: ${domain.newSpeakers}`);
      });
    } else {
      console.log('❌ API did not return expected structure');
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

// Run the test
testDashboardStatsAPI();
