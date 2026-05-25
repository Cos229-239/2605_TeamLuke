# ParentVault

ParentVault is a mobile app for parents to organize child profiles, schedules, reminders, imports, journal entries, and parent controls in one place.

## Project Structure

```text
ParentVault/
  apps/
    mobile/      Expo React Native app
    api/         Node/Fastify API skeleton
  packages/
    shared/      Shared TypeScript models and helpers
```

## Main App Areas

- Profiles — child information, care details, school, medical, and custody notes.
- Schedule — custody, school, appointment, medication, and pickup reminders.
- Nanny Bot — child-focused assistant flow for saved information and reviewed drafts.
- Import — documents, images, and pasted text reviewed before saving.
- Journal — factual entries with timestamps, sources, tags, and notes.
- Settings — privacy, sharing, backup, and parent-control toggles.

## Setup

From the `ParentVault` folder:

```bash
npm install
npm run typecheck
npm run mobile
```

## Notes

- Do not commit real `.env` files or secrets.
- Keep work on a personal branch until it is ready for review.
- Use clear commit messages that describe what changed.
