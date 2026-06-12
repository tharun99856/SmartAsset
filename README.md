# SmartAsset — campus equipment, without the logbook

A full-stack asset management and resource allocation platform for the cultural
council's equipment room. Students browse a live catalog and request gear for a
date range; admins approve from a single queue, hand kit over with a QR scan,
and every action lands in an append-only audit trail.

Built with **Next.js 16 (App Router)**, **Prisma 7 + PostgreSQL** (Neon-ready), and JWT cookie auth.

## Quick start

You need a Postgres connection string — a free [Neon](https://neon.tech) project takes a minute
(create project → Connect → copy the pooled connection string).

```bash
npm install                  # also runs prisma generate
cp .env.example .env         # paste your DATABASE_URL + a random JWT_SECRET
npm run db:push              # create the tables
npm run seed                 # 56 assets, demo users, bookings in every state
npm run dev
```

Then open http://localhost:3000 and sign in with the **demo IDs** (seeded accounts set up
purely for evaluation):

| Role    | Email                   | Password   |
| ------- | ----------------------- | ---------- |
| Admin   | admin_r@ee.iitr.ac.in   | admin123   |
| Student | student_t@ee.iitr.ac.in | student123 |

(The login page has one-tap fill buttons for both.)

## What's inside

**For students**
- Faceted catalog search — query, category and availability filters live in the
  URL, so a filtered view can be shared as a link
- Date-range booking requests with clash detection: a request is only accepted
  if every unit it needs is free for the *entire* window, checked inside a
  database transaction against all approved/issued/overdue bookings
- Personal booking timeline with one-click cancel and live notifications

**For admins**
- Analytics overview: utilization donut, top-borrowed assets, 7-day request trend
- Approval queue, active allocations, overdue tracker
- Inventory CRUD with printable QR labels per asset
- **Scan station** (`/dashboard/scan`): point a camera at any QR label and get
  that item's live allocations with one-tap *hand over* / *check in*
- Append-only audit trail of every write in the system

**Lifecycle**: `Pending → Approved → Issued → Returned`, with `Rejected`,
`Cancelled`, `Expired` (pending requests whose start date passed) and `Overdue`
(issued items past due) handled automatically.

## Project layout

```
src/
├── proxy.js               # Route protection (Next 16's middleware)
├── app/
│   ├── page.js            # Landing page
│   ├── login/             # Sign in / register
│   ├── dashboard/         # Role-aware shell (sidebar + notifications)
│   │   ├── catalog/       # Student: browse + book
│   │   ├── my-bookings/   # Student: track + cancel
│   │   ├── requests/      # Admin: approve / reject queue
│   │   ├── allocations/   # Admin: what's out right now
│   │   ├── overdue/       # Admin: late returns
│   │   ├── inventory/     # Admin: CRUD + QR labels
│   │   ├── scan/          # Admin: QR scan station
│   │   └── audit/         # Admin: append-only history
│   └── api/               # Route handlers (auth, assets, bookings, audit…)
└── lib/
    ├── db.js              # Prisma client (pg driver adapter)
    ├── auth.js            # JWT sign/verify helpers
    ├── availability.js    # Overlap-window inventory formula
    ├── audit.js           # Append-only logger
    └── seed.mjs           # Demo dataset
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo. The defaults are
   correct (Next.js preset; `postinstall` already runs `prisma generate`).
3. In **Environment Variables**, add `DATABASE_URL` (your Neon pooled connection string) and
   `JWT_SECRET` (any long random string).
4. Deploy. First time only, create the tables and demo data against the same database from your
   machine: `npm run db:push && npm run seed`.

The QR scan station needs camera access, which browsers only allow over HTTPS — Vercel provides
that out of the box, so scanning works on the deployed URL (and on phones).

## The double-booking guard

Before any request is accepted (and again inside the approval transaction), the
engine sums the quantities of every overlapping `Approved/Issued/Overdue`
booking and refuses the request unless `allocated + requested ≤ totalQuantity`
holds across the whole window. Physical stock counters are additionally
decremented atomically on approval, so the count can never go negative even
under concurrent admins.
