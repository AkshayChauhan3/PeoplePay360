# PeoplePay360 — Frontend Architecture & Viva Guide

> **Prepared for:** Frontend Technical Interview / Mentor Viva Presentation  
> **Role:** Frontend Engineer  
> **Project:** PeoplePay360 (HRMS & Payroll SaaS Platform)  
> **Tech Stack:** React 19, Vite, Vanilla CSS (Design Tokens & Glassmorphism), Lucide Icons, Axios

---

## 1. Executive Summary & Tech Stack

As the Frontend Engineer on **PeoplePay360**, I built a responsive, high-performance, single-page application (SPA) designed for HR managers, payroll administrators, and employees.

### Key Architectural Highlights
1. **Framework & Tooling:** React 19 with Vite for instant Hot Module Replacement (HMR) and optimized build times.
2. **Design System:** Custom CSS tokens defined in `index.css` featuring our brand palette — **Deep Purple (`#3B123F`)** and **Ocean Teal (`#005166`)**, styled with modern glassmorphism, subtle CSS micro-animations, and responsive CSS Grid/Flexbox layouts.
3. **State & Routing:** Lightweight state-driven view routing in `App.jsx` (`activeView`), eliminating routing overhead while enabling smooth view transitions.
4. **API & Authentication:** Centralized API service layer in `api.js` powered by Axios. Features automated JWT bearer header injection, `localStorage` persistence, and graceful offline fallback to interactive mock data if the backend server is unreachable.

---

## 2. Directory Structure Overview

```
frontend/
├── index.html              # HTML5 template & font imports (Inter)
├── package.json            # Node dependencies & scripts
├── vite.config.js          # Vite config & API proxy (/api -> http://127.0.0.1:8000)
├── .env                    # Frontend environment variables (VITE_API_URL)
└── src/
    ├── main.jsx            # React root mount point
    ├── App.jsx             # Top-level state orchestrator & view router
    ├── App.css             # Global utility styles
    ├── index.css           # Design Tokens, CSS variables, & Global UI layout styles
    ├── api.js              # Centralized Axios API service layer & mock fallbacks
    └── components/         # 23 Specialized React UI Components
        ├── Logo.jsx                  # Reusable SVG/Styled Brand Logo
        ├── Sidebar.jsx               # Left navigation bar with grouped categories
        ├── MainLayout.jsx            # Shell header, user dropdown, & view viewport
        ├── LoginPortal.jsx           # Enterprise auth portal (Login/Register)
        ├── DashboardPortal.jsx       # Executive summary & key KPI cards
        ├── DepartmentsView.jsx       # Workplace department directory
        ├── JobPositionsView.jsx      # Job role management & hiring status
        ├── EmployeeDirectoryView.jsx # Employee grid/table with filters & search
        ├── EmployeeProfileView.jsx   # 360-degree employee details & tabs
        ├── AllContractsView.jsx      # Master contract registry
        ├── ActiveContractsView.jsx   # Filtered view of active employment contracts
        ├── ContractDetailView.jsx    # Complete contract clause & compensation inspector
        ├── PayrunsView.jsx           # Payroll execution wizard & history
        ├── PayslipsView.jsx          # Itemized payslip generator & PDF exporter
        ├── SalaryRulesView.jsx       # Payroll deduction/allowance rules
        ├── SalaryStructuresView.jsx  # Salary band packages & compensation levels
        ├── AttendanceRecordsView.jsx # Daily time log tracking & late marks
        ├── TimeOffRequestsView.jsx   # Leave application & approval pipeline
        ├── TimeOffTypesView.jsx      # Leave policy definitions & carry-forward rules
        ├── LeaveAllocationsView.jsx  # Employee annual leave balance allocations
        ├── ReportsView.jsx           # Analytics reports & CSV export tools
        ├── MonthlyOverviewView.jsx   # Operational summary & monthly trends
        └── SettingsView.jsx          # System settings & user security options
```

---

## 3. Core Architecture Files Deep-Dive

### 📄 `index.html`
* **Purpose:** The single HTML entry page.
* **Key Details:** Loads Google Font *Inter* (weights 300, 400, 500, 600, 700) for clean typography, sets viewports for mobile responsiveness, and mounts `<div id="root"></div>`.

### 📄 `vite.config.js`
* **Purpose:** Development server and bundling configuration.
* **Key Feature:** Configured a local development proxy:
  ```js
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    }
  }
  ```
  *Why?* Prevents CORS issues in development by proxying API calls from port `5173` to FastAPI on port `8000`.

### 📄 `src/main.jsx`
* **Purpose:** Bootstraps the React application into the DOM root using `ReactDOM.createRoot`. Wrapped in `<React.StrictMode>` to catch potential side-effect bugs in development.

### 📄 `src/App.jsx`
* **Purpose:** Master state manager and view router.
* **Key Responsibilities:**
  1. **Auth State:** Manages `user` and `token` state. Checks `localStorage.getItem('token')` on initial mount to restore logged-in sessions.
  2. **View Navigation:** Holds `activeView` state (e.g., `'dashboard'`, `'employees'`, `'payruns'`).
  3. **Conditional Rendering:** If `user` is null, renders `<LoginPortal />`. Once authenticated, renders `<MainLayout />` containing the active component view.

### 📄 `src/api.js`
* **Purpose:** Centralized network abstraction layer.
* **Key Features:**
  * Uses `axios.create()` with baseURL `/api/v1`.
  * **Interceptors:** Automatically attaches `Authorization: Bearer <token>` to requests if a token exists in `localStorage`.
  * **Resilience:** Implements try/catch blocks with mock fallback datasets so the frontend remains 100% interactive even if the backend database is offline or starting up.

### 📄 `src/index.css`
* **Purpose:** Design System & CSS Engine.
* **Key Design Tokens:**
  * `--primary-purple: #3B123F` (Primary Brand Color)
  * `--ocean-teal: #005166` (Accent & Secondary Action Color)
  * `--bg-light: #F8F9FA`, `--surface-card: #FFFFFF`
  * Modern CSS Reset, custom scrollbars, keyframe animations (`@keyframes spin`), status badge utility classes, and glassmorphism backdrop filters.

---

## 4. Detailed Component Breakdown

### 🎨 Shell & Navigation Components

#### 1. `Logo.jsx`
* **Role:** Renders the PeoplePay360 brand identity.
* **Features:** Scalable badge icon with vibrant purple gradient and high-contrast typography. Accepts a `variant` prop for dark/light backgrounds.

#### 2. `Sidebar.jsx`
* **Role:** Primary left navigation bar.
* **Features:**
  * Groups 20+ sub-pages into 5 logical accordion sections: **Workplace**, **Employees**, **Payroll**, **Time Off**, and **Settings**.
  * Displays section titles in **bold uppercase**, active view indicator highlights, and badge counts for quick alerts (e.g., pending approvals).

#### 3. `MainLayout.jsx`
* **Role:** Global application container shell.
* **Features:**
  * Integrates `<Sidebar />` on the left and a responsive header on top.
  * Header includes global search, notification popover button, user avatar with quick status badge, and a **Logout** button.
  * Dynamically switches and renders the selected component inside `<main className="content-viewport">`.

---

### 🔐 Authentication & Executive Dashboards

#### 4. `LoginPortal.jsx`
* **Role:** User authentication screen.
* **Features:**
  * Tabbed interface for **Sign In** and **Register**.
  * Controlled form state, password visibility toggle eye button, and error state alerts.
  * Calls `api.login()`; on success, stores the JWT token and passes user data up to `App.jsx`.

#### 5. `DashboardPortal.jsx`
* **Role:** Executive high-level overview screen.
* **Features:**
  * Quick metric KPI cards (Total Employees, Active Payruns, Pending Leaves, Monthly Outflow).
  * Interactive Quick Actions (Run Payroll, Add Employee, Approve Leaves).
  * Recent company activity stream and visual chart representations.

---

### 🏢 Organization & Workforce Management

#### 6. `DepartmentsView.jsx`
* **Role:** Workplace department directory.
* **Features:** Displays department cards with headcount breakdown, manager badges, annual budget tracking, and "Add Department" modal.

#### 7. `JobPositionsView.jsx`
* **Role:** Job roles & designation catalog.
* **Features:** List of positions with pay grade bands, department tags, active vacancy counters, and requirement specs.

#### 8. `EmployeeDirectoryView.jsx`
* **Role:** Master employee directory.
* **Features:**
  * Grid and Table display modes.
  * Live search bar filtering by name, email, or designation.
  * Department & Employment Type dropdown filters.
  * Clicking an employee opens the detailed `EmployeeProfileView`.

#### 9. `EmployeeProfileView.jsx`
* **Role:** Comprehensive 360-degree employee view.
* **Features:**
  * Tabbed navigation: **Overview**, **Job & Compensation**, **Documents**, **Attendance**, and **Leave History**.
  * Full editing capabilities with interactive form modals for personal details and bank info.

---

### 💰 Payroll & Contract Components

#### 10. `AllContractsView.jsx`
* **Role:** Contract management master view.
* **Features:** Table listing all employee contracts, wage types (Monthly Fixed vs. Hourly Rate), start/end dates, contract status (Active, Pending, Expired), and search.

#### 11. `ActiveContractsView.jsx`
* **Role:** Filtered view for ongoing valid contracts.
* **Features:** Focuses on active contracts with renewal alerts, probation status indicators, and quick action buttons.

#### 12. `ContractDetailView.jsx`
* **Role:** Deep contract inspection view.
* **Features:** Full breakdown of base salary, HRA, allowance items, tax deductions, notice period terms, and digital sign status.

#### 13. `PayrunsView.jsx`
* **Role:** Payroll processing pipeline.
* **Features:** Shows current payrun status (Draft -> Calculated -> Approved -> Paid), step-by-step processing wizard, and historical payrun records.

#### 14. `PayslipsView.jsx`
* **Role:** Monthly salary slip generator.
* **Features:** Itemized slip breakdown (Gross Salary, Allowances, PF, Tax, Net Payable), employee search filter, and "Print / Download PDF" trigger.

#### 15. `SalaryRulesView.jsx`
* **Role:** Payroll computation engine rules.
* **Features:** Manage allowance formulas, tax slabs, EPF/ESI percentage contribution rules, and overtime rates.

#### 16. `SalaryStructuresView.jsx`
* **Role:** Pre-packaged compensation structures.
* **Features:** Grade structures (Executive, Engineering, Operations, Sales) with predefined base percentages and allowance allocations.

---

### ⏱️ Time Off & Attendance Management

#### 17. `AttendanceRecordsView.jsx`
* **Role:** Daily attendance log.
* **Features:** Displays check-in/out timestamps, total hours logged, late arrival indicators, and date range picker.

#### 18. `TimeOffRequestsView.jsx`
* **Role:** Leave request management.
* **Features:** Employee leave applications, manager approval/rejection action buttons, leave reason badges, and status counters.

#### 19. `TimeOffTypesView.jsx`
* **Role:** Leave policy rules.
* **Features:** Configuration of Paid Leave (PL), Casual Leave (CL), Sick Leave (SL), and maternity/paternity leave entitlements.

#### 20. `LeaveAllocationsView.jsx`
* **Role:** Annual leave quotas.
* **Features:** Shows allocated vs. used leave balances per employee with visual progress bars.

---

### 📊 Analytics & System Administration

#### 21. `ReportsView.jsx`
* **Role:** Business intelligence and payroll reporting.
* **Features:** Visual analytics summary, payroll expense distribution charts, headcount growth metrics, and CSV data export buttons.

#### 22. `MonthlyOverviewView.jsx`
* **Role:** Monthly operational snapshot.
* **Features:** Summary of monthly joiners, exits, total payroll disbursed, and key compliance milestones.

#### 23. `SettingsView.jsx`
* **Role:** System configuration suite.
* **Features:** Tabbed panel for **Company Info**, **Security & Roles**, **Email Notifications**, and **Audit Logs**.

---

## 5. Potential Mentor Viva Questions & Answers

### ❓ Q1: How did you implement routing without `react-router-dom`?
> **Answer:** "I implemented lightweight state-driven routing using the `activeView` state in `App.jsx`. The `<Sidebar />` triggers `setActiveView(viewName)`, and `MainLayout.jsx` conditionally renders the target component using a clean JavaScript lookup map. This avoids route parsing overhead, keeps the bundle lightweight, and provides smooth, instantaneous view switching."

### ❓ Q2: How does your frontend design system maintain consistency across 23 views?
> **Answer:** "We established a centralized CSS Design System in `src/index.css`. All colors, typography, border-radii, shadows, and spacing are tokenized via CSS variables (e.g. `--primary-purple`, `--ocean-teal`, `--surface-card`). Reusable CSS utility classes (like `.card`, `.badge-success`, `.btn-primary`, `.glass-panel`) ensure that every component strictly adheres to our brand guidelines without ad-hoc inline styling."

### ❓ Q3: How do you handle API calls and authentication token storage?
> **Answer:** "API requests are handled through a centralized Axios instance in `src/api.js`. On successful login, the JWT access token is stored in `localStorage`. An Axios request interceptor automatically attaches the `Authorization: Bearer <token>` header to all outgoing HTTP requests. Furthermore, `api.js` is equipped with mock data fallbacks, ensuring the UI stays completely functional even during backend development or server downtime."

### ❓ Q4: How is state managed between components?
> **Answer:** "For top-level state like current user session and active view navigation, state is lifted to `App.jsx` and passed down via clean prop drilling. For view-specific logic (like search inputs, modal visibility, and table filters), local React hooks (`useState`, `useMemo`, `useEffect`) are used inside individual view components to keep components modular and self-contained."

### ❓ Q5: How do you ensure responsiveness on different screen sizes?
> **Answer:** "We use fluid layouts built with CSS Grid and Flexbox, combined with responsive media queries in `index.css`. On smaller screens, the sidebar converts into a collapsible mobile drawer or compact icon bar, and multi-column grids (like the Employee Directory cards) automatically reflow into a single column."

---

*Document compiled for PeoplePay360 Frontend Technical Review.*
