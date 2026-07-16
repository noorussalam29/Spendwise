# Spendwise

A personal expense tracker built for managing salary, EMIs, family support, and savings goals month to month — checking spending often and staying on pace before payday.

## Features

- Secure email/password login (each user sees only their own data)
- Add, edit, delete, filter, and search expenses
- Dashboard with spending pace vs. budget, category breakdown, and recent transactions
- Monthly budgets per category with warning states
- Recurring expenses (rent, EMIs, subscriptions) auto-logged each month
- Savings goals tracked against the Savings category
- Month-over-month recap
- Export to CSV and PDF

## Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Backend: MongoDB + Mongoose, Next.js API routes
- Auth: NextAuth.js
- State/Data: Zustand, TanStack Query
- Forms/Validation: React Hook Form + Zod
- Charts: Recharts