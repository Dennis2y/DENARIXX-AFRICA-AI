# Denarixx Africa AI — Deployment Checklist

## Environment Variables

### Required
- DATABASE_URL
- CLERK_SECRET_KEY
- VITE_CLERK_PUBLISHABLE_KEY
- OPENAI_API_KEY
- LIVEKIT_API_KEY
- LIVEKIT_API_SECRET
- LIVEKIT_URL
- PUBLIC_APP_URL

### Optional but recommended
- RESEND_API_KEY

## Frontend
- Build command: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/denarixx run build`
- Output directory: `artifacts/denarixx/dist/public`

## Backend
- Build command: `pnpm --filter @workspace/api-server run build`
- Start command: `pnpm --filter @workspace/api-server run start`

## Production Tasks
- Configure HTTPS
- Configure production database
- Configure Clerk production URLs
- Configure LiveKit production URL
- Add Resend API key
- Replace local file upload storage with cloud storage
- Run final security audit
