# Forma: interactive anatomy for nursing students

Forma is a 3D anatomy lab and quiz app built for nursing students. You can rotate, isolate and inspect more than 3,000 anatomical structures, read nursing-focused notes, and practice with four quiz formats that track what you know and schedule reviews.

## Features

- **3D anatomy lab**: 11 body systems, each loaded on demand. Hide, isolate or X-ray any part, pop a structure out for a 360° view, or browse everything as a flat study board with search and filters.
- **Nursing content**: location, function and clinical notes, plus overlays for IM injection sites, pulse points, heart and lung listening areas, and common IV sites.
- **Four quiz formats**: click the structure on the model, multiple-choice identification, free recall (with fuzzy matching), and structure-to-function matching. You can filter by system or region and pick 5 to 50 questions, with an optional timer.
- **Progress tracking**: scores, per-structure accuracy, weakest systems, daily streaks, and spaced-repetition reviews (missed items come back right away; correct ones return after 1, 3, 7, 14 and 30 days).
- **Accounts (optional)**: sign in with Google to save progress and bookmarks. Guests can explore and practice without an account.
- **Female reference organs**: a separate scene of reproductive and pelvic organs from the NIH Human Reference Atlas.
- **Mobile friendly**: touch controls, a bottom-sheet layout, keyboard shortcuts and a text-only structure list.

## Tech stack

| Area | Tools |
|---|---|
| Frontend | React, TypeScript, Vite, React Three Fiber, Drei, Tailwind CSS, shadcn/Radix, Zustand |
| Backend | Cloudflare Pages Functions |
| Database and auth | Supabase (PostgreSQL with row-level security, Google OAuth) |
| Sessions and rate limits | Upstash Redis, Cloudflare Turnstile |
| Data pipeline | Python and Node scripts, glTF Transform, Draco compression |
| Testing | Node test scripts, PGlite (Postgres in WASM), Playwright |

## Data pipeline

The anatomy models come from existing open datasets rather than being made by hand:

1. **Fetch**: `scripts/fetch-z-anatomy.py` downloads the pinned [Z-Anatomy](https://github.com/LluisV/Z-Anatomy) FBX files (about 222 MB) and verifies every file against its Git checksum.
2. **Convert**: `scripts/import-z-anatomy.mjs` converts the meshes to glTF, maps them to study structures, normalizes scale, and splits them into 11 Draco-compressed files, one per body system.
3. **Precompute**: `scripts/precompute-quiz.mjs` builds lookup data for the quizzes ahead of time so questions load quickly in the browser.
4. **Verify**: `npm test` checks source checksums, model mappings, orientation and quiz logic.

The female reference organs follow the same steps (`npm run models:female`) using seven individually licensed NIH 3D models. See [docs/NIH-HRA-IMPORT.md](docs/NIH-HRA-IMPORT.md).

Study content lives in `src/data/anatomy.json` and can be edited directly.

## Database

The schema is in `supabase/migrations/`. Tables include `profiles`, `bookmarks`, `structure_progress`, `study_days`, `quiz_runs` and `review_queue`. Every user table uses row-level security so each user can only access their own rows, and quiz grading runs on the server so scores can't be faked from the browser. `npm run test:rls` runs the real migrations in a local Postgres and checks that one user can't read or change another user's data.

## Run locally

Requires Node 22.13 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:5173. The homepage is at `/`, the lab at `/learn`, and practice at `/quiz`. Exploring and guest quizzes work without any configuration. To run sign-in and saved progress locally, see [docs/local-development.md](docs/local-development.md).

Useful commands:

| Command | What it does |
|---|---|
| `npm run build` | Precompute quiz data, type-check and build |
| `npm test` | Verify models, sources and quiz logic |
| `npm run test:rls` | Test database security policies |
| `npm run test:security` | Test auth, input validation and headers |
| `npm run test:quiz-browser` | Browser tests with Playwright |

## Project structure

```
src/           React app (3D viewport, lab, quiz panels, state)
shared/        Quiz and recognition logic shared by app and server
server/        API, auth, sessions and database access
functions/     Cloudflare Pages Functions entry points
supabase/      Database migrations
scripts/       Data pipeline, precompute and test scripts
public/        Compressed models, precomputed data and credits pages
docs/          Setup guide, launch checklist and import reports
```

## Security

See [SECURITY.md](SECURITY.md) for the threat model, auth flow and deployment setup. Remaining release steps are in [docs/launch-checklist.md](docs/launch-checklist.md).

## Credits and licenses

- 3D anatomy: [Z-Anatomy](https://github.com/LluisV/Z-Anatomy), CC BY-SA 4.0, with component-specific terms from the upstream notice.
- Female reference organs: [NIH 3D Human Reference Atlas](https://3d.nih.gov/), CC BY 4.0, credited per model.
- Female organ study notes: adapted from [OpenStax Anatomy and Physiology 2e](https://openstax.org/details/books/anatomy-and-physiology-2e), CC BY-NC-SA 4.0.

Full notices are in `public/credits/` and on the in-app credits page. Forma is an educational reference, not clinical guidance.
