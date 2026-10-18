# FixFlow — Issue Tracking System

FixFlow is a full-stack issue tracking application built to demonstrate practical frontend development, REST API design, data validation, automated testing, and continuous integration.

## Features

- **Issue management:** Create, view, update, and delete issues.
- **Issue details:** Open an issue to view its description and details.
- **Status tracking:** Track issues as Open, In Progress, or Resolved.
- **Priority levels:** Classify issues as Low, Medium, High, or Critical.
- **Comments:** Add comments to issues and review their activity.
- **Search and filtering:** Find issues and narrow results using available filters.
- **Dashboard:** View issue statistics and monitor issue statuses.
- **API validation:** Validate incoming issue and comment data.
- **Automated testing:** Test API endpoints using Vitest and Supertest.
- **Continuous integration:** Use GitHub Actions to build the frontend, run backend tests, and build the backend.

## Technology Stack

 Frontend:  React, TypeScript, Vite 
 Backend : Node.js, Express, TypeScript 
 Validation:  Zod
 API testing: Vitest, Supertest
 CI/CD: GitHub Actions 
 Version control: Git and GitHub 

## Architecture

FixFlow uses a React frontend that communicates with a REST API built with Express and TypeScript.

The backend provides endpoints for issue management, issue details, and comments. Zod validates incoming data, while automated tests verify key API behaviours.

GitHub Actions runs the production builds and backend tests when changes are pushed or pull requests are opened against the `main` or `master` branches.

## Getting Started

### Prerequisites

- Node.js and npm
- Git
- A code editor such as Visual Studio Code

### 1. Clone the repository

```bash
git clone https://github.com/BerniceMlangeni/fixflow.git
cd fixflow
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure the frontend API URL

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3000
```

Do not commit local environment files or secrets to GitHub.

### 4. Install backend dependencies

```bash
cd server
npm install
```

### 5. Start the backend

From the `server` directory, run:

```bash
npm run dev
```

The API runs at `http://localhost:3000` by default.

### 6. Start the frontend

Open a second terminal in the project root:

```bash
npm run dev
```

Open the local URL printed by Vite in your browser.

## API Endpoints

 GET: `/health`  Check API health 
 GET  `/api/issues`  List issues 
 GET  `/api/issues/:id` Retrieve an issue 
 POST  `/api/issues`  Create an issue 
 PATCH  `/api/issues/:id`  Update an issue 
 DELETE  `/api/issues/:id`  Delete an issue 
 GET  `/api/issues/:id/comments`  Retrieve issue comments 
 POST  `/api/issues/:id/comments`  Add an issue comment 

## Testing

Run the backend tests:

```bash
cd server
npm test
```

Build the backend:

```bash
npm run build
```

Build the frontend from the project root:

```bash
npm run build
```

The automated API tests cover health checks, issue retrieval, validation, issue creation, updates, deletion, and comments.

## Continuous Integration

The GitHub Actions workflow is located at `.github/workflows/ci.yml`.

It automatically:

1. Checks out the repository.
2. Sets up Node.js.
3. Installs frontend and backend dependencies.
4. Builds the frontend.
5. Runs backend API tests.
6. Builds the backend.

A failed step identifies a problem that should be investigated before the changes are considered verified.

## Current Limitations

- Issues and comments are stored in memory, so data resets when the backend process restarts.
- Authentication and role-based access control are not yet implemented.
- The application is currently intended as a portfolio and learning project rather than a production service.

## Future Improvements

- Add persistent database storage.
- Introduce user authentication and authorization.
- Add more automated tests, including edge cases.
- Deploy the frontend and backend.
- Add application monitoring and production error handling.

## Author

**Bernice Mlangeni**

GitHub: [BerniceMlangeni](https://github.com/BerniceMlangeni)

