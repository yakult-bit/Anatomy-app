# Running Forma locally

Use Node 24 and the committed lockfile. Commands below work in PowerShell, CMD,
or a Unix shell; they do not need Bash.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Public exploration and unsigned practice work here.
Google sign-in and saved data need the Pages server below.

## Local Pages server: minimum configuration

Create **`.dev.vars` beside `wrangler.jsonc`**, containing:

```dotenv
APP_ENV=development
APP_ORIGIN=http://localhost:8788
```

Then run:

```sh
npm run dev:full
```

This builds the latest frontend first, then runs `wrangler pages dev dist
--port 8788`. Open **http://localhost:8788** exactly. A request to 127.0.0.1
redirects to the configured localhost origin. Restart after changing `.dev.vars`;
restart `dev:full` to rebuild frontend changes. Use plain Vite for fast UI editing.

Those two variables allow `/`, static assets, exploration, and unsigned quizzes.
They do **not** enable sign-in. `/api/*` returns a local 503 naming any missing
service variables until the full configuration is supplied. This is deliberate:
there is no fake authentication, production-key fallback, or disabled limiter.

## Google sign-in and saved data

Use `.dev.vars.example` as a checklist and fill in these **development** values:

| Variable | Value source |
| --- | --- |
| `SUPABASE_URL` | Dedicated development Supabase project's HTTPS URL |
| `SUPABASE_PUBLISHABLE_KEY` | That project's publishable key (or legacy anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Development server secret/service-role key; never a `VITE_` variable |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile widget configured for localhost |
| `TURNSTILE_SECRET_KEY` | Matching Turnstile secret |
| `UPSTASH_REDIS_REST_URL` | Development Upstash database's HTTPS REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Matching REST token |
| `RATE_LIMIT_HMAC_KEY` | A fresh random string of at least 32 characters |

Generate the last value locally (do not share its output):

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`SENTRY_DSN` is optional locally. Leave it empty to disable local monitoring;
`SENTRY_ENVIRONMENT=development` is optional. Production still requires Sentry.

Apply the migrations in `supabase/migrations` to the dedicated development
project. Enable Google in Supabase, with the Google client secret stored only in
Supabase's provider settings. Add `http://localhost:8788/api/auth/callback` to
that project's app redirect allowlist. In Google, use the Supabase provider
callback URL shown by the dashboard (normally
`https://<dev-project-ref>.supabase.co/auth/v1/callback`); it is distinct from
the app callback. See [`SECURITY.md`](../SECURITY.md) for the full OAuth/domain checklist.

No paid plan is required for these code changes or local tests. Real services
need your own development credentials; an existing domain may have renewal costs.

## Diagnosing configuration failures

Local 503 responses now say **Missing: ...** or **Invalid: ...**, listing only
variable names. Server logs list the same names. Values, tokens and Zod error
objects are never printed. Production visitors receive a generic message.

`wrangler.jsonc` is the single shared configuration for development, Functions
builds, and deployment. It supplies `compatibility_date=2026-09-06` and
`compatibility_flags=["nodejs_compat"]`, including support for Sentry's
`node:async_hooks` import. Do not pass `--config` to Pages commands.

```sh
npm run build:functions
```

This is a local compile check. Its wrapper reads the date and Node compatibility flags from `wrangler.jsonc` and forwards them explicitly, because the standalone Functions compiler does not inherit them automatically. When you are ready to publish to your own
configured Cloudflare Pages project, `npm run deploy:pages` builds and calls
`wrangler pages deploy dist`, using the same root configuration. This command
does publish. GitHub-connected Pages builds should use `npm run build`, output
`dist`, and the checked-in `functions` directory. No deployment was performed
as part of these local bug fixes.

## Quiz data and performance checks

`src/data/recognition-geometry.json` is generated at build time and committed,
keyed by `meshName`. It contains actual world-space spheres, sampled
silhouette coverage and connected components, projected footprint ranges, and
three pre-ranked distractors. Each `frames` tuple is `[minimum footprint, maximum footprint, edge, rejection reason]` for consecutive global `aspects` boundaries. Compact tuples keep the lookup lightweight. `public/data/recognition-skips.json` lists content
and geometry failures, including failures that depend on the viewport ratio.

```sh
npm run quiz:precompute
npm run test:quiz-setup
npx playwright install chromium
npm run test:quiz-browser
```

The generator hashes models, content, and its policy code. Unchanged builds
reuse the file; changed inputs regenerate it. `npm run dev` only checks freshness
and explains how to regenerate; it never rasterizes triangles. CI rejects stale
metadata with `npm run quiz:check`.

The browser regression starts its wall clock **before starting the question**
and requires four enabled answer buttons within **300 ms**, including the
120 ms camera approach. It covers eligible smallest/largest targets with all
systems shown, systems hidden, and x-ray/depth settings enabled. It also checks
animation-frame gaps. GLBs are warmed before this test: network transfer and
Draco decoding cannot have a universal 300 ms bound. A separate cold-load test
stalls downloads and checks the real loading panel, an 8-second timeout,
unscored reroll, and the End session control. At most three replacements are
attempted; each yields to input and has its own bounded load/API wait.

The browser tests are checked in and run on pull requests. They have **not been
run in the current editing environment**, whose browser preview service is
unavailable. The real Wrangler HTTP smoke test is also unverified here because
the environment cancelled its local network approval. Direct production
middleware/API tests (`npm run test:pages-config`) do run without network access. Find-mode hover, pointer cursor, simultaneous correct/incorrect
highlighting, occlusion reveal, and teaching feedback remain **visually
unverified**. Automated geometry/state assertions do not change that status.
