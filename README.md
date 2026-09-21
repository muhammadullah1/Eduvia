# Creative Leaders School Portal — v2

An interactive React prototype built from the updated Creative Leaders School SRS. It presents all three delivery phases in one role-aware portal:

- **Management:** academic setup, admissions, examinations, fee collection, controlled offline Excel sync, finance, reports and audit.
- **Teacher:** assigned classes, attendance, lesson progress, homework/classwork updates and exam marks submission.
- **Parent:** linked children, attendance, results/DMC, fee receipts, timetable and approved updates.

## Run locally

```bash
pnpm install
pnpm dev
```

If you do not have pnpm installed, use `npm install` and `npm run dev` instead.

Then open the local address printed by Vite. The login page contains demo access for all three roles.

## Demo flow

1. Sign in from the login screen (any role).
2. Use the sidebar role switcher at the bottom to jump between **Management**, **Teacher**, and **Parent** without signing out.
3. Try workflow dialogs: **New admission**, **Record payment**, **Offline sync**, **Mark attendance**, and **Review mark sheet**.

## Production check

Verified commands:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

This is a front-end presentation prototype with representative data and interactive workflow demonstrations. Authentication, persistent storage, Excel parsing and server-side permission enforcement are intentionally ready for a backend implementation phase.
