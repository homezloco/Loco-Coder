import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a creative project name based on the project description
 * @param {string} description - Project description
 * @returns {Promise<string>} - Generated project name
 */
export const generateProjectName = async (description) => {
  try {
    const { aiService } = useApi();
    
    const response = await aiService.chat(
      `Generate a creative, unique, and memorable project name based on this description. ` +
      `The name should be 2-4 words, title-cased, and relevant to the project. ` +
      `Return ONLY the name, no quotes or other text.\n\n` +
      `Project description: "${description}"`
    );
    
    // Extract just the name from the response
    let name = response.choices[0].message.content.trim();
    
    // Clean up the response
    name = name.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    name = name.split('\n')[0]; // Take only the first line
    
    // Ensure the name is title-cased and has no extra spaces
    name = name
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
    
    // If the name is too short or too long, generate a fallback
    if (name.length < 2 || name.length > 50) {
      return `Project-${uuidv4().substring(0, 8)}`;
    }
    
    return name;
  } catch (error) {
    console.error('Error generating project name:', error);
    // Fallback to a simple generated name
    return `Project-${uuidv4().substring(0, 8)}`;
  }
};

/**
 * Generate a project logo using AI
 * @param {string} projectName - Name of the project
 * @param {string} description - Project description
 * @param {Object} aiService - AI service instance
 * @returns {Promise<Object>} - Logo data (SVG or image URL)
 */
export const generateProjectLogo = async (projectName, description, aiService) => {
  // Early return with fallback if no AI service is provided
  if (!aiService) {
    console.warn('AI service not provided for logo generation, using fallback');
    return {
      type: 'svg',
      content: generateFallbackSvg(projectName),
      concept: 'Minimalist initial-based logo with gradient background',
      generatedAt: new Date().toISOString(),
      isFallback: true
    };
  }
  
  // Check if this is a fallback AI service implementation
  if (aiService.isFallback) {
    console.log('Using fallback AI service for logo generation');
    return {
      type: 'svg',
      content: generateFallbackSvg(projectName),
      concept: 'Minimalist initial-based logo with gradient background',
      generatedAt: new Date().toISOString(),
      isFallback: true
    };
  }
  
  try {    
    // First, generate a logo concept
    const conceptResponse = await aiService.chat(
      `Generate a simple, modern, and abstract logo concept for a project called "${projectName}". ` +
      `Project description: "${description}"\n\n` +
      `Provide a brief description of the logo design in one sentence, focusing on shapes, colors, and style. ` +
      `Example: "A minimalist circular logo with a gradient from blue to purple, featuring an abstract 'W' shape in the center."`
    );
    
    // Check if we got a fallback response
    if (conceptResponse.fallback) {
      return {
        type: 'svg',
        content: generateFallbackSvg(projectName),
        concept: 'Minimalist initial-based logo with gradient background',
        generatedAt: new Date().toISOString(),
        isFallback: true
      };
    }
    
    const logoConcept = conceptResponse.choices[0].message.content.trim();
    
    // Generate an SVG based on the concept
    const svgResponse = await aiService.chat(
      `Create an SVG logo based on this description: "${logoConcept}"\n\n` +
      `Return ONLY the SVG code, starting with <svg and ending with </svg>. ` +
      `The SVG should be 200x200 pixels with a viewBox="0 0 200 200". ` +
      `Use simple shapes and a clean, modern design.`
    );
    
    // Check if we got a fallback response
    if (svgResponse.fallback) {
      return {
        type: 'svg',
        content: generateFallbackSvg(projectName),
        concept: 'Minimalist initial-based logo with gradient background',
        generatedAt: new Date().toISOString(),
        isFallback: true
      };
    }
    
    let svg = svgResponse.choices[0].message.content.trim();
    
    // Ensure the SVG is valid and has proper dimensions
    if (!svg.startsWith('<svg')) {
      // Try to extract SVG from markdown code block if present
      const svgMatch = svg.match(/```(?:svg)?\n([\s\S]*?)\n```/);
      if (svgMatch) {
        svg = svgMatch[1];
      } else {
        throw new Error('Invalid SVG format');
      }
    }
    
    return {
      type: 'svg',
      content: svg,
      concept: logoConcept,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating project logo:', error);
    // Fallback to a simple generated SVG
    return {
      type: 'svg',
      content: generateFallbackSvg(projectName),
      concept: 'Minimalist initial-based logo with gradient background',
      generatedAt: new Date().toISOString(),
      isFallback: true
    };
  }
};

/**
 * Generate a fallback SVG logo with project initials
 * @private
 */
const generateFallbackSvg = (projectName) => {
  // Get initials from project name
  const initials = projectName
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);
  
  // Generate a color based on the project name
  const hue = Array.from(projectName).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const color1 = `hsl(${hue}, 70%, 50%)`;
  const color2 = `hsl(${(hue + 30) % 360}, 70%, 50%)`;
  
  return `
    <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="40" fill="url(#gradient)" opacity="0.9"/>
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="80" 
            font-weight="bold"
            fill="white"
            text-anchor="middle"
            dominant-baseline="middle"
            style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        ${initials}
      </text>
    </svg>
  `;
};

/**
 * Generate a color scheme based on project name
 * @param {string} projectName - Name of the project
 * @returns {Object} - Color scheme object
 */
export const generateColorScheme = (projectName) => {
  // Generate a consistent color based on the project name
  const hash = Array.from(projectName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  
  return {
    primary: `hsl(${hue}, 70%, 50%)`,
    secondary: `hsl(${(hue + 30) % 360}, 70%, 50%)`,
    accent: `hsl(${(hue + 180) % 360}, 70%, 50%)`,
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#ffffff',
    lightText: '#f5f5f5',
    darkText: '#333333'
  };
};
