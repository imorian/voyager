# Overseas Business Travel Expense System — MVP PRD

> **Version 3.0 · June 2026 · Internal use only**
> Modelled directly on the Overseas Business Trip Form (Pre-Trip + Post-Trip Excel)

---

## What we're building

A web app that digitises the existing Overseas Business Trip Form. Employees fill in a Pre-Trip request and a Post-Trip claim, managers approve both, receipts are uploaded, and the system generates a PDF that mirrors the Excel layout. A dashboard shows all past submissions with status and download links.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack in one repo, API routes + UI together |
| **Language** | TypeScript | Type safety across forms, DB, and PDF generation |
| **Database** | PostgreSQL via Supabase | Free tier — DB, auth, and file storage in one platform |
| **ORM** | Prisma | Type-safe queries, easy migrations, great DX |
| **Auth** | Supabase Auth | Magic-link email login, session management, RLS built-in |
| **UI** | Tailwind CSS + shadcn/ui | Accessible, clean components; fast to build with |
| **File storage** | Supabase Storage | Receipt + PDF storage, signed URL downloads |
| **PDF export** | `@react-pdf/renderer` | Server-side PDF generation matching the Excel layout |
| **Email** | Resend | Transactional emails, generous free tier |
| **Deployment** | Vercel | Zero-config Next.js deploys, preview URLs per branch |
| **Validation** | Zod | Shared schemas across form and API layers |

---

## Roles

| Role | What they can do |
|---|---|
| **Employee** | Create Pre-Trip requests, submit Post-Trip claims, upload receipts, view own history, download PDFs |
| **Manager** | Everything an employee can + approve/reject submissions from direct reports, view team history |
| **Admin** | Everything a manager can + manage users (assign roles, set manager relationships), update per diem rates |

> **Why add Admin?** Without it, there's no way to onboard new staff, assign managers, or update rates without DB access — which is a real blocker the first week the app goes live. A minimal admin panel takes one afternoon to build and saves ongoing maintenance pain.

---

## Data Model

### `users`
- `id`, `email`, `name`
- `emp_id` (e.g. "EMP-001"), `position`, `grade`, `department`, `division`
- `role` (`EMPLOYEE | MANAGER | ADMIN`)
- `manager_id` (FK → users, nullable)
- `is_active` (boolean — soft disable without deleting)
- `created_at`

### `trip_forms`
One record covers both Pre-Trip and Post-Trip phases of the same journey.

- `id`, `reference_number` (auto: `OBT-YYYY-NNNN`)
- `employee_id` (FK → users)
- `status` (`DRAFT | PRE_SUBMITTED | PRE_APPROVED | PRE_REJECTED | POST_DRAFT | POST_SUBMITTED | POST_APPROVED | POST_REJECTED`)

**Employee info snapshot** *(copied at first submission — so the PDF is always accurate even if the employee later updates their profile)*
- `emp_id_snap`, `emp_name_snap`, `position_snap`, `grade_snap`, `department_snap`, `division_snap`

**Trip details**
- `purpose`, `objective` (long text), `cost_charged_to`, `cost_center`

**Outgoing flight**
- `out_city`, `out_country`, `out_airline`, `out_flight_no`
- `out_dep_date`, `out_dep_time`, `out_arr_date`, `out_arr_time`

**Incoming flight**
- `in_city`, `in_country`, `in_airline`, `in_flight_no`
- `in_dep_date`, `in_dep_time`, `in_arr_date`, `in_arr_time`

**Per diem**
- `total_trip_days` (integer)
- `cost_of_living_area` (`HIGHEST | HIGH | NORMAL | UNSPECIFIED`)
- `per_diem_usd_per_day` (decimal — from rate table, snapshotted at submission)
- `bot_fx_rate` (decimal — THB/USD, entered by employee)
- `per_diem_total_usd` (computed)
- `per_diem_total_thb` (computed)

**Pre-Trip approval**
- `pre_submitted_at`, `pre_approved_by` (FK), `pre_approved_at`, `pre_rejection_note`

**Post-Trip approval**
- `post_submitted_at`, `post_approved_by` (FK), `post_approved_at`, `post_rejection_note`

**Grand totals** *(computed, stored for dashboard display)*
- `post_total_expenses_thb`, `post_total_perdiem_thb`, `post_grand_total_thb`

- `created_at`, `updated_at`

### `expense_lines`
- `id`, `trip_form_id` (FK)
- `phase` (`PRE | POST`)
- `section` (`TRANSPORTATION | OTHER`)
- `line_number` (1–5)
- `expense_type` (transport: dropdown value; other: free text)
- `expense_date`, `work_details`
- `amount_local_fx` (decimal), `fx_rate_bot` (decimal), `amount_thb` (computed)
- `receipt_id` (FK → receipts, nullable)

### `receipts`
- `id`, `trip_form_id` (FK), `expense_line_id` (FK, nullable)
- `storage_path` (Supabase Storage path)
- `file_name`, `file_type`, `file_size_bytes`
- `uploaded_by` (FK → users), `uploaded_at`

### `approval_log`
*(Immutable audit trail — never updated, only appended)*
- `id`, `trip_form_id` (FK), `phase` (`PRE | POST`)
- `action` (`SUBMITTED | APPROVED | REJECTED | RETRACTED`)
- `actor_id` (FK → users), `notes`, `actioned_at`

### `per_diem_rates`
- `id`, `area` (`HIGHEST | HIGH | NORMAL | UNSPECIFIED`)
- `usd_per_day` (decimal)
- `effective_from` (date) — allows future rate changes without breaking history
- `updated_by` (FK → users), `updated_at`

**Seed data:**
```
HIGHEST     → 120 USD/day
HIGH        → 100 USD/day
NORMAL      →  80 USD/day
UNSPECIFIED →  70 USD/day
```

### `notifications`
*(Lightweight log of sent emails — helps debug delivery issues)*
- `id`, `trip_form_id` (FK), `recipient_id` (FK → users)
- `type` (enum of notification types), `sent_at`, `resend_message_id`

---

## The Form — Field by Field

### Section 1 — Employee Information
Auto-filled from the logged-in user's profile. Read-only on the form.

| Field | Source |
|---|---|
| Emp. ID | `users.emp_id` |
| Emp. Name | `users.name` |
| Position | `users.position` |
| Grade (L) | `users.grade` |
| Department | `users.department` |
| Division | `users.division` |

### Section 2 — Trip's Detail

**Outgoing (Destination / Host Country)**
- City (text), Country (dropdown — 195 countries), Airline (text), Flight No. (text)
- Date of Departure, Time of Departure, Date of Arrival, Time of Arrival

**Incoming (Origin / Home Country)**
- Same fields mirrored

### Section 3 — Business Trip Purpose
- **Purpose** (text)
- **Cost charged to** (text), **Cost Center** (text)
- **Objective** (textarea — describe objective, inviting organisation, need for trip, business benefits)
- Static note: *"The accommodation rate is inclusive of breakfast and applicable tax(es)."*

### Section 4 — Expenses Table

**Transportation** (5 rows) and **Other Expenses** (5 rows).

Each row:
- **Type** — Transportation: dropdown (Taxi / Airfare / Toll fee / Express way / Parking / Train); Other: free text
- **Date** — date picker
- **Work's Details** — text
- **Amount (Local Fx)** — decimal
- **FX Rate (BOT)** — decimal (employee enters Bank of Thailand rate)
- **Amount (THB)** — read-only, auto-computed (amount × fx_rate)

Footer auto-sums all rows. Shows Total Local Fx and Total THB.

- Pre-Trip: labelled "Estimated Expenses"
- Post-Trip: labelled "Actual Expenses" + note *"Valid receipt(s) required for reimbursement"*

### Section 5 — Per Diem (Overnight Stay Only)

- **Total Days on Trip** — integer. Helper: *"counting from first to last day, overnight stays only"*
- **Area** — dropdown: Highest / High / Normal / Unspecified
- **Rate (USD/Day)** — auto-filled from `per_diem_rates`, read-only
- **BOT FX Rate** — decimal (employee enters)
- **Total Per Diem (USD)** — computed: days × rate
- **Total Per Diem (THB)** — computed: USD × fx_rate

### Section 6 — Approval Block (read-only display)

| Slot | MVP | Post-MVP |
|---|---|---|
| Trip Requester | Filled — name + submission date | — |
| Head of Department | Filled on approval — name + date + notes | — |
| Head of Division | Blank | Wired up |
| President | Blank | Wired up |

---

## Workflow

```
Employee                         Manager / Admin
───────────────────────────────────────────────────────────
Fill Pre-Trip form
Save as draft at any point
Submit Pre-Trip
                                 → Email: "Action required"
                                 Review in Approvals queue
                                 Approve  ──────────────────→ Status: PRE_APPROVED
                                 Reject   ──────────────────→ Status: PRE_REJECTED
                                                               Email: "Returned with notes"
Receive rejection → edit → resubmit

───── trip happens ─────

Open Post-Trip (pre-filled from
  approved Pre-Trip)
Enter actual expenses + receipts
Submit Post-Trip
                                 → Email: "Action required"
                                 Review — sees Pre vs Post
                                 Approve  ──────────────────→ Status: POST_APPROVED
                                                               PDF auto-generated
                                                               Email: "Approved — PDF ready"
                                 Reject   ──────────────────→ Status: POST_REJECTED
                                                               Email: "Returned with notes"
Download PDF from dashboard
```

**Rules:**
- Post-Trip cannot be submitted unless Pre-Trip is `PRE_APPROVED`
- Submitted forms are locked — employee must retract to edit (resets approval)
- Per diem rate is snapshotted at submission time — future rate changes don't affect submitted forms
- Receipts must be attached to Post-Trip expense lines before submission (enforced for lines with an amount > 0)

---

## Pages & Navigation

```
/login                           Magic-link login
/dashboard                       All submissions (employee: own; manager: team; admin: all)
/forms/new                       Create new Pre-Trip
/forms/[id]                      Form overview — status, both phases, activity log
/forms/[id]/pre-trip             Pre-Trip form (edit if draft, read-only otherwise)
/forms/[id]/post-trip            Post-Trip form (edit if post-draft, read-only otherwise)
/forms/[id]/pdf                  PDF preview + download button
/approvals                       Manager: pending submissions queue
/approvals/[id]                  Manager: full review with approve/reject
/profile                         Employee edits own profile fields
/admin/users                     Admin: list, create, edit users; assign roles + managers
/admin/rates                     Admin: view and update per diem rates
```

---

## Dashboard — Expense History Overview

Main landing page after login. Every user lands here first.

### Columns

| Column | Notes |
|---|---|
| Reference | `OBT-2026-0012` — links to `/forms/[id]` |
| Employee | Manager/Admin view only |
| Destination | Outgoing city + country |
| Trip Dates | Dep date → Return date |
| Purpose | Truncated, one line |
| Pre-Trip status | `Draft` · `Pending` · `Approved` · `Rejected` — colour-coded badge |
| Post-Trip status | `Not started` · `Pending` · `Approved` · `Rejected` — colour-coded badge |
| Total (THB) | Grand total from approved Post-Trip; `—` if not yet approved |
| Actions | View · Download PDF (only when POST_APPROVED) |

### Filters & search
- Free-text search (reference number, destination, purpose)
- Status filter: All / Pending approval / Approved / Rejected
- Date range filter (trip departure date)
- Employee filter (manager/admin only)

### Summary cards (top of dashboard)
Three metric cards visible at all times:
- **My open drafts** — count of DRAFT + PRE_REJECTED + POST_DRAFT + POST_REJECTED forms
- **Awaiting approval** — (managers) count of submissions pending their action; (employees) count of own forms pending
- **Approved this year** — count of POST_APPROVED forms in the current calendar year

---

## PDF Export

Generated server-side via `@react-pdf/renderer` when Post-Trip is approved. Stored in Supabase Storage and linked on the form. Can be regenerated by admin if needed.

### Page 1 — Pre-Trip

```
┌──────────────────────────────────────────────────────────────┐
│  OVERSEAS BUSINESS TRAVEL FORM (PRE-TRIP)   Ref: OBT-…      │
│  "In case the travel is >60 days, a separate approval is     │
│   required."                                                 │
├──────────────────────────────────────────────────────────────┤
│  EMPLOYEE INFORMATION                                        │
│  Emp. ID: ___  Name: ___________  Position: ___  Grade: __  │
│  Department: ___________________  Division: ______________   │
├──────────────────────────────────────────────────────────────┤
│  TRIP'S DETAIL                                               │
│  Outgoing ──────────────────  Incoming ────────────────────  │
│  City / Country               City / Country                │
│  Airline / Flight No.         Airline / Flight No.          │
│  Dep: date  time              Dep: date  time               │
│  Arr: date  time              Arr: date  time               │
├──────────────────────────────────────────────────────────────┤
│  BUSINESS TRIP PURPOSE                                       │
│  Purpose: ___________  Cost charged to: ___  CC: _______    │
│  Objective: [full text block]                                │
│  "The accommodation rate is inclusive of breakfast..."       │
├──────────────────────────────────────────────────────────────┤
│  ESTIMATED EXPENSES                                          │
│  Transportation                                              │
│  #  Type    Date  Work Details      Local Fx  FX Rate  THB  │
│  1  ______  ____  ______________    ________  ______  _____ │
│  …  (5 rows)                                                 │
│  Other Expenses                                              │
│  #  Description  Date  Work Details  Local Fx  FX Rate  THB │
│  1  __________   ____  ____________  ________  ______  ____ │
│  …  (5 rows)                                                 │
│                           TOTAL:    ________          _____ │
├──────────────────────────────────────────────────────────────┤
│  ESTIMATED PER DIEM (OVERNIGHT STAY ONLY)                    │
│  Total Days: __  Area: ________  Rate: ___ USD/Day          │
│  BOT FX: ___  Total: ___ USD  =  _______ THB                │
├──────────────────────────────────────────────────────────────┤
│  APPROVAL (Verified by People Partnership)                   │
│  Requester      Head of Dept    Head of Div    President     │
│  [Name]         [Name]          —               —           │
│  Date: ___      Date: ___       Date: —         Date: —      │
└──────────────────────────────────────────────────────────────┘
```

### Page 2 — Post-Trip
Identical structure, labelled "POST-TRIP", with actual expenses and the post-trip approval block.

### PDF requirements
- A4 portrait, 10mm margins
- Reference number in header of every page
- Grid-style table borders matching the Excel aesthetic
- Empty rows still render as blank lines (matching the Excel's fixed 5-row structure)
- Approval block at bottom — signed slots show name + date; unsigned slots are blank
- Stored at `pdfs/{trip_form_id}/OBT-YYYY-NNNN.pdf` in Supabase Storage
- Downloadable via signed URL (expires 1 hour; regenerated on each download click)

---

## Receipt Handling

This is critical for Post-Trip compliance and is often forgotten in MVP specs.

- Each Post-Trip expense line with `amount_local_fx > 0` must have at least one receipt attached before the form can be submitted
- Receipts are uploaded per line item (drag-and-drop or file picker)
- Accepted: PDF, JPG, PNG, HEIC — max 10 MB per file
- Stored in Supabase Storage at `receipts/{trip_form_id}/{line_id}/{filename}`
- Displayed as thumbnails inline on the form; click to open full-size in a modal
- On the PDF, each expense line shows "Receipt: attached" or "Receipt: none" in a notes column
- Manager can view all receipts from the approval screen before deciding

---

## Form Validation

Rules enforced on submit (not just on the final page — validate each section as the user progresses).

**Pre-Trip:**
- Employee info complete (checked against profile — prompt to complete profile if missing)
- At least one outgoing flight field filled (city + country minimum)
- Purpose and objective are not empty
- Per diem: if total_trip_days > 0, area and BOT FX rate are required
- At least one expense line filled OR per diem days > 0 (can't submit a blank form)

**Post-Trip:**
- All expense lines with an amount must have a date and work details
- All expense lines with amount > 0 must have a receipt attached
- Per diem section complete if days > 0
- BOT FX rate present on any line where local currency ≠ THB

**Both phases:**
- Departure date must be before arrival date on both flight legs
- Trip days must be a positive integer

Validation errors shown inline next to each field, plus a summary banner at the top of the form listing all issues before the Submit button is enabled.

---

## Admin Panel

A minimal but essential set of admin screens. Access restricted to users with `role = ADMIN`.

### User management (`/admin/users`)
- Table: all users — name, email, emp_id, department, role, manager name, active status
- **Add user** — form: email, name, emp_id, position, grade, department, division, role, manager (dropdown of managers)
- **Edit user** — same fields; toggle `is_active` to disable without deleting
- **Resend invite** — re-send magic-link welcome email to a user who hasn't logged in yet

> Without this, the only way to add a new employee is direct DB access — completely impractical.

### Per diem rate management (`/admin/rates`)
- Table: current rates for all four areas — Area, USD/Day, Effective From, Last Updated By
- **Edit rate** — update `usd_per_day` for any area; system creates a new row with today's `effective_from` date and preserves the old row for historical accuracy
- Rate change is reflected immediately for new submissions only

---

## Notification Emails

All emails use a simple, clean template with the company name in the header.

| Trigger | To | Subject |
|---|---|---|
| Pre-Trip submitted | Manager | `Action required: Pre-Trip [OBT-…] from [Name]` |
| Pre-Trip approved | Employee | `Pre-Trip approved: [OBT-…] — you may now book your trip` |
| Pre-Trip rejected | Employee | `Action needed: Pre-Trip [OBT-…] returned — see notes` |
| Post-Trip submitted | Manager | `Action required: Post-Trip [OBT-…] from [Name]` |
| Post-Trip approved | Employee | `Post-Trip approved: [OBT-…] — PDF is ready to download` |
| Post-Trip rejected | Employee | `Action needed: Post-Trip [OBT-…] returned — see notes` |
| New user invite | New user | `You've been added to the expense system — click to log in` |

Email body always includes:
- Reference number
- Destination + trip dates
- Manager notes (for rejections)
- A direct link to the form in the app

---

## Security & Access Control

Often skipped in MVP specs — these are non-negotiable for a finance tool.

- **Row-level security (RLS) via Supabase** — employees can only read and write their own `trip_forms` and `expense_lines`. Managers can read forms where `employee.manager_id = their id`. Admins can read everything.
- **Signed URLs for files** — receipts and PDFs are never publicly accessible. All downloads go through a signed URL that expires after 1 hour.
- **Session expiry** — sessions expire after 24 hours of inactivity. Magic links expire after 1 hour.
- **Role enforcement on API routes** — every API route checks the user's role server-side before processing. Role stored in the session, not the client.
- **Audit trail is append-only** — `approval_log` rows are never updated or deleted. This is enforced at the DB level with an RLS policy that disallows UPDATE and DELETE on that table.

---

## Error & Edge Case Handling

Things that will definitely happen in the first week of real use.

| Scenario | Handling |
|---|---|
| Employee submits before their manager is assigned | Block submission with message: *"Your manager is not set up yet. Contact your admin."* |
| Manager approves then gets changed | Old approvals remain valid. New forms go to new manager. |
| Employee's profile is incomplete | Yellow banner on dashboard and form: *"Complete your profile before submitting"* |
| PDF generation fails | Show error on form page with "Retry PDF" button. Log error server-side. |
| Receipt upload fails (network) | Show per-file retry button inline. Don't lose already-uploaded files. |
| Two managers try to approve the same form simultaneously | Last-write-wins with optimistic locking — second approval attempt returns "Already actioned" message. |
| User tries to access another employee's form via direct URL | 403 page with "You don't have access to this form" |

---

## Seed Data

Everything needed for the app to work on day one — no manual DB setup required after deploy.

- **Countries** — all 195 from Excel Sheet1
- **Transport types** — Taxi, Airfare, Toll fee, Express way, Parking, Train
- **Per diem rates** — Highest 120, High 100, Normal 80, Unspecified 70 USD/day
- **One Admin user** — seeded via environment variable (`SEED_ADMIN_EMAIL`) on first deploy

---

## Environment Variables

Document these so the coding agent wires them up correctly.

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-side only — never expose to client

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=                # e.g. noreply@company.com

# App
NEXT_PUBLIC_APP_URL=              # e.g. https://expenses.company.com
SEED_ADMIN_EMAIL=                 # Email address for the first admin user

# Optional
NEXT_PUBLIC_COMPANY_NAME=         # Shown in PDF header and email templates
```

---

## What's NOT in this MVP

| Feature | Why deferred |
|---|---|
| Head of Division + President approval | Adds workflow complexity; manager approval covers compliance for MVP |
| LOA (Letter of Authorisation) sheet | Different document type; tackle post-MVP |
| Live BOT FX rate lookup | Avoids external API dependency; manual entry is acceptable |
| Multi-leg trips (3+ destinations) | One out + one back is sufficient for the majority of trips |
| Domestic travel form | Different form structure; separate project |
| Bulk export / finance reporting | Post-MVP once volume justifies it |
| In-app notifications (bell icon) | Email covers it; in-app is nice-to-have |
| Comment threads on forms | Manager notes on rejection are sufficient |

---

## Acceptance Criteria

The MVP is complete when:

1. A new employee can be added by an admin, receive a magic-link email, log in, and see an empty dashboard
2. Employee can create a Pre-Trip form with all Excel fields, save as draft, and submit — form is locked on submit
3. Manager receives an email and can approve or reject with notes from the approvals queue
4. Rejected employee can retract, edit, and resubmit
5. Post-Trip form is only accessible after Pre-Trip is approved — it pre-fills employee info and trip details
6. Post-Trip expense lines with an amount block submission if no receipt is attached
7. Per diem auto-calculates: area → rate lookup → USD total → THB total using entered BOT FX rate
8. Post-approval triggers PDF generation; PDF matches the two-page Excel layout
9. PDF is downloadable from both the form page and the dashboard
10. Dashboard shows all forms with status badges, search, and date filters
11. Admin can add a user, set their role, assign their manager, and resend an invite
12. Admin can update a per diem rate; existing approved forms are unaffected
13. Employees cannot access each other's forms via direct URL
14. All computed fields (THB amounts, per diem totals) update in real time as values are entered

---

## Reference Formats

| Entity | Format | Example |
|---|---|---|
| Trip form | `OBT-YYYY-NNNN` | `OBT-2026-0007` |

---

*Overseas Business Travel Expense System · MVP PRD v3.0 · June 2026*
