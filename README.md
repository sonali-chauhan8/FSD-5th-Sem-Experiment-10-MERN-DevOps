# Student Management System - DevOps, Docker & CI/CD
### B.Tech V Semester — Full Stack Development Laboratory (Experiment No. 10)

A containerized, monitored, and automated production-ready full-stack MERN application (React + Vite, Express + Node.js, MongoDB) equipped with multi-stage Docker builds, Nginx reverse proxying, declarative Docker Compose orchestration, and automated GitHub Actions CI/CD workflows.

---

## 📁 Directory Structure

```text
question10-mern-devops/
├── docker-compose.yml                    # Multi-container orchestration (frontend, backend, mongo)
├── package.json                          # Unified root script runner
├── README.md                             # Step-by-step lab instructions & documentation
├── EXPERIMENT_10_REPORT.md                # Formal 9-section lab report
├── .env.example                          # Root environment template for Docker Compose
├── .env                                  # Root environment variables
├── .dockerignore                         # Global Docker ignore specification
│
├── .github/
│   └── workflows/
│       ├── ci.yml                        # Automated CI: tests, builds & Docker validation
│       └── cd.yml                        # Optional CD: deployment triggers to cloud hosts
│
├── backend/                              # Express REST API with Health Monitoring
│   ├── Dockerfile                        # Production Node.js Alpine container with non-root user
│   ├── .dockerignore                     # Backend Docker ignore rules
│   ├── .env                              # Local dev environment
│   ├── .env.test                         # Isolated test database environment
│   ├── .env.example                      # Backend environment template
│   ├── app.js                            # Modular Express app with Morgan logging & /api/health
│   ├── server.js                         # Production listener and Mongoose bootstrap
│   ├── package.json                      # Backend dependencies & Jest test runner
│   ├── render.yaml                       # Cloud deployment blueprint for Render Web Service
│   ├── config/
│   │   └── db.js                         # Database connector with graceful connection handling
│   ├── controllers/
│   │   └── studentController.js          # CRUD endpoint business logic
│   ├── models/
│   │   └── Student.js                    # Mongoose schema
│   ├── routes/
│   │   └── studentRoutes.js              # Express student routes
│   └── tests/
│       ├── health.test.js                # Health check and monitoring endpoint tests
│       ├── student.test.js               # 12 Jest & Supertest CRUD integration tests
│       └── exp8_legacy_verification.js   # Archived standalone verification script
│
└── frontend/                             # React + Vite Single Page Application
    ├── Dockerfile                        # Multi-stage Docker build (Vite build -> Nginx Alpine)
    ├── nginx.conf                        # Nginx reverse proxy (/api/) & SPA router fallback
    ├── .dockerignore                     # Frontend Docker ignore rules
    ├── .env                              # Frontend API base URL configuration
    ├── .env.example                      # Frontend environment template
    ├── vercel.json                       # Cloud deployment configuration for Vercel
    ├── vite.config.js                    # Vite configuration with Vitest integration
    ├── package.json                      # Frontend dependencies & Vitest runner
    ├── index.html                        # Application entry HTML
    └── src/
        ├── App.jsx                       # Client routing
        ├── components/                   # Navbar, StudentTable, StatCard, Modals
        ├── pages/                        # Dashboard, StudentList, AddStudent, About
        ├── services/
        │   └── api.js                    # Axios client
        └── test/
            ├── setup.js                  # Vitest DOM matchers setup
            ├── AddStudent.test.jsx       # 6 component tests (rendering, validation, mock API)
            └── StudentList.test.jsx      # 5 component tests (search, filter, hydration)
```

---

## ⚙️ Quick Start (Running Without Docker)

If Docker is not installed on your system, you can run the entire application and automated tests directly using Node.js:

### 1. Run All Automated Tests (Backend + Frontend)
```bash
npm test
```
*Executes all 15 backend Jest integration tests and 11 frontend Vitest component tests.*

### 2. Run Production Vite Build
```bash
npm run build
```

### 3. Start Local Development Servers
Open two separate terminal windows in VS Code:
- **Terminal 1 (Backend):**
  ```bash
  cd backend
  npm run dev
  ```
  API starts on `http://localhost:5000` (Health monitor: `http://localhost:5000/api/health`)
- **Terminal 2 (Frontend):**
  ```bash
  cd frontend
  npm run dev
  ```
  Frontend starts on `http://localhost:5173`

---

## 🐳 Running with Docker & Docker Compose

When Docker Desktop is installed and running on your machine:

### Step 1: Validate Compose Specification
```bash
docker compose config
```

### Step 2: Build and Launch Containers
```bash
docker compose up --build -d
```
*Builds the multi-stage frontend image with Nginx, builds the backend image, pulls MongoDB, and initializes all three services with health checks on an isolated network.*

### Step 3: Verify Running Services
```bash
docker compose ps
```
All three services should show status `Up` and `healthy`:
- **Frontend Web UI:** `http://localhost:8080`
- **Backend Health Check:** `http://localhost:5001/api/health`
- **MongoDB Database:** Container port `27017` mapped to host `27018`

### Step 4: Inspect Live Logs
```bash
# View combined logs
docker compose logs -f

# View backend Morgan access logs
docker compose logs -f backend
```

### Step 5: Stop Containers
```bash
# Stop containers while preserving database volume
docker compose down

# Stop containers and remove volume (clean reset)
docker compose down -v
```

---

## ☁️ Cloud Deployment Guide (Vercel + Render + MongoDB Atlas)

### 1. MongoDB Atlas (Cloud Database)
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere).
3. Under **Database Access**, create a user and copy the connection string:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/student_management_prod?retryWrites=true&w=majority`

### 2. Express Backend Deployment (Render)
1. Create a free Web Service on [Render](https://render.com).
2. Connect your Git repository and select directory `backend`.
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `node server.js`
5. Configure Environment Variables in Render Dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGODB_URI`: `<Your MongoDB Atlas connection string>`
   - `CLIENT_URL`: `https://your-frontend.vercel.app` (Your Vercel URL)

### 3. React Frontend Deployment (Vercel)
1. Import your Git repository into [Vercel](https://vercel.com).
2. Set **Root Directory:** `frontend`.
3. Configure Environment Variables in Vercel:
   - `VITE_API_BASE_URL`: `https://your-backend.onrender.com/api`
4. The provided `frontend/vercel.json` automatically manages client-side SPA route rewrites to `index.html`.

---

## 🔄 CI/CD Workflow Overview

The included `.github/workflows/ci.yml` pipeline triggers automatically on any push or pull request to `main`:
1. **Job 1 (Backend):** Boots an ephemeral MongoDB 7.0 container in GitHub Actions and runs all 15 backend Jest integration tests.
2. **Job 2 (Frontend):** Executes 11 Vitest component tests and builds the Vite production bundle.
3. **Job 3 (Docker):** Runs `docker build` on both `backend/Dockerfile` and `frontend/Dockerfile` to guarantee buildability before deployment.

---

## 🛠️ Troubleshooting

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| `docker : The term 'docker' is not recognized` | Docker Desktop is not installed or not in PATH | Install Docker Desktop for Windows or run using `npm test` and `npm run dev` locally. |
| Port 5000 already in use | Another Node process is running on port 5000 | Terminate the existing process via Task Manager or update `PORT` in `.env`. |
| Port 8080 already in use | Host port 8080 is claimed by another application | Change `"8080:80"` in `docker-compose.yml` to `"8081:80"` and access `http://localhost:8081`. |
| Cannot connect to MongoDB in Docker | Backend started before MongoDB was ready | `docker-compose.yml` uses `condition: service_healthy` to guarantee MongoDB is fully ready before the backend boots. |
