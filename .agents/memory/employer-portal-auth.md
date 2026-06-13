---
name: Employer portal auth pattern
description: How to authorize employer-only actions and target the right email recipient for application status changes
---

## Rule
For `PATCH /api/jobs/applications/:appId/status`:
- Join `jobApplications` with `jobs` in a single query to get both `postedByUserId` and the applicant's `userId` in one round-trip.
- Check `appRow.postedByUserId === caller.id || caller.userType === "admin"` — NOT the old `app.userId === caller.id` (that was the candidate check).
- Send the status email to `appRow.applicantUserId` (the candidate), NOT to the caller (who is the employer).

For `GET /api/jobs/:id/applicants`:
- Same auth check: job.postedByUserId === caller.id || admin.
- Returns candidate fields joined from `usersTable`: `candidateName`, `candidateEmail`, `candidateRole`, `candidateAvatarUrl`.

**Why:** The original route only allowed candidates to self-update. Employers need to move applications through a hiring funnel, and the status email must notify the applicant, not the employer who triggered the change.

**How to apply:** Whenever any employer action targets a job-application row, always join to get `jobs.postedByUserId` for the auth check.
