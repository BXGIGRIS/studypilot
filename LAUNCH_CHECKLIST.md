# StudyPilot Launch Checklist

StudyPilot is ready as a local prototype when the full flow works on `http://localhost:3000`.
It is ready as a public website only after the live deployment flow is tested end to end.

## Local Checks

- [ ] `npm run build` passes.
- [ ] Local site opens at `http://localhost:3000`.
- [ ] Magic link login works.
- [ ] User lands in `/chat` after login.
- [ ] PDF upload works from the chat workspace.
- [ ] Uploaded PDF appears in the document list.
- [ ] Ready document can be selected.
- [ ] Chat accepts a Groq API key.
- [ ] Chat answers questions from the PDF.
- [ ] Citations/source previews render.
- [ ] Failed or scanned PDFs show understandable errors.

## Before Public Deploy

- [ ] Push latest `main` to GitHub.
- [ ] Connect GitHub repo `BXGIGRIS/studypilot` to Vercel.
- [ ] Add production environment variables in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] In Supabase Auth settings, add the deployed site URL.
- [ ] In Supabase Auth settings, add redirect URL:
  - `https://YOUR_SITE.vercel.app/auth/callback`
- [ ] Confirm Supabase Storage bucket `documents` exists.
- [ ] Confirm database tables and policies from `SETUP-DB.sql` are present.

## Live Website Test

- [ ] Open deployed website in a clean browser session.
- [ ] Send magic link to an email address.
- [ ] Click the magic link and confirm it returns to the deployed site.
- [ ] Upload a small text-based PDF.
- [ ] Confirm the document becomes ready.
- [ ] Ask: `what is this document about?`
- [ ] Confirm the answer uses the document content.
- [ ] Confirm citations/source previews work.

## Not Required For Prototype, But Needed For Stronger Launch

- [ ] Add usage limits/rate limiting.
- [ ] Improve wrong Groq key error handling.
- [ ] Add OCR or clear scanned-PDF guidance.
- [ ] Move Groq calls server-side if StudyPilot should use one hosted key instead of user-provided keys.
- [ ] Add proper analytics/error logging.
- [ ] Test on mobile viewport.

