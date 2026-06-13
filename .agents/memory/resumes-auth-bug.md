---
name: resumes.ts auth bug
description: requireAuth only sets clerkUserId, never dbUser — all route handlers must use the getDbUser() lookup pattern
---

## Rule
`requireAuth` middleware sets only `(req as any).clerkUserId`. It never sets `dbUser`.

Any route handler that reads `(req as any).dbUser` will get `undefined` and crash with `TypeError: Cannot read properties of undefined (reading 'id')` on every authenticated request.

The correct pattern (used by messages.ts, jobs.ts, cvbuilder.ts):
```typescript
const clerkUserId = (req as any).clerkUserId as string;
const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
if (!user) { res.status(404).json({ error: "User not found" }); return; }
```

**Why:** resumes.ts was scaffolded with `dbUser` from an older pattern that assumed a db-lookup middleware. That middleware was never added. The bug was silent at code-review time because the route returned 401 before reaching the handler in unauthenticated tests.

**How to apply:** When reading or creating any new route file, grep for `dbUser` before shipping. If found, replace with the clerkUserId → DB lookup pattern.
