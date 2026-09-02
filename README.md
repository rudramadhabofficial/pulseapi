# PulseAPI

> API reliability and incident monitoring platform that continuously monitors registered APIs, tracks performance, detects failures, and automatically manages incidents and recovery.

PulseAPI is a full-stack API monitoring platform built with React, Node.js, Express, TypeScript, and PostgreSQL.

The platform allows users to register API endpoints, configure health-check expectations, continuously monitor endpoint availability and response time, visualize performance history, and automatically detect and resolve incidents.

Each user's monitored APIs are isolated to their own account, providing a private monitoring dashboard.

---

# How PulseAPI Works

PulseAPI consists of four primary components:

```text
                         ┌─────────────────────┐
                         │        USER         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   React Dashboard   │
                         │    TypeScript UI    │
                         └──────────┬──────────┘
                                    │
                              REST API
                                    │
                         ┌──────────▼──────────┐
                         │    Express API      │
                         │ Node.js + TypeScript│
                         └──────────┬──────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      │                           │
                      ▼                           ▼
               ┌─────────────┐           ┌───────────────┐
               │ PostgreSQL  │           │ Monitor Worker│
               │  Database   │◄──────────│ Node.js       │
               └─────────────┘           └───────┬───────┘
                                                  │
                                                  │ HTTP
                                                  │ Health Checks
                                                  ▼
                                         ┌──────────────────┐
                                         │ Registered APIs  │
                                         │ External/Target  │
                                         │    Endpoints     │
                                         └──────────────────┘
````

### Core Flow

```text
User
  ↓
Register / Login
  ↓
Create API Endpoint
  ↓
Configure Method + Expected Status + Timeout
  ↓
Endpoint Stored in PostgreSQL
  ↓
Monitoring Worker Detects Endpoint
  ↓
Worker Performs Health Check
  ↓
Measure HTTP Status + Response Time
  ↓
Store Check Result
  ↓
Update Endpoint Health
  ↓
Dashboard Displays Current Status
  ↓
Failure Detection
  ↓
3 Consecutive Failures
  ↓
Incident Created
  ↓
Endpoint Marked DOWN
  ↓
Endpoint Recovers
  ↓
Incident Automatically Resolved
  ↓
Endpoint Marked HEALTHY
```

---

# Monitoring Workflow

The monitoring worker operates independently from the main API server.

Every 60 seconds, the worker retrieves registered endpoints and performs health checks concurrently.

```text
                 ┌──────────────────────┐
                 │ Monitoring Worker     │
                 │ Runs Every 60 Seconds │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Load Registered APIs │
                 │    from Database     │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Run Health Checks     │
                 │      Concurrently     │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Measure              │
                 │ • HTTP Status        │
                 │ • Response Time      │
                 │ • Success / Failure  │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Store Check Result   │
                 │    in PostgreSQL     │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Evaluate Endpoint    │
                 │       Health         │
                 └──────────┬───────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
              Success                Failure
                 │                     │
                 ▼                     ▼
             Healthy             Failure Count
                                       │
                                       ▼
                              3 Consecutive Failures
                                       │
                                       ▼
                                Create Incident
                                       │
                                       ▼
                                  API = DOWN
```

---

# Health Status

Each monitored endpoint can be displayed using one of three primary states:

```text
┌───────────────┐
│    HEALTHY    │
│ API responding│
│   normally    │
└───────────────┘

┌───────────────┐
│   DEGRADED    │
│ Performance or│
│ response issue│
└───────────────┘

┌───────────────┐
│      DOWN     │
│ API unavailable│
│ / failed checks│
└───────────────┘
```

The dashboard dynamically reflects the current health state of registered endpoints.

---

# Incident Detection Workflow

PulseAPI intentionally requires **3 consecutive failed health checks** before creating an incident.

This reduces the chance of treating a temporary network problem or isolated request failure as a full service outage.

```text
Health Check #1
      │
      ├── Success → Reset Failure State
      │
      └── Failure
            ↓
       Failure Count = 1

Health Check #2
      │
      ├── Success → Reset Failure State
      │
      └── Failure
            ↓
       Failure Count = 2

Health Check #3
      │
      ├── Success → Reset Failure State
      │
      └── Failure
            ↓
       Failure Count = 3
            ↓
     Create Incident
            ↓
      Endpoint = DOWN
```

### Why three failures?

```text
Single Failure
     ↓
Could be temporary
     ↓
Do not immediately create incident

Three Consecutive Failures
     ↓
Higher confidence of actual failure
     ↓
Create Incident
```

This approach helps avoid noisy incident creation caused by isolated network failures.

---

# Incident Recovery Workflow

PulseAPI automatically resolves an active incident when the monitored endpoint successfully recovers.

```text
              API DOWN
                 │
                 ▼
        Monitoring Continues
                 │
                 ▼
        Health Check Executed
                 │
          ┌──────┴──────┐
          │             │
        Failed        Success
          │             │
          ▼             ▼
      Stay DOWN     API Recovers
                        │
                        ▼
                Resolve Incident
                        │
                        ▼
                 Record Recovery
                        │
                        ▼
                  API = HEALTHY
```

The incident history preserves information about when an endpoint went down and when it recovered.

---

# Endpoint Registration Workflow

Users can configure exactly what a successful API health check should look like.

```text
User
 │
 ▼
Add Endpoint
 │
 ▼
Enter API URL
 │
 ▼
Select HTTP Method
 │
 ▼
Set Expected Status Code
 │
 ▼
Set Timeout Limit
 │
 ▼
Save Endpoint
 │
 ▼
Store Configuration
 │
 ▼
PostgreSQL
 │
 ▼
Monitoring Worker
 │
 ▼
Endpoint Included in Health Checks
```

Supported configuration includes:

* API URL
* HTTP method
* Expected HTTP status code
* Timeout limit

---

# User Data Isolation

Each user has a private monitoring environment.

```text
                 USERS
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
    User A                  User B
       │                       │
       ▼                       ▼
  API Endpoints           API Endpoints
       │                       │
       ▼                       ▼
 Monitoring Data          Monitoring Data
       │                       │
       └───────────┬───────────┘
                   │
               PostgreSQL
```

Authenticated API requests are associated with the current user so that users only access the endpoints and monitoring information belonging to their account.

---

# Authentication Workflow

PulseAPI uses bcrypt for password hashing and JWT for authenticated sessions.

```text
                  USER
                   │
                   ▼
            Register Account
                   │
                   ▼
            Password Hashing
                bcrypt
                   │
                   ▼
             Store User
                   │
                   ▼
              Login
                   │
                   ▼
          Verify Credentials
                   │
                   ▼
             Generate JWT
                   │
                   ▼
          Return Auth Token
                   │
                   ▼
              Client
                   │
                   ▼
       Protected API Request
                   │
                   ▼
            Verify JWT
                   │
                   ▼
          Identify User
                   │
                   ▼
      Check User-Owned Resources
                   │
                   ▼
        Process Authorized Request
```

Passwords are never stored as plain text.

---

# Endpoint Details & Analytics

Selecting an endpoint opens its details view.

The endpoint details page provides historical monitoring information, including response-time data.

```text
Endpoint
   │
   ▼
Endpoint Details
   │
   ├───────────────┐
   │               │
   ▼               ▼
Current Status   Historical Checks
                       │
                       ▼
                Response Times
                       │
                       ▼
                  Area Chart
                       │
                       ▼
              Identify Latency Spikes
```

The response-time chart makes it easier to identify changes in endpoint performance over time.

---

# Monitoring Data

Each health check records monitoring telemetry including:

```text
Health Check
    │
    ├── Endpoint
    ├── Timestamp
    ├── HTTP Status Code
    ├── Response Time
    └── Success / Failure
```

This information forms the basis for endpoint status, historical monitoring, and performance visualization.

---

# Response Time & Performance

PulseAPI tracks response times for monitored APIs.

The dashboard can use historical response-time data to visualize endpoint performance.

Performance metrics include:

* Response time
* Historical response times
* Uptime information
* P95 latency
* Endpoint health status

The endpoint details interface uses an area chart to visualize recent response-time behavior.

---

# Complete Monitoring Lifecycle

The complete lifecycle of a monitored endpoint can be summarized as:

```text
                  REGISTER API
                       │
                       ▼
               CONFIGURE CHECK
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
        HTTP Method       Expected Status
              │                 │
              └────────┬────────┘
                       │
                       ▼
                MONITOR EVERY
                  60 SECONDS
                       │
                       ▼
                HEALTH CHECK
                       │
                       ▼
          ┌────────────┴────────────┐
          │                         │
       SUCCESS                    FAILURE
          │                         │
          ▼                         ▼
     Store Result            Increment Failure
          │                         │
          ▼                         ▼
      HEALTHY                Count < 3 ?
                                    │
                              ┌─────┴─────┐
                              │           │
                             YES          NO
                              │           │
                              ▼           ▼
                       Wait for Next   CREATE INCIDENT
                          Check            │
                                           ▼
                                         DOWN
                                           │
                                           ▼
                                    Continue Monitoring
                                           │
                                           ▼
                                     API Recovers
                                           │
                                           ▼
                                  RESOLVE INCIDENT
                                           │
                                           ▼
                                        HEALTHY
```

---

# Features

## User Accounts & Security

* User registration
* User login
* bcrypt password hashing
* JWT authentication
* Protected routes
* User-specific data isolation

---

## API Endpoint Management

Users can register APIs and configure:

* Endpoint URL
* HTTP method
* Expected status code
* Timeout limit

Each user can manage their own registered endpoints.

---

## Automated Monitoring

A dedicated Node.js worker:

* Runs every 60 seconds
* Retrieves registered endpoints
* Executes health checks concurrently
* Measures response time
* Records HTTP status codes
* Records success/failure results
* Stores monitoring data in PostgreSQL

---

## Smart Incident Detection

PulseAPI:

* Tracks consecutive failures
* Requires 3 consecutive failures before creating an incident
* Automatically marks affected endpoints as DOWN
* Maintains incident history
* Detects recovery
* Automatically resolves incidents

---

## Performance Analytics

The endpoint details page provides:

* Response-time history
* Area chart visualization
* Uptime information
* P95 latency
* Historical health-check data

---

## Dashboard

The dashboard provides a centralized view of monitored APIs.

Each endpoint can be displayed as:

```text
HEALTHY
DEGRADED
DOWN
```

The status is updated based on monitoring results.

---

# Technology Stack

## Frontend

| Technology | Purpose                            |
| ---------- | ---------------------------------- |
| React      | Web application interface          |
| TypeScript | Static type safety                 |
| Area Chart | Response-time visualization        |
| CSS        | Custom UI and glassmorphism design |

## Backend

| Technology | Purpose                       |
| ---------- | ----------------------------- |
| Node.js    | Runtime                       |
| Express.js | REST API framework            |
| TypeScript | Type-safe backend development |
| JWT        | Authentication                |
| bcrypt     | Password hashing              |

## Monitoring Worker

| Technology               | Purpose                       |
| ------------------------ | ----------------------------- |
| Node.js                  | Worker runtime                |
| HTTP Requests            | Endpoint health checks        |
| Concurrent Processing    | Monitoring multiple endpoints |
| Timeout Handling         | Prevent stalled health checks |
| Retry / Failure Handling | Reliable monitoring           |

## Database

| Technology          | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| PostgreSQL          | Primary relational database                       |
| SQL                 | Data persistence and queries                      |
| Indexes             | Query performance                                 |
| Relational Modeling | User, endpoint, check, and incident relationships |

## DevOps

| Technology     | Purpose                     |
| -------------- | --------------------------- |
| Docker         | Containerization            |
| Docker Compose | Multi-service orchestration |
| Git            | Version control             |
| GitHub         | Repository hosting          |
| GitHub Actions | Automated CI/CD             |

---

# System Architecture

PulseAPI separates user-facing applications, API services, background monitoring, and persistence.

```text
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                        │
│                                                             │
│                 React + TypeScript Dashboard                │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ REST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                          API LAYER                          │
│                                                             │
│                  Node.js + Express + TypeScript             │
│                                                             │
│        Authentication │ Endpoints │ Incidents │ Analytics  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌─────────────────────────┐      ┌────────────────────────────┐
│       PostgreSQL        │      │     Monitoring Worker      │
│                         │      │                            │
│ Users                   │      │ Runs every 60 seconds      │
│ Endpoints               │◄─────│ Performs health checks     │
│ Health Checks           │      │ Records telemetry          │
│ Incidents               │      │ Detects failures           │
└─────────────────────────┘      │ Resolves incidents        │
                                 └─────────────┬──────────────┘
                                               │
                                               │ HTTP
                                               ▼
                                    ┌────────────────────────┐
                                    │   Registered API       │
                                    │      Endpoints         │
                                    └────────────────────────┘
```

---

# Backend Request Flow

A typical authenticated request follows:

```text
Client
  ↓
HTTP Request
  ↓
Express Router
  ↓
JWT Authentication
  ↓
User Identification
  ↓
Authorization / Ownership Check
  ↓
Request Validation
  ↓
Business Logic
  ↓
PostgreSQL
  ↓
Response
  ↓
React Dashboard
```

---

# Monitoring Worker Architecture

The worker operates independently from the main API server.

```text
                 ┌──────────────────────┐
                 │   Monitoring Worker   │
                 └──────────┬───────────┘
                            │
                      Every 60 Seconds
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Fetch Endpoints      │
                 │ from PostgreSQL      │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Concurrent Health    │
                 │ Checks               │
                 └──────────┬───────────┘
                            │
               ┌────────────┼────────────┐
               │            │            │
               ▼            ▼            ▼
             API A        API B        API C
               │            │            │
               └────────────┼────────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Store Results        │
                 │ PostgreSQL           │
                 └──────────┬───────────┘
                            │
                            ▼
                 Evaluate Endpoint State
```

Keeping the worker separate from the main API server allows monitoring work to operate independently from user-facing API requests.

---

# Database Design

PulseAPI uses PostgreSQL to persist application and monitoring data.

The conceptual data relationships are:

```text
┌─────────────┐
│    Users    │
└──────┬──────┘
       │
       │ owns
       ▼
┌─────────────┐
│  Endpoints  │
└──────┬──────┘
       │
       ├─────────────────────┐
       │                     │
       │ has                 │ has
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│Health Checks│       │  Incidents  │
└─────────────┘       └─────────────┘
```

### Health Check Data

Health-check records contain information such as:

* Endpoint
* Timestamp
* HTTP status code
* Response time
* Success/failure state

### Incident Data

Incident records maintain information about:

* Affected endpoint
* Failure event
* Incident state
* Recovery event
* Incident history

---

# API Architecture

The backend exposes RESTful APIs used by the React dashboard.

The API is responsible for:

* Authentication
* User management
* Endpoint registration
* Endpoint configuration
* Endpoint retrieval
* Monitoring data retrieval
* Incident management
* Analytics data
* Ownership checks

All protected operations require valid authentication.

---

# Project Structure

```text
pulseapi/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── worker/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── ...
│
├── .github/
│   └── workflows/
│       └── main.yml
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

> The exact directory structure depends on the implementation in the repository.

---

# Getting Started

## Prerequisites

Install the following:

* Node.js LTS
* npm
* Git
* Docker
* Docker Compose

Verify the installations:

```bash
node --version
npm --version
git --version
docker --version
docker compose version
```

---

# Clone the Repository

```bash
git clone https://github.com/rudramadhabofficial/pulseapi.git
cd pulseapi
```

---

# Environment Configuration

PulseAPI uses environment variables for configuration and sensitive values.

Create the required environment files from the provided `.env.example` files.

Example:

```bash
cp .env.example .env
```

A typical configuration may contain values such as:

```env
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

Use the actual environment variables required by the implementation.

## Security

Never commit real credentials or secrets.

Do not commit:

```text
.env
.env.local
Database passwords
JWT secrets
API credentials
Private keys
```

The repository should only contain safe example configuration through `.env.example`.

---

# Running with Docker

PulseAPI provides Docker Compose configuration for running the application stack.

From the repository root:

```bash
docker compose up --build
```

To run in detached mode:

```bash
docker compose up --build -d
```

Check running services:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs
```

Stop the stack:

```bash
docker compose down
```

---

# Running Services Individually

If you prefer to run the services without Docker, install dependencies in each application directory.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Backend

Open another terminal:

```bash
cd backend
npm install
npm run dev
```

---

## Monitoring Worker

Open another terminal:

```bash
cd worker
npm install
npm run dev
```

The worker should remain running so that scheduled monitoring checks can execute.

> Use the exact scripts defined in each `package.json` if they differ from the examples above.

---

# Monitoring Configuration

Each endpoint can be configured with:

```text
Endpoint URL
     +
HTTP Method
     +
Expected Status Code
     +
Timeout
```

For example:

```text
URL:
https://example.com/api/health

Method:
GET

Expected Status:
200

Timeout:
5000 ms
```

The monitoring worker uses these values when performing health checks.

---

# Health Check Process

For each monitoring cycle:

```text
1. Load registered endpoints
2. Start health checks
3. Send configured HTTP request
4. Apply timeout limit
5. Capture HTTP status
6. Measure response time
7. Determine success/failure
8. Store result
9. Update endpoint state
10. Evaluate incident conditions
```

---

# Incident Rules

PulseAPI uses consecutive failures to determine when an incident should be created.

```text
Failure 1
   ↓
No Incident

Failure 2
   ↓
No Incident

Failure 3
   ↓
CREATE INCIDENT
   ↓
Endpoint = DOWN
```

When the endpoint successfully responds again:

```text
Successful Check
      ↓
Endpoint Recovered
      ↓
Resolve Open Incident
      ↓
Endpoint = HEALTHY
```

---

# Analytics

PulseAPI stores health-check telemetry that can be used to analyze endpoint behavior.

The dashboard provides performance information including:

* Response time
* Historical response times
* Uptime
* P95 latency
* Current health state
* Incident history

The endpoint details page visualizes response-time history using an area chart.

---

# UI Design

The dashboard uses a custom glassmorphism-inspired design system.

The interface includes:

* Dark visual presentation
* Gradient backgrounds
* Frosted glass panels
* Status indicators
* Responsive layouts
* Endpoint monitoring cards
* Interactive endpoint details
* Response-time visualization
* Subtle interface animations

The goal is to present monitoring information clearly while maintaining a modern dashboard experience.

---

# Testing

Run the configured test suite from the relevant application directory.

Example:

```bash
npm test
```

If coverage is configured:

```bash
npm run test:coverage
```

Before pushing changes, verify the available build and test commands.

Example:

```bash
npm test
npm run build
```

Use the scripts defined in the project's `package.json` as the source of truth.

---

# CI/CD

PulseAPI includes a GitHub Actions workflow:

```text
.github/workflows/main.yml
```

The workflow automatically runs when changes are pushed to the `main` branch.

The CI process follows the general flow:

```text
Developer Push
      ↓
GitHub Repository
      ↓
GitHub Actions
      ↓
Install Dependencies
      ↓
Build Project
      ↓
Workflow Result
```

This provides automated verification that the project can be installed and built successfully.

---

# Docker Architecture

The complete application stack is orchestrated through Docker Compose.

```text
                  Docker Compose
                        │
       ┌────────────────┼─────────────────┐
       │                │                 │
       ▼                ▼                 ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│ Frontend   │    │ Backend    │    │ PostgreSQL │
│ React      │    │ Node/      │    │ Database   │
│ TypeScript │    │ Express    │    │            │
└─────┬──────┘    └─────┬──────┘    └─────▲──────┘
      │                  │                 │
      │                  └─────────────────┘
      │
      │
      │            ┌──────────────┐
      └────────────│ Worker       │
                   │ Node.js      │
                   │ Health Check │
                   └──────┬───────┘
                          │
                          ▼
                   Target APIs
```

The stack can therefore be started using a single Docker Compose command when the environment is configured correctly.

---

# Error Handling

The backend handles common application and monitoring failures including:

* Invalid authentication
* Unauthorized resource access
* Invalid endpoint configuration
* Timeout failures
* Failed HTTP requests
* Invalid requests
* Missing resources
* Database errors
* Unexpected server errors

The monitoring worker also handles failed health checks without allowing a single failure to immediately create an incident.

---

# Security Considerations

Security measures include:

* bcrypt password hashing
* JWT authentication
* Protected API routes
* User-level data isolation
* Resource ownership checks
* Environment-based secret configuration
* No hard-coded credentials
* Input validation
* Controlled access to protected operations

---

# Performance Considerations

PulseAPI is designed to monitor multiple endpoints concurrently rather than processing every endpoint sequentially.

Performance-related considerations include:

* Concurrent health checks
* Request timeouts
* Retry/failure handling
* PostgreSQL indexes
* Stored response-time telemetry
* P95 latency analysis
* Separate background monitoring worker

The monitoring worker is separated from the user-facing API server so that scheduled health checks do not need to execute inside normal dashboard request handling.

---

# Screenshots

Add screenshots of the completed application here.

### Dashboard

![PulseAPI Dashboard](docs/screenshots/dashboard.png)

### Endpoint Details

![Endpoint Details](docs/screenshots/endpoint-details.png)

### Incident History

![Incident History](docs/screenshots/incidents.png)

### Authentication

![Authentication](docs/screenshots/authentication.png)

> Replace these paths with the actual screenshots present in the repository.

---

# Development Workflow

A typical development workflow is:

```bash
# Check changes
git status

# Create a feature branch
git checkout -b feature/endpoint-analytics

# Make changes

# Stage changes
git add .

# Commit
git commit -m "feat: add endpoint analytics"

# Push
git push -u origin feature/endpoint-analytics
```

Example commit messages:

```text
feat: add endpoint monitoring
feat: implement incident recovery
feat: add response time analytics
feat: add endpoint configuration
fix: handle failed health checks
fix: prevent duplicate incidents
fix: improve authentication validation
refactor: separate monitoring worker
test: add monitoring service tests
docs: update monitoring workflow
```

---

# Engineering Decisions

## Separate Monitoring Worker

The monitoring process is implemented as a separate worker rather than running health checks directly inside the main API request lifecycle.

This keeps scheduled monitoring work independent from user-facing API operations.

---

## Three-Failure Incident Threshold

PulseAPI requires three consecutive failed checks before creating an incident.

This reduces false-positive incidents caused by isolated failures or temporary network issues.

---

## PostgreSQL

PostgreSQL was selected because monitoring data has strong relational relationships between users, endpoints, health checks, and incidents.

---

## JWT Authentication

JWT provides a stateless authentication mechanism for protecting REST API resources and identifying the current user.

---

## TypeScript

TypeScript is used to provide type safety across the application and reduce errors caused by inconsistent data structures.

---

## Docker Compose

Docker Compose provides a reproducible way to run the application's services and database locally.

---

# What I Learned

Building PulseAPI involved working across several areas of full-stack engineering:

* Designing REST APIs
* Implementing JWT authentication
* Secure password hashing with bcrypt
* Building React dashboards
* Managing TypeScript applications
* Designing PostgreSQL relationships
* Implementing background workers
* Performing concurrent HTTP health checks
* Measuring response time
* Handling timeouts and failures
* Designing incident detection logic
* Implementing automatic incident recovery
* Storing monitoring telemetry
* Visualizing performance data
* Working with Docker Compose
* Configuring GitHub Actions
* Designing user-level data isolation
* Structuring a multi-service application

---

# Future Improvements

Potential future improvements include:

* Email or push notifications
* More advanced alerting rules
* Custom monitoring intervals
* Additional HTTP request configuration
* Advanced incident analytics
* Extended uptime reporting
* More detailed monitoring dashboards
* Cloud deployment automation
* Expanded automated test coverage
* More sophisticated retry strategies

These features are outside the current core implementation.

---

# Project Goals

PulseAPI was built to demonstrate practical full-stack engineering with an emphasis on backend systems, monitoring, asynchronous processing, database design, and reliability.

```text
                     PULSEAPI
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
     FRONTEND         BACKEND          WORKER
      React            Node.js          Node.js
    TypeScript        Express          Async Jobs
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
                    PostgreSQL
                         │
                         ▼
                  Monitoring Data
                         │
                         ▼
              Incidents + Analytics
                         │
                         ▼
                 Docker + CI/CD
```

The project demonstrates an end-to-end monitoring system rather than a static dashboard.

---
