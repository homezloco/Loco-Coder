/**
 * Project scaffolding templates and additional files
 */

// These file definitions should be added to the plan.structure.files array
export const additionalFiles = [
  {
    "path": "frontend/src/services/api.js",
    "type": "file",
    "language": "javascript",
    "content": `import axios from 'axios';

// API base URL with fallback
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token if it's invalid
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    return apiClient.post('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  register: (userData) => apiClient.post('/api/v1/users', userData),
  me: () => apiClient.get('/api/v1/users/me'),
};

// Items API
export const itemsApi = {
  getAll: () => apiClient.get('/api/v1/items'),
  getById: (id) => apiClient.get('/api/v1/items/' + id),
  create: (data) => apiClient.post('/api/v1/items', data),
  update: (id, data) => apiClient.put('/api/v1/items/' + id, data),
  delete: (id) => apiClient.delete('/api/v1/items/' + id),
};

// Users API
export const usersApi = {
  getAll: () => apiClient.get('/api/v1/users'),
  getById: (id) => apiClient.get('/api/v1/users/' + id),
};

// Projects API with fallback to local storage
export const projectsApi = {
  getAll: async () => {
    try {
      return await apiClient.get('/api/v1/projects');
    } catch (error) {
      console.log('Falling back to local storage for projects');
      // Fallback to local storage
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      return projects;
    }
  },
  getById: async (id) => {
    try {
      return await apiClient.get('/api/v1/projects/' + id);
    } catch (error) {
      console.log('Falling back to local storage for project', id);
      // Fallback to local storage
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const project = projects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return project;
    }
  },
  create: async (data) => {
    try {
      return await apiClient.post('/api/v1/projects', data);
    } catch (error) {
      console.log('Falling back to local storage for project creation');
      // Fallback to local storage
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const newProject = { ...data, id: Date.now().toString() };
      projects.push(newProject);
      localStorage.setItem('projects', JSON.stringify(projects));
      return newProject;
    }
  },
  update: async (id, data) => {
    try {
      return await apiClient.put('/api/v1/projects/' + id, data);
    } catch (error) {
      console.log('Falling back to local storage for project update', id);
      // Fallback to local storage
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const index = projects.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Project not found');
      const updatedProject = { ...projects[index], ...data };
      projects[index] = updatedProject;
      localStorage.setItem('projects', JSON.stringify(projects));
      return updatedProject;
    }
  },
  delete: async (id) => {
    try {
      return await apiClient.delete('/api/v1/projects/' + id);
    } catch (error) {
      console.log('Falling back to local storage for project deletion', id);
      // Fallback to local storage
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const filteredProjects = projects.filter(p => p.id !== id);
      localStorage.setItem('projects', JSON.stringify(filteredProjects));
      return { success: true };
    }
  },
};

// Export all APIs
export default {
  auth: authApi,
  items: itemsApi,
  users: usersApi,
  projects: projectsApi
}`
  }
];

// Additional templates will be added in separate files to avoid size limitations
export const getHtmlTemplate = (projectName, description) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="./assets/styles.css">
  <link rel="icon" href="./assets/favicon.ico">
</head>
<body>
  <header>
    <div class="container">
      <h1>${projectName}</h1>
      <nav>
        <ul>
          <li><a href="#">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <h2>Welcome to ${projectName}</h2>
        <p>${description || 'A modern web application'}</p>
        <button class="cta-button">Get Started</button>
      </div>
    </section>

    <section id="about" class="about">
      <div class="container">
        <h2>About</h2>
        <p>${description || 'This is a modern web application built with the latest technologies.'}</p>
      </div>
    </section>

    <section id="features" class="features">
      <div class="container">
        <h2>Features</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <h3>Responsive Design</h3>
            <p>Looks great on all devices</p>
          </div>
          <div class="feature-card">
            <h3>Modern Stack</h3>
            <p>Built with the latest technologies</p>
          </div>
          <div class="feature-card">
            <h3>Fast &amp; Reliable</h3>
            <p>Optimized for performance</p>
          </div>
        </div>
      </div>
    </section>

    <section id="contact" class="contact">
      <div class="container">
        <h2>Contact Us</h2>
        <form>
          <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="message">Message</label>
            <textarea id="message" name="message" rows="5" required></textarea>
          </div>
          <button type="submit" class="submit-button">Send Message</button>
        </form>
      </div>
    </section>
  </main>

  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${projectName}. All rights reserved.</p>
    </div>
  </footer>

  <script src="./assets/app.js"></script>
</body>
</html>`;
};
