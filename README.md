# Attendance Tracker

Attendance Tracker is a production-oriented attendance management application for ACHARYA NAGARJUNA UNIVERSITY, class AIML-3/1. It is built with React, TypeScript, Vite, Tailwind CSS, and Supabase, with PostgreSQL and Row Level Security acting as the source of truth.

## Architecture

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Data layer: Supabase + PostgreSQL + Authentication + Row Level Security
- Deployment target: Vercel
- Version control: Git + GitHub

## Non-negotiable rules

- Browser storage is not the authoritative database.
- Attendance uses actual conducted periods and excludes holidays and non-conducted classes.
- Lunch periods are excluded from attendance.
- The default threshold is 75% and values below it trigger warnings.
- Duplicate attendance rows are prevented by database constraints.
- Protected routes require an authenticated user.
- Security must be enforced with Supabase RLS.

## Local development

1. Install dependencies:

   npm install

2. Add environment variables to `.env.local`:

   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key

3. Start the app:

   npm run dev

## Supabase setup

1. Create a new Supabase project.
2. Apply the SQL files in `supabase/migrations`.
3. Enable Email/Password authentication.
4. Confirm the `profiles` table is populated after sign-up.
5. Validate RLS behavior using the Supabase dashboard.

## Database migrations

All production schema changes live in `supabase/migrations` and should be applied in order.

## Testing

Run:

npm test

This includes the calculation engine tests for percentage rules, holiday exclusion, not-conducted exclusion, grouped lab durations, and threshold boundaries.

## Production build

npm run build

## Deployment

Deploy the frontend to Vercel and add the same environment variables in the deployment environment. Ensure the Supabase project URL and anon key are valid for production.

## Security considerations

- Never expose the Supabase service role key in the frontend.
- Never trust client-side route checks as the only protection.
- Keep all access control in Supabase RLS policies.
- Never commit `.env.local` or `.env`.

## Backup and import

The application includes settings for CSV export, full JSON backup export, and import validation workflows.
