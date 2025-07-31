// Simple script to check JavaScript syntax
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'ProjectDashboard', 'DashboardV2.jsx');

try {
  // Try to require the file to check for syntax errors
  require(filePath);
  console.log('No syntax errors found in DashboardV2.jsx');
} catch (error) {
  console.error('Syntax error in DashboardV2.jsx:');
  console.error(error.message);
  process.exit(1);
}
