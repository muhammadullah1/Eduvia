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

Then open the local address printed by Vite. The login page contains demo access for all three roles. The password for every role is `password`.

## Demo flow

1. Sign in from the login screen. An empty email or any password other than `password` is rejected.
2. Use the sidebar role switcher to move between **Management**, **Teacher**, and **Parent**. Admissions, receipts, attendance, updates, and mark sheets stay in one shared school session.
3. Try **New admission**, **Record payment**, **Offline sync** (load the sample workbook and review skipped rows before importing), **Mark attendance**, and **Review mark sheet**. Published marks and published updates are what parents see. Submitted or published mark sheets stay locked until management reopens them.
4. Use **Reset demo school** in the sidebar to restore the starting register.

## Production check

Verified commands:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

The interface runs entirely in the browser on realistic dummy data. Creating admissions, recording payments, importing a fee workbook, marking attendance, editing lessons, drafting updates, and moving mark sheets through review all update the same in-browser school. Use **Reset** on Reports & audit to restore the original sample.

Demo password for every role: `password`.
