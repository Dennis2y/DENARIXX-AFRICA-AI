---
name: Expo workflow health check
description: The restart_workflow tool consistently fails for Expo mobile artifacts on Replit; how to work around it.
---

The `restart_workflow` tool always reports **DIDNT_OPEN_A_PORT** for the `artifacts/denarixx-mobile: expo` workflow, regardless of timeout used (30, 90, 120 all fail).

**Why:** For `kind = "mobile"` / `router = "expo-domain"` artifacts, the Replit health check likely verifies the Expo dev domain URL rather than just localhost:PORT. The Expo dev domain only becomes accessible once Metro has compiled and registered with Expo's infrastructure (~60-90 s). A port-binding proxy that responds immediately on localhost:24951 does NOT satisfy this check.

**How to apply:**
- Do NOT waste time trying to make `restart_workflow` succeed for Expo workflows.
- After building/editing the app, tell the user to **start the workflow from the Replit UI** (Workflows panel → Expo → Run). The workflow runs correctly from the UI — it just can't be health-checked programmatically via `restart_workflow`.
- The web preview in Replit's preview pane will load once Metro finishes compiling (~90 s after the user starts it).
- Call `presentArtifact` regardless — it opens the preview pane for the user.
