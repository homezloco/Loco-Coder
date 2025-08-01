const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const API_DIR = path.join(SRC_DIR, 'services', 'api');

// Files to exclude
const EXCLUDED_FILES = [
  'node_modules',
  '.next',
  '.git',
  'build',
  'dist',
  'coverage',
  '__tests__',
  'test',
  'mocks',
  'stories',
  'cypress',
  'e2e',
  'scripts',
  'public',
  'api', // Exclude API directory itself to avoid modifying source files
];

// File extensions to process
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Import patterns to update
const IMPORT_PATTERNS = {
  // Old: import api from 'services/api';
  // New: import api from 'services/api/new-index';
  "from ['"]@?\/?services\/api['"]": "from '$1@/services/api/new-index$2'",
  
  // Old: import { auth } from 'services/api';
  // New: import { authService as auth } from 'services/api/new-index';
  "import\s*\{\s*auth\s*\}\s*from\s*['"]@?\/?services\/api['"]": 
    "import { authService as auth } from '@/services/api/new-index'",
    
  // Old: import { projects } from 'services/api';
  // New: import { projectService as projects } from 'services/api/new-index';
  "import\s*\{\s*projects\s*\}\s*from\s*['"]@?\/?services\/api['"]": 
    "import { projectService as projects } from '@/services/api/new-index'",
    
  // Add more patterns as needed
};

// Find all JavaScript/TypeScript files in the project
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDED_FILES.includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (FILE_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Update imports in a file
function updateFileImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Apply each replacement pattern
    for (const [pattern, replacement] of Object.entries(IMPORT_PATTERNS)) {
      const regex = new RegExp(pattern, 'g');
      const newContent = content.replace(regex, replacement);
      
      if (newContent !== content) {
        console.log(`Updated imports in ${path.relative(ROOT_DIR, filePath)}`);
        content = newContent;
        updated = true;
      }
    }
    
    // Write the file if it was updated
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

// Main function
function main() {
  console.log('Finding files to update...');
  const files = findFiles(SRC_DIR);
  console.log(`Found ${files.length} files to process`);
  
  let updatedCount = 0;
  
  // Process each file
  files.forEach(filePath => {
    if (updateFileImports(filePath)) {
      updatedCount++;
    }
  });
  
  console.log(`\nUpdate complete!`);
  console.log(`Files processed: ${files.length}`);
  console.log(`Files updated: ${updatedCount}`);
  
  // Run Prettier to format the updated files
  console.log('\nRunning Prettier to format updated files...');
  try {
    execSync('npx prettier --write "src/**/*.{js,jsx,ts,tsx}"', { stdio: 'inherit' });
    console.log('Formatting complete!');
  } catch (error) {
    console.error('Error running Prettier:', error);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  findFiles,
  updateFileImports,
  IMPORT_PATTERNS
};
