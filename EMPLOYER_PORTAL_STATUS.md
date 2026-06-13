# Employer Portal — Integration Status

_Last updated: 2026-06-13_

## Summary

The Employer Portal is fully integrated end-to-end. An employer can post jobs, view applicants per listing, update application status, message candidates directly, and candidates receive those messages in their /messages inbox with job context.

---

## Features Implemented

### 1. Employer views applicants per job ✅

**API:** `GET /api/jobs/:id/applicants`  
**Auth:** Employer must own the job (or be admin).  
**Returns:** `{ applicants: [...], total: N }` — each applicant includes `id`, `userId`, `status`, `coverLetter`, `appliedAt`, `candidateName`, `candidateEmail`, `candidateRole`, `candidateAvatarUrl`.

**Frontend:** Clicking the applicant count on any `JobCard` in `EmployerDashboard` opens the `ApplicantsModal`. The modal fetches and lists all applicants with avatar, name, role, email, status badge, applied date, and an expandable cover letter.

---

### 2. Employer updates application status ✅

**API:** `PATCH /api/jobs/applications/:appId/status`  
**Auth:** Employer (job owner) or admin only — candidates can no longer self-update.  
**Valid values:** `applied` | `reviewing` | `interview` | `offered` | `rejected`  
**Email:** Fire-and-forget email sent to the **applicant** (not the caller) via `sendApplicationStatusEmail`.

**Frontend:** Each applicant row in `ApplicantsModal` has a `<select>` dropdown. On change it calls the API and shows a toast confirmation.

---

### 3. Employer sends message to applicant ✅

**Frontend:** Each applicant row has a **Message** button. It navigates to:
```
/messages?partner=<candidateUserId>&appId=<applicationId>&job=<encodedJobTitle>
```

**API:** `POST /api/messages/:partnerId` now accepts an optional `jobApplicationId` field in the request body and stores it on the `direct_messages` row.

---

### 4. Applicant receives message in /messages ✅

Messages sent by an employer appear in the candidate's `/messages` inbox under the standard conversation thread with that employer. Unread count is tracked normally.

---

### 5. Messages linked to jobApplicationId ✅

**DB:** `direct_messages.job_application_id` — nullable integer FK referencing `job_applications.id`. Added via `pnpm --filter @workspace/db run push` (migration applied 2026-06-13).

**API:** `POST /api/messages/:partnerId` accepts `{ content, jobApplicationId? }` and stores the FK.

---

### 6. Notification badge for new employer messages ✅

**Dashboard (`/dashboard`):** The **Messages** module card now shows:
- A red circular badge over the `MessageCircle` icon with the unread count (capped at "9+")
- An inline "N unread" text label next to the card title

The count is fetched from `GET /api/messages/unread-count` and refreshes every 30 seconds.

---

### 7. Job context banner in /messages ✅

When the `/messages` page is opened with `?job=<title>&appId=<N>` URL params (e.g., via the employer's Message button), a banner is shown at the top of the thread:

> Re: **[Job Title]** application

The first (and subsequent) messages sent in this context include the `jobApplicationId` in the API request body, linking them to the application.

---

## Files Changed

| File | Change |
|------|--------|
| `lib/db/src/schema/directMessages.ts` | Added `jobApplicationId` nullable FK column |
| `artifacts/api-server/src/routes/jobs.ts` | New `GET /:id/applicants`; fixed `PATCH /applications/:appId/status` (employer auth + applicant email) |
| `artifacts/api-server/src/routes/messages.ts` | `POST /:partnerId` accepts `jobApplicationId` |
| `artifacts/denarixx/src/pages/EmployerDashboard.tsx` | New `ApplicantsModal` + `ApplicantRow` + updated `JobCard` with `onViewApplicants` |
| `artifacts/denarixx/src/pages/Dashboard.tsx` | `useUnreadCount` hook + badge on Messages module card |
| `artifacts/denarixx/src/pages/Messages.tsx` | `Message.jobApplicationId` type, `useSendMessage` passes `jobApplicationId`, `ThreadView` shows job context banner |

---

## Testing

| Test | Result |
|------|--------|
| `GET /api/healthz` | ✅ `{"status":"ok"}` |
| `GET /api/jobs/1/applicants` (no auth) | ✅ `401` — route exists, auth enforced |
| `GET /api/messages/unread-count` (no auth) | ✅ `401` — route exists, auth enforced |
| `pnpm --filter @workspace/db run push` | ✅ Schema change applied |
| `pnpm run typecheck:libs` | ✅ No errors |
| `pnpm --filter @workspace/api-server run typecheck` | ✅ No errors |
| `pnpm --filter @workspace/denarixx run typecheck` | ✅ No new errors (pre-existing `calendar.tsx`/`spinner.tsx` errors unrelated to this work) |

---

## Known Limitations / Future Work

- Employer cannot yet see a thread-level history of all messages exchanged about a specific application (messages are per user-pair, not per application).
- There is no push notification — the badge refreshes on a 30-second poll.
- The `GET /api/messages/unread-count` endpoint does not filter to employer-origin messages only; it counts all unread DMs.
