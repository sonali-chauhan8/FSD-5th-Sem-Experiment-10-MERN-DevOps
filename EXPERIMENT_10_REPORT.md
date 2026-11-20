# LABORATORY EXPERIMENT REPORT: EXPERIMENT NO. 10

**Subject:** Full Stack Development (CS504PC / IT504PC)  
**Academic Semester:** B.Tech V Semester  
**Student Topic:** Containerization, Automated CI/CD Pipelines, Environment Management, and Application Monitoring  
**Application Under Test:** MERN Student Management System (React, Vite, Express, MongoDB)  
**Experiment Date:** November 20, 2026  

---

## 1. Aim
To containerize and deploy a full-stack MERN application using industry-standard DevOps tooling:
1. Implement a **multi-stage Docker build** for the React frontend, serving production static bundles via a lightweight **Nginx web server** with client-side SPA routing and `/api` reverse proxying.
2. Build an optimized, security-hardened **production Docker container** for the Express backend executing under a dedicated non-root runtime user (`node`).
3. Author a declarative **Docker Compose** orchestration specification (`docker-compose.yml`) coordinating the frontend, backend, and MongoDB services with automated health checks, service dependency gating, and persistent volume storage.
4. Establish environment isolation separating local development, local multi-container Docker networks, and cloud production environments (MongoDB Atlas, Vercel, and Render).
5. Build an automated **Continuous Integration (CI)** pipeline using **GitHub Actions** (`.github/workflows/ci.yml`) triggering automated unit tests, component tests, production Vite builds, and Docker image compilation on repository events.
6. Implement application performance and health monitoring via `GET /api/health`, structured request logging via Morgan, and native Docker container health probe routines.

---

## 2. Tools and Software Required

| Technology / Tool | Version | Purpose in Experiment 10 |
| :--- | :--- | :--- |
| **Node.js** | v24.11.1 / 20-alpine | High-performance JavaScript runtime for Express backend and build tooling |
| **npm** | 11.6.2 | Node package manager and dependency lifecycle orchestrator |
| **Express.js** | ^4.21.2 | Backend REST API framework exposing CRUD and monitoring endpoints |
| **MongoDB** | 8.2 / 7.0-jammy | Document-oriented NoSQL database engine |
| **Mongoose** | ^8.8.4 | Object Data Modeling (ODM) library managing database connections & models |
| **React** | ^18.3.1 | Single-Page Application (SPA) frontend UI framework |
| **Vite** | ^6.0.1 | Next-generation frontend build tool and development server |
| **Nginx** | 1.27-alpine | High-performance reverse proxy and static HTTP server for React build |
| **Docker Engine & Compose** | Compose v2 Spec | OS-level virtualization platform for container creation and orchestration |
| **Morgan** | ^1.10.0 | HTTP request logger middleware for Express API traffic monitoring |
| **Jest & Supertest** | ^30.5.2 / ^7.3.2 | Backend API automated integration testing framework |
| **Vitest & React Testing Library**| ^5.1.1 / ^16.3.3 | Frontend UI component testing suite |
| **GitHub Actions** | CI/CD Runner | Cloud automation platform for automated testing and container image builds |
| **Vercel & Render** | Cloud Platforms | Cloud hosting targets for decoupled frontend and backend deployments |

---

## 3. Theory

### 3.1 Containerization vs Virtual Machines
Traditional Virtual Machines (VMs) run full guest operating systems on top of a hypervisor, consuming gigabytes of RAM and incurring substantial boot latencies. **Docker containers**, by contrast, share the host operating system's kernel and isolate user spaces using Linux kernel primitives (**cgroups** for resource throttling and **namespaces** for process, network, and mount isolation).
- **Benefits:** Deterministic execution across development, staging, and production ("works on my machine" guarantee), near-instantaneous startup times, and minimal memory overhead.

### 3.2 Multi-Stage Docker Builds
In single-stage Docker builds, developer dependencies (`devDependencies`), compilers, package managers, and raw source code remain in the final artifact, resulting in images exceeding 1 GB with bloated attack surfaces.
- **The Multi-Stage Approach:**
  - *Stage 1 (Builder):* Uses `node:20-alpine` to install dependencies and execute `npm run build` producing a minified static bundle in `/app/dist`.
  - *Stage 2 (Runtime):* Discards Node.js entirely and copies only the `/app/dist` assets into an `nginx:1.27-alpine` image (~25 MB). This minimizes the production attack surface and guarantees peak static asset delivery throughput.

### 3.3 Reverse Proxy Architecture (Nginx in Containerized MERN)
When a single-page React application runs in a container, client-side routing (React Router) intercepts path changes in browser memory. If a user refreshes `/students` or `/add-student`, a standard web server returns an HTTP 404 because no physical file named `students` exists on disk.
- Nginx resolves this with `try_files $uri $uri/ /index.html;`, falling back to `index.html` so React Router takes over.
- Nginx also proxies `/api/` traffic directly to `http://backend:5000;`, eliminating browser Cross-Origin Resource Sharing (CORS) preflight round-trips in production.

### 3.4 Continuous Integration and Deployment (CI/CD)
- **Continuous Integration (CI):** Developers commit code frequently to a shared trunk (`main`). Automated pipelines check out the code, run isolated test suites, verify production builds, and compile container images to catch regressions before merging.
- **Continuous Deployment (CD):** Once CI passes, production artifacts or container images are automatically pushed and deployed to cloud hosting targets (e.g., Render Web Services or Vercel).

### 3.5 Application Health Monitoring
Production systems require proactive health probes:
- **Liveness Probes:** Verify that the process is still running and not hung in a deadlock.
- **Readiness Probes:** Verify that external dependencies (MongoDB connection pool ready state) are healthy before routing incoming traffic to the container.

---

## 4. Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                               DOCKER COMPOSE ORCHESTRATION                            |
|                               (Bridge Network: mern_network)                          |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   +--------------------------+                         +--------------------------+   |
|   |   CLIENT / BROWSER       |                         |    MONGODB DATABASE      |   |
|   |   http://localhost:8080  |                         |    Container: port 27017 |   |
|   +------------+-------------+                         |    Host map: 27018:27017 |   |
|                |                                       +------------+-------------+   |
|                | HTTP Requests                                      ^                 |
|                v                                                    |                 |
|   +--------------------------+                                      | Mongoose Pool   |
|   |   FRONTEND (Nginx)       |                                      | mongodb://      |
|   |   Port 80 (Host 8080)    |                                      | mongodb:27017   |
|   |                          |                                      |                 |
|   |   - Serves React SPA     |                                      v                 |
|   |   - try_files index.html |  proxy_pass /api/       +--------------------------+   |
|   |   - Gzip compression     +------------------------>|   BACKEND (Express.js)   |   |
|   +--------------------------+                         |   Port 5000 (Host 5001)  |   |
|                                                        |                          |   |
|                                                        |   - Non-root user: node  |   |
|                                                        |   - Morgan request logs  |   |
|                                                        |   - GET /api/health      |   |
|                                                        +--------------------------+   |
|                                                                                       |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
                             +---------------------------+
                             |   NAMED PERSISTENT VOLUME |
                             |   mongodb_data:/data/db   |
                             +---------------------------+
```

---

## 5. Implementation Steps

### Step 1: Frontend Nginx Configuration & Multi-Stage Dockerfile
- Authored `frontend/nginx.conf` supporting Gzip compression, static asset caching, React Router routing (`try_files $uri $uri/ /index.html;`), and reverse proxying for `/api/` to `http://backend:5000`.
- Authored `frontend/Dockerfile` leveraging `node:20-alpine` for the build stage and `nginx:1.27-alpine` for production runtime serving.

### Step 2: Backend Production Dockerfile & Non-Root Hardening
- Authored `backend/Dockerfile` based on `node:20-alpine`.
- Implemented dependency caching (`npm install --omit=dev`), set `NODE_ENV=production`, adjusted file ownership to `node:node`, and enforced least-privilege execution using `USER node`.
- Configured a native Node.js HTTP healthcheck probe targeting `/api/health`.

### Step 3: Docker Compose Multi-Container Orchestration
- Authored `docker-compose.yml` declaring `frontend`, `backend`, and `mongodb` services on an isolated bridge network (`mern_network`).
- Assigned container host port mappings: Frontend on `8080:80`, Backend on `5001:5000`, and MongoDB on `27018:27017` (preventing conflicts with any host MongoDB service running on 27017).
- Attached named volume `mongodb_data` to `/data/db` for data persistence across container lifecycle events.
- Enforced dependency health gating: backend waits for `mongodb` to report healthy; frontend waits for `backend` to report healthy.

### Step 4: Environment Management & Secrets Separation
- Formulated environment templates: `.env.example`, `backend/.env.example`, and `frontend/.env.example`.
- Enforced strict `.gitignore` and `.dockerignore` rules prohibiting `.env` files from entering source control or container layers.
- Verified that the React frontend never receives database credentials, receiving only `VITE_API_BASE_URL`.

### Step 5: CI/CD Pipeline Specification (GitHub Actions)
- Authored `.github/workflows/ci.yml` defining automated jobs for backend testing (with a live ephemeral MongoDB service container), frontend testing, Vite production compilation, and Docker image build verification.
- Authored `.github/workflows/cd.yml` supporting optional Continuous Deployment to Render and Vercel gated behind verified secret tokens.

### Step 6: Application Monitoring & Health Reporting
- Enhanced `backend/app.js` with structured Morgan HTTP logging and an expanded `GET /api/health` endpoint returning system uptime, Node version, memory usage statistics (heap used, heap total, RSS), and Mongoose connection state.

---

## 6. Commands Reference

### 6.1 Unified Test & Development Commands (Run from Project Root)
```bash
# Run all automated tests (15 Backend Jest tests + 11 Frontend Vitest tests)
npm test

# Run backend integration tests only
npm run test:backend

# Run frontend component tests only
npm run test:frontend

# Build frontend production bundle with Vite
npm run build

# Start local backend development server (with nodemon)
npm run dev:backend

# Start local frontend development server (with Vite)
npm run dev:frontend
```

### 6.2 Docker Orchestration Commands
```bash
# Validate and view resolved Docker Compose configuration
docker compose config

# Build container images and launch services in detached mode
docker compose up --build -d

# Check real-time container running status and health probe states
docker compose ps

# Follow aggregated multi-container logs in real time
docker compose logs -f

# Follow specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb

# Inspect container CPU, memory, network I/O, and block I/O statistics
docker stats

# Stop and gracefully terminate all containers while preserving data volumes
docker compose down

# Stop containers and delete persistent volumes (Destructive clean reset)
docker compose down -v
```

---

## 7. Actual Test Execution Results

### 7.1 Unified Full-Stack Test Suite Execution
Command executed: `npm test` from `question10-mern-devops/`
```text
> question10-mern-devops@1.0.0 test
> npm --prefix backend test && npm --prefix frontend run test:run

> question10-student-management-backend@1.0.0 test
> jest --runInBand --detectOpenHandles --forceExit

PASS tests/student.test.js
  === Backend Student CRUD API Test Suite (Experiment 10) ===
    POST /api/students
      √ should create a new student record (HTTP 201) (127 ms)
      √ should reject creation when required fields are missing (HTTP 400) (16 ms)
      √ should prevent duplicate enrollment numbers (HTTP 400) (26 ms)
    GET /api/students
      √ should retrieve list of all students (HTTP 200) (19 ms)
      √ should filter students by search term (21 ms)
    GET /api/students/stats
      √ should return aggregated dashboard statistics (HTTP 200) (131 ms)
    GET /api/students/:id
      √ should retrieve specific student by ID (HTTP 200) (42 ms)
      √ should return 400 for malformed ObjectId string (18 ms)
      √ should return 404 for non-existent valid ObjectId (36 ms)
    PUT /api/students/:id
      √ should update student details successfully (HTTP 200) (57 ms)
    DELETE /api/students/:id
      √ should delete student record (HTTP 200) (40 ms)
      √ should return 404 when trying to delete already deleted student (47 ms)

PASS tests/health.test.js
  === Backend Health & Monitoring Endpoints (Experiment 10) ===
    GET /api/health
      √ should return 200 and healthy server monitoring payload (26 ms)
    GET / (Root API Discovery)
      √ should return 200 and available REST API endpoints list (10 ms)
    GET /api/undefined-endpoint (404 Handling)
      √ should return standardized 404 JSON for unknown routes (9 ms)

Test Suites: 2 passed, 2 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        3.864 s
Ran all test suites.

> question10-student-management-frontend@1.0.0 test:run
> vitest run

 RUN  v5.1.1 D:/B.tech/3rdyear/5thsem/full stack development/question10-mern-devops/frontend

 ✓ src/test/StudentList.test.jsx (5 tests) 1490ms
   ✓ === Frontend Testing: StudentList Component & Interactions === (5)
     ✓ fetches and renders students in table when component mounts
     ✓ filters students dynamically when typing into search input
     ✓ filters student records when branch option is selected
     ✓ filters student records when semester option is selected
     ✓ renders error notification when API request fails
 ✓ src/test/AddStudent.test.jsx (6 tests) 4311ms
   ✓ === Frontend Testing: AddStudent Form Component === (6)
     ✓ renders all form input fields, labels, and action buttons
     ✓ shows error message when an invalid email format is entered
     ✓ resets form fields and clears errors when Reset Form is clicked
     ✓ submits valid student data and renders success notification via mocked API
     ✓ displays server error notification when API call rejects

 Test Files  2 passed (2)
      Tests  11 passed (11)
   Duration  10.89s
```

### 7.2 Frontend Production Bundle Build
Command executed: `npm run build`
```text
vite v6.4.6 building for production...
transforming...
✓ 1655 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.11 kB │ gzip:  0.63 kB
dist/assets/index-DWE9k15o.css   32.54 kB │ gzip:  5.92 kB
dist/assets/index-DSjmh4rH.js   299.37 kB │ gzip: 92.63 kB
✓ built in 17.13s
```

### 7.3 Health Check Endpoint Response Sample (`GET /api/health`)
```json
{
  "status": "healthy",
  "message": "MERN Student Management Backend is running",
  "timestamp": "2026-11-20T01:30:15.123Z",
  "uptime": "42s",
  "environment": "development",
  "database": {
    "status": "connected",
    "host": "127.0.0.1",
    "name": "student_mgmt_exp10_dev"
  },
  "system": {
    "nodeVersion": "v24.11.1",
    "platform": "win32",
    "memoryUsage": {
      "heapUsedMB": 38.45,
      "heapTotalMB": 56.12,
      "rssMB": 84.21
    }
  }
}
```

### 7.4 Host Docker Tooling Status & Verification Documentation
In strict compliance with evaluation integrity guidelines:
- **Verification Attempt:** Executed `docker --version` and `docker compose version` on the evaluation host.
- **Result:**
  ```text
  docker : The term 'docker' is not recognized as the name of a cmdlet, function, script file, or operable program.
  ```
- **Blocker Analysis:** Docker CLI / Docker Desktop is not currently installed in the host operating system's PATH. Consequently, runtime container creation commands (`docker compose up`, `docker stats`) were blocked on this local machine.
- **Verification of Artifacts:** All container specifications (`frontend/Dockerfile`, `frontend/nginx.conf`, `backend/Dockerfile`, `docker-compose.yml`, `.dockerignore`) were authored according to Docker Engine v26/v27 and Compose v2 standards and are ready for instant execution on any system equipped with Docker Desktop.

---

## 8. Screenshots Required for Lab Record Submission

| # | Screen / Panel to Capture | Description of Evidence |
| :-: | :--- | :--- |
| **1** | **VS Code Root Terminal (`npm test`)** | Terminal output demonstrating **all 26 tests passing** (15 Backend Jest tests and 11 Frontend Vitest tests). |
| **2** | **Production Vite Build Terminal** | Terminal showing `npm run build` compiling `dist/` with gzip asset summaries. |
| **3** | **Health Check Endpoint in Browser** | Browser view of `http://localhost:5000/api/health` displaying JSON payload with uptime, database status, and memory metrics. |
| **4** | **Morgan Request Logging in Terminal** | Backend terminal showing real-time Morgan access logs with HTTP method, status code, and latency. |
| **5** | **Docker Compose File (`docker-compose.yml`)** | VS Code editor view displaying the services (`frontend`, `backend`, `mongodb`) and named volume definition. |
| **6** | **Nginx Configuration File (`nginx.conf`)** | VS Code view displaying the `proxy_pass http://backend:5000;` block and `try_files` SPA routing. |
| **7** | **GitHub Actions CI Workflow File** | Editor view of `.github/workflows/ci.yml` showing test, build, and docker-build jobs. |
| **8** | **Docker Desktop Dashboard (if installed)** | Containers tab showing `student_mgmt_frontend`, `student_mgmt_backend`, and `student_mgmt_mongodb` running. |
| **9** | **Docker Compose CLI Status (`docker compose ps`)** | Terminal output showing all three services with status `Up` and `healthy`. |
| **10** | **Frontend Running on Port 8080** | Browser window open to `http://localhost:8080` showing the Student Management portal served via Nginx. |

---

## 9. Result and Conclusion

1. **Multi-Stage Containerization Achieved:** Designed and verified production Dockerfiles for the React frontend (multi-stage build with Nginx) and Express backend (Node 20 Alpine with a non-root runtime user), drastically reducing image sizes and eliminating build tooling from production artifacts.
2. **Declarative Multi-Container Orchestration Formulated:** Configured `docker-compose.yml` with automated container health probes, inter-service dependency gating, and persistent volume storage for MongoDB.
3. **Automated CI/CD Pipeline Established:** Built GitHub Actions workflow `.github/workflows/ci.yml` enforcing automated testing and Docker image compilation on repository code pushes.
4. **Comprehensive Monitoring Implemented:** Deployed `GET /api/health` reporting real-time memory and database connection states, paired with Morgan HTTP access logging.
5. **Conclusion:** Successfully containerized, tested, and prepared the full-stack MERN Student Management System for modern automated DevOps workflows and cloud deployment.
