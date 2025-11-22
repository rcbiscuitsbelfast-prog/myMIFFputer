# MIFF Desktop Setup & Deploy Guide

This guide covers end-to-end setup and deployment for MIFF (Minimal Interface Framework for Files) desktop applications built on the Puter platform.

## Overview

MIFF desktop applications are lightweight, Vite-based desktop interfaces that connect to a Puter backend for file management, AI services, and cloud functionality. This guide covers:

- Local development setup for both frontend and backend
- Environment configuration for AI/LLM services
- Deployment to Render (backend) and GitHub Pages (frontend)
- Content management and integration patterns

## Prerequisites

- **Node.js**: Version 20.19.5+ (Version 23+ recommended)
- **npm**: Latest stable version
- **Git**: For version control and submodule management
- **Optional**: Docker for containerized deployment

## Local Development

### Backend Development

Start the Puter backend server:

```bash
# Clone the repository
git clone https://github.com/HeyPuter/puter
cd puter

# Install dependencies
npm install

# Start backend in development mode
npm run dev
```

The backend will start at `http://puter.localhost:4100` (or the next available port).

### Frontend Development (MIFF Desktop)

For MIFF desktop development, you'll typically work in a separate repository or a dedicated frontend directory. The typical setup involves:

```bash
# In your MIFF desktop project directory
npm install
npm run dev
```

This starts a Vite development server (usually on port 5173) with hot reload for frontend development.

### Development Workflow

1. **Backend First**: Start the Puter backend with `npm run dev`
2. **Frontend Second**: Start your MIFF desktop with `npm run dev:miff-desktop`
3. **API Integration**: Configure your frontend to point to the local backend
4. **Iterate**: Make changes to either frontend or backend with hot reload

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
# Basic configuration
PORT=4000
DOMAIN=puter.localhost
HTTP_PORT=4100

# Database (default SQLite)
DATABASE_ENGINE=sqlite
DATABASE_PATH=puter-database.sqlite

# AI/LLM Service Configuration
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Together AI
TOGETHER_AI_API_KEY=your_together_ai_key_here

# Mistral
MISTRAL_API_KEY=your_mistral_api_key_here

# Groq
GROQ_API_KEY=your_groq_api_key_here

# xAI
XAI_API_KEY=your_xai_api_key_here

# AWS Services (optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### Frontend Environment Variables

In your MIFF desktop project, create environment variables to connect to the backend:

```bash
# .env.local or .env.development
VITE_API_BASE_URL=http://puter.localhost:4100
VITE_APP_NAME=My MIFF Desktop
VITE_ENABLE_AI_FEATURES=true
```

## Mock Mode Development

You can run the backend without API keys to test basic functionality:

```bash
# Start with minimal services (no AI features)
npm run dev

# Or create a .env with only essential services:
echo "PORT=4000" > .env
echo "DATABASE_ENGINE=sqlite" >> .env
echo "DATABASE_PATH=puter-database.sqlite" >> .env
```

In mock mode:
- File management features work normally
- AI features will show "service unavailable" messages
- You can still test the UI and basic functionality

## Content Folder Contract

The `/content` directory in MIFF desktop projects follows a specific structure:

```
content/
├── apps/           # Application definitions
├── themes/         # UI themes and styles
├── templates/      # Page templates
├── assets/         # Static assets (images, icons)
├── locales/        # Internationalization files
└── config/         # Configuration files
```

For a detailed example and best practices, see the [Content Directory Example](./content-directory-example.md).

### Content Integration Patterns

#### Method 1: Direct Copy
```bash
# Copy content pack into your project
cp -r ../miff-content-pack/* content/
```

#### Method 2: Git Submodules
```bash
# Add content pack as submodule
git submodule add https://github.com/your-org/miff-content-pack.git content
git submodule update --init --recursive
```

#### Method 3: Mount Points
For advanced setups, you can mount content from external sources:

```javascript
// In your build configuration
const contentPath = process.env.CONTENT_PATH || './content';
```

## Render Deployment (Backend)

### Preparation

1. **Create Render Account**: Sign up at [render.com](https://render.com)
2. **Fork Repository**: Fork the Puter repository to your GitHub account
3. **Prepare Environment**: Set up environment variables in Render dashboard

### Build Configuration

In your Render service settings:

**Build Command**:
```bash
npm install
npm run build:ts
```

**Start Command**:
```bash
npm start
```

### Environment Variables on Render

Set these in your Render service environment:

```bash
NODE_ENV=production
PORT=10000
HTTP_PORT=10000

# Database (use PostgreSQL for production)
DATABASE_ENGINE=postgres
DATABASE_URL=your_render_postgres_url

# AI Service Keys (add as needed)
OPENAI_API_KEY=your_production_key
ANTHROPIC_API_KEY=your_production_key

# Other production settings
DOMAIN=your-app.onrender.com
PROTOCOL=https
CONTACT_EMAIL=your-email@example.com
```

### Free Tier Constraints

- **RAM**: 512MB - keep the backend lightweight
- **Build Time**: 15 minutes limit
- **Sleep After**: 15 minutes of inactivity
- **Cold Starts**: ~30 seconds to wake up

### Optimization Tips

```bash
# Use lightweight database
DATABASE_ENGINE=sqlite

# Disable heavy services in production
# Set these to false or omit entirely:
# AWS services, heavy AI processing, etc.

# Enable caching
REDIS_URL=your_redis_url
```

## GitHub Pages Deployment (Frontend)

### Build Configuration

Update your `package.json`:

```json
{
  "scripts": {
    "dev:miff-desktop": "vite",
    "build": "vite build",
    "build:gh-pages": "vite build --base=/your-repo-name/",
    "preview": "vite preview",
    "deploy:gh-pages": "npm run build:gh-pages && gh-pages -d dist"
  }
}
```

### Vite Configuration

In `vite.config.js`:

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' 
    ? '/your-repo-name/' 
    : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://puter.localhost:4100',
        changeOrigin: true
      }
    }
  }
})
```

### Deployment Steps

1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Configure GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: gh-pages, root folder

3. **Deploy**:
   ```bash
   npm run deploy:gh-pages
   ```

### Production Environment Variables

Create `.env.production`:

```bash
VITE_API_BASE_URL=https://your-app.onrender.com
VITE_APP_NAME=My MIFF Desktop
VITE_ENABLE_AI_FEATURES=true
```

## Integration Patterns for Future MIFF Repos

### Repository Structure

```
miff-my-app/
├── content/              # Content pack integration
├── src/                  # Vue/React/Svelte components
├── public/               # Static assets
├── docs/                 # Project documentation
├── package.json
├── vite.config.js
└── README.md
```

### Content Pack Integration

#### Option 1: Git Submodule
```bash
# Add as submodule
git submodule add https://github.com/your-org/content-pack.git content

# Update content
git submodule update --remote content
```

#### Option 2: NPM Package
```bash
# Install content pack
npm install @your-org/content-pack

# Use in build process
const content = require('@your-org/content-pack');
```

#### Option 3: Dynamic Loading
```javascript
// Load content from external source
async function loadContent() {
  const response = await fetch('/content/config.json');
  const config = await response.json();
  return config;
}
```

### Development Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev:miff-desktop": "vite",
    "dev:backend": "cd ../puter && npm run dev",
    "dev:full": "concurrently \"npm run dev:backend\" \"npm run dev:miff-desktop\"",
    "content:update": "git submodule update --init --recursive",
    "content:install": "npm install && npm run content:update"
  }
}
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Change ports in `.env` if default ports are in use
2. **CORS Errors**: Ensure backend allows frontend origin in development
3. **API Keys**: Verify environment variables are correctly set
4. **Build Failures**: Check Node.js version compatibility

### Debug Mode

Enable verbose logging:

```bash
# Backend debug
DEBUG=* npm run dev

# Frontend debug
VITE_DEBUG=true npm run dev:miff-desktop
```

## Performance Considerations

### Backend Optimization
- Use PostgreSQL for production databases
- Enable Redis caching for frequently accessed data
- Implement proper indexing for database queries
- Use CDN for static assets

### Frontend Optimization
- Implement code splitting with Vite
- Use dynamic imports for heavy components
- Optimize images and assets
- Enable gzip compression on server

## Security Best Practices

1. **Environment Variables**: Never commit API keys to repository
2. **CORS Configuration**: Restrict origins in production
3. **Authentication**: Use Puter's built-in auth system
4. **Data Validation**: Validate all user inputs
5. **HTTPS**: Always use HTTPS in production

## Contributing

When contributing to MIFF desktop projects:

1. Follow the existing code style and conventions
2. Test with both mock and real API keys
3. Update documentation for new features
4. Ensure content pack compatibility

## Additional Resources

- [Puter Documentation](https://github.com/HeyPuter/puter/blob/main/doc/README.md)
- [Puter AI Module](./src/backend/doc/modules/puterai/README.md)
- [Render Deployment Guide](https://render.com/docs/deploy-node-express-app)
- [Vite Documentation](https://vitejs.dev/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)