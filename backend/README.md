# Smart HR System — Backend

Backend API for the "Smart HR System" (نظام الموارد البشرية الذكي) — **Node.js + Express + MongoDB (Mongoose)**.

This is the backend only, built directly from the provided user story. It covers:

**Employee Dashboard**
1. Interactive Profile Map
2. Career Timeline
3. Performance Score (credit-score-style, 0-100)
4. AI HR Companion (chatbot)
5. Employee Vault (documents)
6. Smart Leave & Task Assistant
7. Family & Emergency Info Hub
8. Emergency QR Code

**HR Manager Tools**
9. AI Scribe (interview transcription -> summary/evaluation)
10. Smart Scheduling
11. Employer Branding Kit
12. Video Interview Native
13. Internal Referral / Transfer Network

Plus the supporting foundation: auth (JWT, role-based), employees, departments, jobs, candidates, attendance, payroll, notifications.

## Getting started

```bash
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET as needed
npm run seed            # optional: creates departments, leave types, and 3 sample accounts
npm run dev              # starts on http://localhost:5000 (nodemon)
```

Sample accounts created by `npm run seed` (password: `password123`):
- `hr.admin@smarthr.test` — role `hr_admin`
- `manager@smarthr.test` — role `manager`
- `employee@smarthr.test` — role `employee`

## AI features

`GEMINI_API_KEY` in `.env` is optional (get a free key at https://aistudio.google.com/apikey). If set, the AI HR Companion, AI Scribe, Employer Branding post suggestions, and development-tip generation call Google Gemini for open-ended answers. If unset (default), all AI-labeled endpoints still work using deterministic rule-based logic, so the API runs fully standalone.

## Email notifications

`GMAIL_USER` + `GMAIL_APP_PASSWORD` in `.env` are optional (Gmail SMTP via `nodemailer`). Every notification created via `notificationService.createNotification` (leave decisions, low leave balance, payslip issued, document/contract expiry, repeated lateness, stale emergency info, task due) is still written in-app, and is **also** emailed to the recipient if their `notificationPreferences.email` is `true` (`PATCH /api/notifications/preferences`, default `false`). Candidates being scheduled for an interview are emailed directly (they have no in-app account). If either env var is unset, email sending no-ops with a console log — everything else keeps working.

`GMAIL_APP_PASSWORD` must be a Google **App Password**, not your normal Gmail login password: enable 2-Step Verification on the Gmail account, then generate one at Google Account -> Security -> App passwords. Unlike a domain-based email API, Gmail SMTP can send to any recipient immediately, no domain verification needed — but it's rate-limited (~500 emails/day) and best treated as a dev/small-scale option, not a production mail provider.

## Auth

- `POST /api/auth/register` — create a user (also see `POST /api/employees` for HR to provision a full employee)
- `POST /api/auth/login` — returns a JWT
- `GET /api/auth/me` — current user + linked employee id

Send `Authorization: Bearer <token>` on all other routes. Roles: `employee`, `manager`, `hr_admin` (hr_admin can access everything).

Most "my data" endpoints default to the logged-in user's own employee record when no `:employeeId` is given, and allow `manager`/`hr_admin` to pass an explicit `:employeeId`.

## Endpoint map (feature -> routes)

| Feature | Routes |
|---|---|
| 1. Interactive Profile Map | `GET /api/profile[/:employeeId]` |
| 2. Career Timeline | `GET/POST /api/profile/:employeeId/timeline` |
| 3. Performance Score | `GET /api/performance[/:employeeId]`, `GET /api/performance[/:employeeId]/history`, `POST /api/evaluations/:employeeId` |
| 4. AI HR Companion | `POST /api/chatbot/ask`, `GET /api/chatbot/history` |
| 5. Employee Vault | `GET/POST /api/vault[/:employeeId]`, `GET /api/vault[/:employeeId]/salary-history`, `DELETE /api/vault/document/:documentId` |
| 6. Leave & Task Assistant | `GET /api/leave/:employeeId/balances`, `POST /api/leave/requests`, `GET /api/leave/requests/pending` (HR/manager), `PATCH /api/leave/requests/:requestId/decision|cancel`, `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/item/:taskId` |
| 7. Family & Emergency Info Hub | `GET /api/emergency[/:employeeId]`, `POST /api/emergency/:employeeId/contacts`, `PUT /api/emergency/:employeeId/medical` |
| 8. Emergency QR Code | `GET /api/emergency/:employeeId/qr` (auth), `GET /api/emergency/public/:qrToken` (public, for scanning) |
| 9. AI Scribe | `POST /api/interviews/:id/scribe`, `PATCH /api/interviews/:id/evaluation` |
| 10. Smart Scheduling | `POST /api/interviews` (auto-slot when no `scheduledAt`), `PATCH /api/interviews/:id/cancel` (auto-reschedule suggestion) |
| 11. Employer Branding Kit | `GET /api/branding/stats`, `GET /api/branding/posts` |
| 12. Video Interview Native | `POST /api/interviews/:id/notes`, `PATCH /api/interviews/:id/recording` |
| 13. Internal Referral / Transfer Network | `POST /api/referrals`, `GET /api/referrals`, `GET /api/referrals/:id/candidate-profile`, `PATCH /api/referrals/:id/decision` |

Supporting modules: `/api/employees` (incl. `GET /:id/full-record` — attendance/leave/payroll/evaluations composed in one response), `/api/departments`, `/api/jobs` (each job includes an `applicantCount`), `/api/candidates` (incl. `POST /:id/notes`), `/api/attendance` (check-in/out, `POST /mark-absentees`), `/api/payroll` (draft → `PATCH /:payrollId/approve` → issued), `/api/leave-types`, `/api/notifications`, `/api/dashboard`, `/api/reports`, `/api/audit-logs`.

## Notifications & reminders

A daily cron job (`src/cron/reminders.js`, 08:00 server time) scans for:
- low leave balances
- tasks due within 48 hours
- documents/contracts expiring within 30 days
- repeated lateness (>= 3 late days this month) — notifies the employee's manager and HR
- missing/stale emergency contact & medical info (not updated in 180+ days)

A separate evening job (20:00) flags forgotten checkouts, and a late-night job (23:45) marks employees with no attendance record that day as `absent` (or `leave`, if covered by an approved leave request) — this is also exposed as `POST /api/attendance/mark-absentees` for on-demand/testing use, and is what makes attendance reports, the HR dashboard, and attendance-based payroll deductions actually populate.

All of the above write into `/api/notifications` for the affected users. Leave-conflict detection with teammates runs synchronously whenever a leave request is submitted (`POST /api/leave/requests`), and is re-surfaced to the reviewer in the response of `PATCH /api/leave/requests/:requestId/decision`.

## Project structure

```
src/
  config/       MongoDB connection
  models/       Mongoose schemas (18 models)
  middleware/   auth (JWT), role guard, file upload (multer), error handler
  services/     aiService, performanceService, notificationService, schedulingService
  controllers/  request handlers, one per feature area
  routes/       Express routers, mounted under /api in routes/index.js
  cron/         daily reminder job
  seed/         sample data seeder
  app.js        Express app (middleware + routes)
  server.js     entry point (connects DB, starts cron, listens)
```

## Notes / known limitations

- File uploads (documents, resumes, interview recordings) are stored on local disk under `uploads/`. Swap `middleware/upload.js` for S3/GCS storage in production.
- The AI Scribe requires `consentGiven: true` on both the transcript submission (`POST /api/interviews/:id/scribe`) and the recording attachment (`PATCH /api/interviews/:id/recording`), matching the user story's "بإذن المرشح" (with the candidate's consent) for each artifact.
- Candidates have no login/user account, so scheduling an interview logs an outbound-notification placeholder (`console.log`, `Interview.candidateNotifiedAt`) instead of sending a real email/SMS — wire up a mail provider there for production.
- Payroll records go through a draft → approved workflow: `POST /api/payroll/:employeeId` / `.../generate` create a `draft`, and `PATCH /api/payroll/:payrollId/approve` issues the payslip (visible to the employee, downloadable, and notified). A plain `employee` only ever sees `approved` records.
- Performance Score weights (40% manager rating / 25% attendance / 25% task completion / 10% self-development) are a starting point — tune in `src/services/performanceService.js`.
- Verified end-to-end against a live MongoDB instance (login, permission checks, leave, emergency access, document upload, payroll draft/approve, jobs/candidates/interviews, the absence sweep) — see `npm run seed` for sample accounts to try it yourself.
