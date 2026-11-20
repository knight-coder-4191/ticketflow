# TicketFlow: Role-Based Customer Support Ticket Management Web Application

> **Industrial Training Project Report Implementation**  
> **Author:** Ayush Singh (UID: `24BCS12292`)  
> **Degree:** Bachelor of Engineering in Computer Science and Engineering, Chandigarh University  
> **Mentor / Supervisor:** Vaibhav Sonar  
> **Company Context:** Persistent Systems, Bengaluru  

---

## 1. Project Overview

**TicketFlow** is a full-stack web application designed to eliminate lost requests, lack of ownership, and absent metrics in customer support workflows. Built on the **MERN** stack (MongoDB, Express.js, React, Node.js), it establishes a structured support lifecycle governed by strict server-side **Role-Based Access Control (RBAC)**.

### Three User Personas:
1. **Customer**: Submits support tickets, tracks status (`Open`, `In Progress`, `Resolved`), and converses through threaded comments.
2. **Support Agent**: Inspects tickets assigned specifically to them, posts technical replies, and transitions statuses.
3. **Administrator**: Exercises organizational visibility over all tickets, assigns agents, and analyzes executive KPIs ($T_{avg}$, ticket volume, category & priority distribution).

---

## 2. Architecture & Design

```
[ Presentation Layer ]  -->  React SPA + Tailwind CSS + Context API + Interactive Charts
         │
         ▼ (HTTPS / REST API calls with JWT Bearer Token in Authorization Header)
[ Application Layer ]   -->  Node.js & Express.js REST API + RBAC & Validation Middleware
         │
         ▼ (Mongoose ODM / Embedded Document Persistence)
[ Data Layer ]          -->  MongoDB (Users, Tickets, Comments)
```

### Pre-Configured Demo Accounts (Ready to Test)

| Persona | Email | Password | Role Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ticketflow.com` | `admin123` | Assign agents, view all tickets, executive analytics dashboard |
| **Support Agent 1** | `agent@ticketflow.com` | `agent123` | Manage assigned tickets, update status, reply via comments |
| **Support Agent 2** | `agent2@ticketflow.com` | `agent123` | Manage assigned tickets, update status, reply via comments |
| **Customer 1** | `customer@ticketflow.com` | `customer123` | Create tickets, view own tickets, converse on tickets |
| **Customer 2** | `customer2@ticketflow.com` | `customer123` | Create tickets, view own tickets, converse on tickets |

---

## 3. REST API Specification

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register account with hashed password |
| `POST` | `/api/auth/login` | Public | Authenticate credentials and receive signed JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |
| `GET` | `/api/auth/agents` | Admin | Retrieve list of eligible support agents |
| `POST` | `/api/tickets` | Customer | Raise a new ticket (Status: `Open`) |
| `GET` | `/api/tickets` | Authenticated (RBAC) | List tickets with filters (`search`, `status`, `priority`, `category`) |
| `GET` | `/api/tickets/:id` | Authenticated (Ownership) | Retrieve ticket details and timestamps |
| `PUT` | `/api/tickets/:id/assign` | Admin | Assign ticket to an agent |
| `PUT` | `/api/tickets/:id/status` | Agent, Admin | Transition ticket state (`In Progress`, `Resolved` with `resolvedAt`) |
| `POST` | `/api/tickets/:id/comments` | Authenticated (Ownership) | Append chronological comment |
| `GET` | `/api/tickets/:id/comments` | Authenticated (Ownership) | Retrieve comment thread |
| `GET` | `/api/tickets/stats` | Admin | Calculate dashboard statistics & $T_{avg}$ |

---

## 4. Quick Start & Execution

### Running the Application
The backend features dual-mode execution: it runs seamlessly with standard MongoDB or automatically utilizes the built-in embedded document store and web server:

```powershell
# Navigate to the server directory
cd C:\Users\acer\.gemini\antigravity\scratch\ticketflow\server

# Run the server
node src/server.js
```

Once started, open your web browser at:
👉 **`http://localhost:5000`**

The single-page web application will load immediately with one-click persona switchers (`Customer`, `Agent`, `Admin`), real-time ticket queues, and the analytics dashboard.

---

## 5. Automated 16-Case Functional Validation

TicketFlow includes an automated verification script that executes every test scenario defined in **Table 4.1** of the Project Report:

```powershell
cd C:\Users\acer\.gemini\antigravity\scratch\ticketflow\server
node tests/run-tests.js
```

### Verified Test Cases:
* **TC-01:** Register new user with hashed password (`201 Created`).
* **TC-02:** Duplicate email registration rejection (`400 Bad Request`).
* **TC-03:** Valid credential authentication and JWT token issuance (`200 OK`).
* **TC-04:** Invalid password rejection (`401 Unauthorized`).
* **TC-05:** Protected endpoint rejection without Bearer token (`401 Unauthorized`).
* **TC-06:** Customer ticket creation with initial `Open` status (`201 Created`).
* **TC-07:** Input validation rejects empty ticket titles (`400 Bad Request`).
* **TC-08:** Privilege escalation check: customer blocked from assigning tickets (`403 Forbidden`).
* **TC-09:** Admin assigns ticket to designated agent (`200 OK`).
* **TC-10:** Validation check: assigning ticket to non-agent is rejected (`400 Bad Request`).
* **TC-11:** Agent status update records `In Progress` and `Resolved` with `resolvedAt` timestamp.
* **TC-12:** Privacy isolation: Customer cannot inspect another customer's ticket (`403 Forbidden`).
* **TC-13:** Threaded comments persisted with author details and timestamps (`201 Created`).
* **TC-14:** Status filtering accurately isolates subsets (`Resolved`, etc.).
* **TC-15:** Statistical calculation verifies $T_{avg} = \frac{1}{N} \sum (T_r - T_c)$.
* **TC-16:** Operational health check verification.

---

## 6. Directory Structure

```
ticketflow/
├── README.md
├── server/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── ticketController.js
│   │   │   └── statsController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── role.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Ticket.js
│   │   │   └── Comment.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── ticketRoutes.js
│   │   └── utils/
│   │       ├── security.js
│   │       ├── seed.js
│   │       └── expressFallback.js
│   └── tests/
│       └── run-tests.js
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    ├── public/
    │   └── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── context/
        │   └── AuthContext.jsx
        └── services/
            └── api.js
```
