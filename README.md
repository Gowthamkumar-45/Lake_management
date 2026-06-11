# Lake Management System 💧

A full-stack web application to **monitor, revive and protect lakes & ponds**
across a district's local bodies — with role-based access, a cascading
geographic explorer, map-based tracking, and a stage-by-stage renovation
workflow that **requires geo-tagged photos at every stage**.

- **Backend:** Django 5 + Django REST Framework + JWT auth (SQLite)
- **Frontend:** React (Create React App) + React Router + Leaflet maps
- **Theme:** professional two-colour palette — deep navy + teal

---

## Roles & authorization

| Role | Capabilities |
|------|--------------|
| **Super Admin** | Full access. Manages Admins, Officers and all master data. |
| **Admin** | Manages Officers and master/geography data within their district. |
| **Officer** | Field user. Updates lakes/ponds and the renovation workflow for their **assigned local bodies** only. |

Auth is JWT-based (`/api/auth/login/`, `/api/auth/refresh/`). The token carries
the role; the React app gates routes and actions by role.

**Demo logins** (password `admin123`): `superadmin`, `admin`, `officer`.

---

## Geographic hierarchy (cascading dropdowns)

```
District
└── Local Body  (4 types)
    ├── Corporation     (Maanagaratchi) ─┐
    ├── Municipality    (Nagaratchi)     ├─►  Ward ──► Area ──► Lakes / Ponds
    ├── Town Panchayat  (Peruratchi)    ─┘
    └── Panchayat       (Ooratchi)       ────────────► Village ──► Lakes / Ponds
```

The **Explore Lakes & Ponds** page walks the user through
District → Local Body Type → Local Body → Ward → Area (or → Village for
Panchayats) and then lists the water bodies, with a live **Leaflet map**
beside the list. Each local body / water body has its own map view.

Master data (districts, local bodies, wards, areas, villages, lakes/ponds) is
entered under **Master Data** (Admin / Super Admin only).

---

## Lake / Pond tracking

Each water body is categorised as one of:
`Under Renovation`, `Renovation Complete`, `Renovation Pending`,
`Encroachment`, `Disappeared`.

For every water body the system records:

- **Renovation workflow** — ordered stages, each with a status and
  **mandatory geo-tagged photo uploads**. A stage cannot be marked *Completed*
  until at least one photo with latitude/longitude is uploaded. Pending stages
  require a reason.
- **Workforce** — counted separately by **gender** with designation.
- **Machines & equipment** used.
- **Funds** used (auto-rolled-up total).
- **Water source** — rain water only / river connection / both.
- **Incharge** officer and contact.
- **Revived by** — NGO / Local Team / Government (with name).
- **Capacity** and area.

---

## Running locally

### 1. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py seed_demo      # demo users + sample data
python manage.py runserver      # http://localhost:8000
```

Django admin: http://localhost:8000/admin (`superadmin` / `admin123`).

### 2. Frontend

```bash
cd frontend
npm install
npm start                       # http://localhost:3000
```

### Or both at once

```bash
./run.sh
```

---

## Project layout

```
backend/
  config/          Django project (settings, urls)
  accounts/        Custom User + roles, JWT login, permissions
  geography/       District, LocalBody, Ward, Village, Area
  lakes/           WaterBody (lake/pond) + status, water source, incharge
  renovation/      RenovationStage, StagePhoto, Worker, Equipment, FundEntry
frontend/
  src/api/         Axios client with JWT refresh interceptor
  src/auth/        Auth context
  src/components/  Layout, maps, status badge, stage workflow
  src/pages/       Login, Dashboard, Explorer, MapView, WaterBodyDetail,
                   Masters, Users
```

## Key API endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login/` | JWT login (returns user + tokens) |
| `GET /api/districts/` `…/local-bodies/?district=` `…/wards/?local_body=` `…/areas/?ward=` `…/villages/?local_body=` | Cascading geography |
| `GET /api/water-bodies/?area=&ward=&village=&local_body=&status=` | List lakes/ponds |
| `GET /api/water-bodies/stats/` | Status counts for the dashboard |
| `…/stages/` `…/stage-photos/` | Renovation workflow + geo-photos |
| `…/workers/` `…/equipment/` `…/fund-entries/` | Workforce, machinery, funds |
| `…/users/` | User management (Admin / Super Admin) |
