---
name: Messaging schema
description: directMessages table and API routes for user-to-user DMs
---

# Messaging

## DB Table
`direct_messages` — id, fromUserId, toUserId, content, isRead, createdAt
Schema file: `lib/db/src/schema/directMessages.ts`

## API Routes (all under `/api/messages`)
- `GET /unread-count` — total unread badge count (must be BEFORE `/:partnerId` to avoid routing conflict)
- `GET /inbox` — all conversations grouped by partner with unread counts
- `GET /:partnerId` — message thread with a user (also marks messages as read)
- `POST /:partnerId` — send a message

**Why:** Route ordering matters — /unread-count and /inbox must come before /:partnerId.

## Frontend
- `/messages` page: split inbox list + thread view, mobile-responsive
- SkillSwap Connections tab shows "Message" button on accepted connections → `/messages?partner=<dbUserId>`
- Messages page reads `?partner=` param via `useSearch()` and auto-opens that thread
- Dashboard module card added for Messages

## Integration Points
- SkillSwap `GET /api/skillswap/connections` returns `requesterId` + `targetId` (integer DB user IDs)
- `GET /api/users/me` returns `id` (integer) — used in ConnectionsTab to determine partner
