---
name: JIT User Provisioning — Upsert Pattern
description: The users.ts JIT provisioning must use onConflictDoUpdate on email, not plain INSERT. Details on the bug and fix.
---

## Rule
`GET /api/users/me` provisions new users on first login. Use `onConflictDoUpdate` on the email field — never a plain `INSERT`.

**Why:** The `clerkUserId` existence check is done first, but test sessions (and re-signups) can reuse the same email with a new Clerk ID. A plain INSERT then hits the `users_email_unique` constraint and returns 500 for all subsequent logins.

**How to apply:**
```typescript
await db
  .insert(usersTable)
  .values({ clerkUserId, email, name })
  .onConflictDoUpdate({
    target: usersTable.email,
    set: { clerkUserId, name: name ?? undefined },
  })
  .returning();
```

This ensures the Clerk ID stays current and no duplicate key error occurs even if the same email re-registers.
