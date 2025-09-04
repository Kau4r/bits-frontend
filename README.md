# BITS Frontend

This is the frontend for the BITS Capstone Project, built with React, TypeScript, and Vite.

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher) or yarn
- Git

### Configuration

Create a `postcss.config.js` file in the root of the project with the following setup:

```js
export default {
    plugins: {
        "@tailwindcss/postcss": {},
    }
}
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

###Connecting to backend
Environment Variables

Create a .env file in the root of your project to configure the API URL and other environment-specific settings. Example:

# URL of the backend API
VITE_API_URL=http://localhost:5000
