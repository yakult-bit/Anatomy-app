# Forma security model and launch guide

Status: application controls and migrations are implemented in this checkout. The current published Sites app has not been migrated to Cloudflare Pages. Production OAuth, provider settings, database migrations, DNS, TLS, GitHub CI and monitoring are **not verified live**. Do not advertise production sign-in as ready until the unchecked launch gates below pass.

## Threat model

Protect Google sessions, profiles, bookmarks and study history against account crossover, stolen browser tokens, login CSRF, forged scores, injection, automated abuse, secret disclosure and dependency compromise. A hostile visitor can modify every browser value, inspect the entire public anatomy dataset and call APIs directly. The browser is never an authorization or scoring authority.

The trusted boundary is Cloudflare Pages Functions, Supabase Auth/Postgres and the server-side Upstash session store. Compromise of a service-role key, provider account or deployed server code defeats this boundary. Admin accounts need MFA and restricted membership. Recognition quizzes are educational practice, not proctored examinations: the public atlas inherently reveals anatomical answers. Server validation prevents arbitrary score writes and replay; it cannot prove that someone answered without looking up the material.

The SPA, Z-Anatomy geometry, Learn mode and other exploration features remain client-rendered. The added server layer is necessary for the requested HttpOnly sessions and verified saved progress. No additional auth/database provider, analytics or replay service is used. PGlite is a local test dependency running PostgreSQL in WASM, not a hosted service.

## 1. Secrets and configuration

- `.env.example` contains empty placeholders. `.env*`, `.dev.vars*`, private keys, reports and local work are ignored; the example is explicitly unignored.
- No `VITE_` variables are needed. Any `VITE_` value is public. Supabase URL and anon/publishable key are the only allowable public configuration slots; the actual SPA talks only to same-origin `/api` endpoints.
- Service-role, Turnstile secret, Upstash token, HMAC key and Sentry configuration remain in server runtime environment settings. Google client ID/secret go directly into Supabase's Google provider settings, never into this repository.
- Turnstile's site key is intentionally public and is returned by `/api/config`. It is not its secret key. No API exposes server secrets or Supabase session tokens.
- `server/config.ts` validates exact origin, HTTPS services, environment separation, key separation and required production monitoring. Missing configuration fails closed.
- `npm run check:client` checks source and built assets for server imports/secret names; CI additionally runs gitleaks. A client-boundary check is not a replacement for scanning real secret values.
- The initial full Git history scan covered all four existing commits and found no leaks. A preliminary pattern match in a Draco decoder was not a confirmed secret. The original `.env*` rule incorrectly ignored examples; there was no secret-scanning hook.

Install gitleaks from its official release (Linux x86_64: `bash scripts/install-gitleaks.sh`), then run `npm run hooks:install`. The pre-commit hook scans the staged diff and fails if the scanner is unavailable. The installer verifies the pinned release checksum. CI scans full history and the checkout even if someone bypasses their local hook.

### If a secret was ever committed

1. Revoke/rotate it at its provider immediately. Deleting it from a file is not revocation. Investigate provider access logs and invalidate affected sessions.
2. On a separate backup/mirror clone, install `git-filter-repo`. To remove an entire secret file, use `git filter-repo --sensitive-data-removal --invert-paths --path .env`. Add each historical path. If the file must remain, use `--replace-text` with a private, untracked replacement file.
3. Coordinate the destructive history rewrite with repository administrators before force-pushing rewritten branches/tags. Ask collaborators to re-clone; old clones can reintroduce the secret. Remove affected CI artifacts, caches, releases and public bundles. Request provider help for cached PR views/forks where necessary.
4. Re-run gitleaks on all reachable refs and re-check the deployed bundle. Never place the replacement key in the rewrite rules or commit message. No history rewrite was necessary or performed in this pass.

## 2. Google sign-in

`POST /api/auth/start` requires a same-origin JSON request and a server-verified Turnstile challenge. Supabase JS uses Google OAuth with PKCE. A random HttpOnly OAuth transaction cookie is bound to a single-use, five-minute server record containing the verifier. The callback consumes that record atomically and calls `exchangeCodeForSession`; a replay or missing transaction fails. Supabase validates the Google OAuth `state`; the app additionally validates the browser-bound transaction, fixed callback URI, PKCE exchange and Google identity through `getUser`.

The callback never accepts `next`, `redirect`, a provider name or a client-supplied identity. The sole redirect is `APP_ORIGIN/api/auth/callback`, followed by the app root. A database trigger creates a profile from Auth on first Google sign-in and rejects non-Google account creation. Disable every other Auth provider in the dashboard as well.

Public exploration and guest quizzes do not require an account. Bookmarks and persistent practice data do. No email/password form, password storage or custom password system exists.

**Required OAuth correction:** Google's authorized redirect URI must be the Supabase Auth callback (`https://PROJECT.supabase.co/auth/v1/callback`), not the SPA callback. Google's JavaScript origin is the canonical app origin. Supabase's allowlist contains the exact app callback. A Supabase Auth custom domain is optional and paid. Use the normal project callback to stay on the free plan. [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 3. Database access control

Apply all SQL migrations in order to fresh, dedicated development and production projects. RLS is enabled in the same transaction as each table's creation. `profiles`, `bookmarks`, `structure_progress`, `study_days`, `quiz_runs` and `review_queue` have owner-scoped SELECT/INSERT/UPDATE/DELETE policies comparing `user_id` with `auth.uid()`.

Grants are stricter than the policies: authenticated users can read their rows and insert/delete their own bookmarks; they cannot directly mutate profiles, scores, dates or quiz plans. `anatomy_structures` is public-readable and service-role writable. Public tables contain only public atlas content. No storage buckets are created.

The profile trigger has a fixed empty search path. Server-only grading/readiness/replacement RPCs also have fixed search paths and revoked PUBLIC/anon/authenticated execution grants. All user foreign keys cascade from `auth.users`. Never grant clients these RPCs or use the service role for arbitrary user-driven queries.

`npm run test:rls` executes the actual migrations in PostgreSQL (PGlite), substitutes only Supabase's `auth.users`/`auth.uid()` environment, and proves A cannot read, insert, update or delete B's rows. It separately tests table grants and RLS policies, anonymous denial, own bookmarks, protected scores, answer replay, question order, readiness/timers and hard-delete cascades. Repeat the tests against the actual development Supabase project before launch; the local fixture does not validate hosted Auth configuration.

## 4. Sessions and authorization

The browser stores only an opaque random session cookie. In production it is `__Host-forma_session; Path=/; HttpOnly; Secure; SameSite=Lax`, without a Domain attribute. The HTTP-only localhost development exception uses an unprefixed cookie; it is rejected for production origins.

Upstash holds the access/refresh pair under a hash of that random session identifier, over HTTPS. Every protected request checks the session's server-side revocation epoch and calls Supabase `getUser(access_token)`. User IDs used in queries or privileged operations come exclusively from that verified result.

Configure Supabase access JWT expiry to **600 seconds**, with refresh rotation and reuse detection enabled (keep the recommended reuse grace interval). Redis locks serialize refreshes; conditional writes prevent resurrecting deleted sessions. The server rejects newly issued tokens lasting more than 660 seconds (600 seconds plus clock tolerance). The app enforces a seven-day absolute lifetime and 24-hour inactivity limit. Supabase's own advanced time-box/inactivity settings require Pro; the BFF limits do not. [Supabase session behavior and pricing restrictions](https://supabase.com/docs/guides/auth/sessions)

Sign-out immediately revokes all BFF sessions, deletes their token records, clears the cookie and invokes Supabase Admin sign-out with global scope. A provider failure is reported as a failure rather than pretending revocation succeeded. Already-issued JWTs can survive until expiry at Supabase; immediate BFF revocation blocks them through the app. Do not add a browser-to-database write path that bypasses this boundary.

## 5. Input handling and score integrity

Every write body uses a strict Zod schema. The streaming body reader caps actual bytes at 8 KiB, rejects non-JSON/compressed bodies, malformed UTF-8/JSON and extra fields. Structure IDs, answer strings, question counts, regions, timers and confirmation strings have explicit limits/allowlists. No input is concatenated into SQL; Supabase query-builder values and RPC arguments are parameterized. Migration identifier formatting only iterates a fixed developer-owned table list.

The server issues quiz plans. Clients submit a quiz ticket, index and answer, never a score, user ID, correctness flag or progress counters. The server reads the issued target, verifies the answer (including bounded fuzzy matching) and performs atomic grading under a database row lock. The database enforces order, expiry, timer, readiness and idempotency and computes attempts, accuracy streaks and review dates. Recognition and click rerolls are bounded, unscored replacements; content/framing rejection reasons are checked against the server catalog.

Click answers submitted through “show me” are stored with a separate `revealed` flag/count and never earn credit. Manual review requests atomically create a bookmark and review-queue row; they do not change accuracy. The next verified attempt consumes that queue row.

The original localStorage progress could be edited freely. It is not imported as earned account progress. Only display quality is persisted locally now; guest results remain in memory. Account data is cleared on sign-out and account changes, with stale-response guards and cross-tab notifications.

React handles text escaping; there is no `dangerouslySetInnerHTML` or HTML input feature. The only server HTML processing inserts a server-generated nonce into the trusted static build. No user-authored HTML or upload processing is introduced.

## 6. Rate limits and bot protection

Upstash is required because server endpoints now exist. Atomic Redis counters apply per IP and, after authentication, per verified user. Sign-in starts allow 5/IP/minute; callbacks 15/IP and 10/user/minute; API traffic 120/IP/minute and protected writes 60/user/minute (reads 120/user/minute). Fixed-window limits have a bounded boundary burst; they are not a DDoS guarantee.

Repeated client failures add exponential backoff from one second to five minutes, with a 15-minute expiry. The server trusts `CF-Connecting-IP` only because these endpoints run behind Cloudflare Pages, never client-supplied `X-Forwarded-For`. Rate identifiers are HMACs rather than stored raw IPs/user IDs. Rate/session dependency failure rejects writes instead of silently disabling protection.

Turnstile is loaded only when the user opens sign-in. The server verifies each token at Siteverify and checks success, hostname and the `signin` action. Supabase's provider rate limits remain an additional layer. [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## 7. File uploads

No upload endpoints, avatar files or buckets. Profile avatar URLs must be HTTPS Google image URLs; the account image uses `referrerPolicy="no-referrer"`. If uploads are introduced, treat that as a separate security review, not an extension of this unimplemented capability.

## 8. Transport and headers

Cloudflare Pages Functions middleware covers **all** paths, including static assets, redirects and APIs. It validates the configured canonical origin and sends 301 redirects from other hosts/HTTP. Configure both www/apex hostnames so requests actually reach Pages, and enable Cloudflare Always Use HTTPS and Full (strict) TLS. Enable automatic certificate renewal. Merely checking in the middleware does not configure DNS/TLS.

Responses include HSTS (two years, includeSubDomains, preload), nosniff, frame-deny, strict-origin referrer policy, restrictive Permissions-Policy, same-origin resource/opener policies and a nonce CSP. CSP has no unsafe-inline or general unsafe-eval; `wasm-unsafe-eval` is scoped to the required Draco WebAssembly decoder. Only same-origin scripts/assets, Turnstile and allowlisted Google avatar hosts are allowed. Blob workers are needed by Draco. APIs/callbacks and nonce-bearing HTML are never cached. CORS allows only the exact app origin, never `*`; writes additionally require exact Origin and a custom header.

The original app had no application-defined security headers. Drei's HTML labels used `style.cssText`, which strict CSP blocks. `build/csp-drei-plugin.ts` replaces exactly those two assignments with equivalent CSSOM property assignments and fails the build if upstream changes them. Existing React style properties remain compatible; dynamically injected dialog styles receive the document nonce. Verify actual headers and CSP console violations on the deployed host, including labels, quizzes, dialogs and Turnstile. [Cloudflare header behavior](https://developers.cloudflare.com/pages/configuration/headers/), [CSSOM and CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr)

HSTS's preload directive does not submit a domain to the preload list. Submit only after every affected subdomain reliably supports HTTPS; removal is slow. The middleware blocks source/environment directories and hidden paths except `.well-known`.

## 9. Responses, logs and Sentry

Database reads list columns explicitly; profile responses omit Auth IDs, internal metadata and tokens. Public structure IDs and opaque quiz operation tickets are necessary UI/protocol values, not authorization credentials. Export returns only that user's account/app data.

Users receive fixed error text, never SQL/provider messages or stacks. Server audit logs contain a fixed event, operation, status, safe code and random request ID. They omit input bodies, authorization headers, cookie headers, OAuth query strings, IPs and email. Quiz content-skip logs contain only public structure IDs and fixed rejection reasons.

Sentry runs server-side with default integrations, breadcrumbs, tracing and default PII disabled. `beforeSend` rebuilds events from an allowlist and discards requests, users, exceptions, arbitrary tags and extras. It sends only a generic failure event and safe operation tag. Configure the shortest provider retention needed and verify an actual redacted test event. Review host-level access logs separately: application scrubbing cannot change a provider's own logging of request URLs.

## 10. Encryption

Use Supabase's managed Postgres encryption at rest and TLS in transit; use HTTPS for Upstash and other provider requests. No hand-rolled encryption, password database or encryption key in the browser. The app stores no medical records. A future sensitive field first requires justification/data minimization and then a separate design using a server-held key and established pgcrypto/envelope encryption if appropriate. [Supabase security](https://supabase.com/docs/guides/security)

## 11. Data minimization and user rights

Account data is limited to Auth user ID, email, display name, Google avatar URL and study data. Account settings include JSON export and hard deletion, gated by a sign-in within five minutes and explicit DELETE confirmation. Deleting Auth's user hard-deletes all app rows via foreign-key cascades, revokes sessions and clears client memory. Deletion does not claim to instantly rewrite provider backups; configure retention and apply deletion records if restoring backups.

The privacy route `/privacy` describes purposes, cookies, providers, retention, export and deletion. No analytics, advertising, tracking or replay SDK is present. It accurately distinguishes no sale/advertising sharing from essential processing by Supabase, Google, Cloudflare, Upstash and Sentry. Quiz working records expire for use after 24 hours and are removed on the user's next quiz start; other study data remains until account deletion.

## 12. Dependencies and CI

Direct dependencies are exact-pinned with a lockfile. PR/push/scheduled GitHub Actions run gitleaks CLI, `npm audit --audit-level=low`, TypeScript, anatomy/regression/security/RLS/recognition/click tests, the client build, client-boundary scan and Pages Functions compilation. CodeQL uses the extended JavaScript/TypeScript security suite. Actions are pinned to commit SHAs. Dependabot checks npm and Actions weekly. No PR workflow receives production credentials; there is no pull_request_target execution of untrusted source.

The initial npm audit found 23 vulnerabilities (17 high, 5 moderate, 1 low). Unused vulnerable Next/Vinext/D1 starter dependencies and entrypoints were removed because they were not used by this Vite app. Required tooling and vulnerable transitive dependencies were updated. The subsequent audit reported zero known vulnerabilities. Re-run before every release; an audit is a point-in-time advisory check, not proof of safety.

Enable branch protection requiring these jobs and review lockfile/dependency changes. Install uses `npm ci --ignore-scripts`. CodeQL has not run on GitHub here: the existing source remote is a Sites repository, not the requested GitHub repository.

## 13. Hosting, custom domain and project separation

Use **Cloudflare Pages + Pages Functions** (one of the requested hosts). `wrangler.jsonc` contains no credentials and targets `dist`. Connect the chosen GitHub repository, protect `main`, use `npm run build`, output `dist`, and retain the `functions` directory. Compile locally with `npm run build:functions`.

The current Sites publication is retained as an existing artifact; it is not claimed to be the hardened production host. The actual registered short domain and destination GitHub repository have not been supplied. Do not use a generated Pages/Sites URL as `APP_ORIGIN` in production. Set `APP_ORIGIN` to exactly one HTTPS origin, without a trailing slash, and `APP_ENV=production` in host runtime configuration.

Create two **dedicated Supabase projects**, development and production; never reuse a project that serves another application with these triggers/migrations. Apply the same migration files to each. Production gets only production keys/allowlists. Development runs locally with `APP_ENV=development`, `APP_ORIGIN=http://localhost:8788` and the development project. See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for the minimum two-variable `.dev.vars` that serves public pages, and the separate complete service configuration needed for sign-in/saved data. `npm run dev:full` builds the current frontend before starting Pages. Plain Vite supports public exploration and unsigned practice.

In production Supabase, set Site URL to `APP_ORIGIN` and the sole redirect entry to `APP_ORIGIN/api/auth/callback`. No wildcards, preview hosts or localhost. In the separate development project, allow the exact localhost callback only. Configure separate Google OAuth clients/provider settings for development and production; Google origins are the respective app origins, and redirect URIs are the respective **Supabase** Auth callbacks.

Pages previews must never receive production secrets. Set only the public canonical-origin/environment routing values in preview settings so generated preview URLs redirect to the canonical app; keep all Auth/database/session secrets production-only. Local development uses the separate development project. Prefer disabling branch deployments if you cannot guarantee this separation.

### Costs and free-tier limitations

The architecture can start within Supabase, Cloudflare Pages/Turnstile, Upstash and Sentry free-tier quotas, but this is not an unlimited hosting guarantee. All asset requests pass through Functions for canonical redirects and headers, so they count toward the Pages Functions quota; free has 100,000 daily function/Worker requests. Upstash commands are consumed by session checks, locks and rate counters. Monitor quotas and fail closed rather than enabling automatic paid upgrades. [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/), [Upstash pricing](https://upstash.com/pricing/redis)

Domain registration/renewal costs money even at Cloudflare Registrar; the task assumes it is already registered. Supabase custom Auth domains and its advanced session controls are paid optional features. The BFF does not depend on them. GitHub CodeQL/code scanning is free for public repositories; private repositories require an eligible **GitHub Code Security** plan/license. Choose an appropriate repository/license rather than silently skipping that required CI job. [GitHub code scanning availability](https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning), [Supabase custom domains](https://supabase.com/docs/guides/platform/custom-domains)

## Pre-launch checklist

- [ ] Supply the canonical domain and GitHub repository; confirm authorized access to the host and both dedicated Supabase projects.
- [ ] Apply all migrations in filename order to development, run the isolation suite against hosted Postgres, then apply to production. Confirm every user table has RLS and the intended grants.
- [ ] Disable all Supabase auth providers except Google; keep email/password and anonymous auth disabled. Set 600-second JWT expiry, refresh rotation/reuse detection.
- [ ] Configure separate Google OAuth clients. Put secrets only in Supabase settings; set the correct Google callback and exact app redirect allowlists described above.
- [ ] Configure real Turnstile keys/hostnames, separate Upstash session/rate stores for development and production, a random HMAC key (at least 32 characters), and scrubbed Sentry monitoring.
- [ ] Put server secrets in encrypted Pages production runtime settings, not VITE variables, GitHub PR jobs, source, logs or preview environments.
- [ ] Connect GitHub to Cloudflare Pages deployment and enable required PR checks/branch protection; verify gitleaks, npm audit and CodeQL actually pass on GitHub. Confirm CodeQL licensing if private.
- [ ] Attach the registered canonical and alternate hostnames, enable renewable TLS, HTTPS redirect and strict origin TLS; verify generated/www/apex URLs return 301 to the canonical origin with no redirect loop.
- [ ] Verify actual headers, no cached sessions/callbacks/nonce HTML, no wildcard CORS, and no CSP violations while exercising labels, 3D decoding, dialogs, sign-in and quizzes.
- [ ] Perform live Google sign-in/callback/replay/sign-out, two-account isolation, refresh concurrency, write-rate/Turnstile failure, export and complete account deletion tests.
- [ ] Verify Find hover/cursor, two-tap touch input, simultaneous correct/wrong outlines and labels, occlusion reveal, Beginner/Advanced framing, hints and Learn return on desktop/mobile. The preview service was unavailable in this session; these are not claimed as visually verified.
- [ ] Verify the smallest/largest recognition targets visually, ghost/strict mode, resize/orbit framing and restored camera on the deployed browser. Geometric tests alone do not prove final WebGL rendering.
- [ ] Send a production test error and inspect Sentry/host logs for PII, cookies, credentials or OAuth codes; set provider retention and deletion/backup-restore procedures.
- [ ] Re-run the complete test suite, gitleaks and npm audit; inspect the production browser bundle for credentials. Review privacy text against actual provider settings.
- [ ] Confirm free-tier budgets, billing caps and expected model bandwidth. Do not submit HSTS preload before checking all subdomains.

## Verification commands

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run test:board
npm run test:security
npm run test:rls
npm run test:identify
npm run test:click
npm run build
npm run build:functions
npm audit --audit-level=low
work/bin/gitleaks git --redact --no-banner
work/bin/gitleaks dir . --redact --no-banner
```

Local mocked-provider tests exercise the real Supabase PKCE client, single-use transactions, wrong Turnstile hostname, strict input rejection, body limits, cookie flags, CSP and PII scrubbing. They do not validate Google Cloud, hosted Supabase, real Turnstile, Upstash outage behavior or live TLS settings. Those remain explicit launch gates rather than claims of completed deployment.

## Quiz verification and editable content

`src/data/anatomy.json` keeps the original Learn data and adds `landmarks`, `clinical_notes`, `related_ids`, optional pair-specific `distinctions` and source-derived `clickGeometry`. The Find feedback panel suppresses software boilerplate, uses real notes when present, and exposes a searchable missing-fields list. It does not invent missing clinical content. Most imported individual components still need editorial teaching notes; the existing 74 core groups have the broader nursing lessons. The added arm comparisons cite OpenStax's [upper-limb bones](https://openstax.org/books/anatomy-and-physiology-2e/pages/8-2-bones-of-the-upper-limb) and [upper-limb muscles](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs).

Find uses a 4% projected bounds floor for Beginner major structures and 2% for Advanced, with regional framing. The full catalog is tested at five aspect ratios using Three's actual projection matrix. Offline rasterization of the real triangles at six framing combinations supplies a conservative silhouette-coverage factor and projected connected-component sizes. The gate uses covered area rather than a hollow bounding box, and rejects fragmented targets without a dominant visible body. This sampled raster measurement is not a browser screenshot or a topology proof; keep the visual/content-review gate for exceptionally thin branches or surfaces.

Name that structure snapshots the whole scene and exploration state, and reads actual world-space spheres, footprint ranges, silhouette coverage, connected-component sizes, and pre-ranked answer choices from the build-generated `src/data/recognition-geometry.json`. The runtime gate performs a lookup; it never rasterizes triangles, scans vertices, or ranks the catalog. The generator checks content/model/policy hashes, and emits `public/data/recognition-skips.json`. The camera approach is 120 ms to fit the 300 ms interaction budget. Cold model loading and readiness calls have an 8-second timeout, followed by an unscored asynchronous reroll, capped at three automatic replacements per question before a resumable pause. Pixel-sized outlines use the installed Drei shader's pixel branch (`screenspace=false` in this version); no world-unit thickness is applied to tiny organs. A model-load failure rerolls without awarding progress; exhaustion pauses the same question with a retry message, retaining the plan, cursor and completed answers. The stable stored format key remains `identify` for compatibility; every recognition-facing category/heading/result label uses “Name that structure”.

## Local verification fixes (September 2026)

The original triangle rasterizer was already an offline script. The actual
runtime defect was repeated per-candidate distractor sorting inside synchronous
rerolls (3.6 seconds for one measured reroll), plus a precise per-vertex bounds
scan and a mandatory 700 ms approach. Offline geometry tests could not catch
the resulting blocked UI. These recognition paths now use the generated table;
no learning content or Find-mode interaction behavior was rewritten.

`test:quiz-setup` times production setup on real decoded meshes and rejects
vertex reads; `test:quiz-browser` enforces 300 ms from question start through
enabled answer buttons, including the camera approach, after explicitly warming
models. Cold downloads have a separate responsiveness/deadline test. Browser
preview is unavailable in this editing environment, so the browser test and
all Find-mode visual checks remain unverified here. Do not mark them complete
on the basis of unit or geometry tests.

Pages now auto-discovers the root `wrangler.jsonc` for local runs and deployment.
The previous custom `--config` path was rejected by Wrangler 4.129.0. Local
configuration errors name missing/invalid variables without exposing values;
production responses stay generic. The origin check still protects every page,
and APIs still require complete auth/rate-limiter configuration. `test:pages`
starts real Wrangler servers and checks these boundaries. Local HTTP verification could not complete because the environment cancelled
its network approval; direct production middleware/API tests pass without
network access. The deployment CLI path is checked without publishing; no external deployment or real Google
sign-in is claimed by this smoke test.

## Recognition feedback visibility

Recognition now keeps its isolated mesh, magenta outline, marker A and framed
camera through both correct and incorrect feedback. The visual scene/camera
restore when advancing or leaving that view; saved exploration preferences
still restore on answer. Feedback uses the same marker A to name the answer,
and suppresses imported software-description boilerplate. New sessions default
to Guided (full anatomical context). Strict now means local anatomical context;
neither setting removes every reference. Find, Recall, Function and Learn
behavior are unchanged.

The screenshot regressions use actual decoded nervous-system geometry: the
right vitreous selects one mesh (Vitreous_bodyr), and the posterior division
of the right middle brachial-plexus trunk is rejected as too small. A mismatch
between expected and loaded mesh count fails closed instead of showing a
parent group. Tests cover feedback persistence and narrow review canvases.
The browser regression also captures before/after images for local review;
browser preview remains unavailable in this editing environment. Saved source
versions do not update the live site until a separate deployment is made.

## Recognition anatomical context

The previous isolated target and camera-facing silhouette removed the spatial
information needed to distinguish joint ligaments. Recognition now uses the
atlas's actual skeleton and body surface in their original world coordinates.
`scripts/precompute-recognition-context.mjs` merges these into two Draco batches
in `public/models/z-anatomy/recognition-context.glb`; it does not invent anatomy
or alter the source GLBs. It selects neighboring bones and camera radii offline,
stored in `src/data/recognition-context.json`. Wrist references explicitly
include the carpals and the distal radius and ulna. Long bones are clipped to
their nearby bounds for framing only; their full geometry is still rendered.
`public/data/recognition-context-skips.json` lists unusable contextual frames.
Both artifacts and their source/model hashes are checked before development
and production builds. The context asset is preloaded on the recognition
settings screen, and shares the existing cold-load timeout/reroll path.

Guided draws the full surface at opacity 0.12 and skeleton at 0.18, both grey.
Strict draws those same references with a soft local spatial cutoff. Neither
uses a billboard or hides all context. The region cue is shown only in Guided.
The context radius includes neighboring bone bounds and balances target size:
the target's longest projected dimension is approximately 15–40% of the canvas,
measured at build time over viewport-ratio bins. Filled pixel area will be less
for long bones and thin sheets; it is not claimed to be 15–40%.

Each reference layer has a depth-only prepass to prevent transparent surface
stacks. The visible ghost materials never write depth and are not pickable.
The renderer draws surface, clears depth, draws skeleton, clears depth, then
draws the opaque target and magenta outline. This separate-pass order, rather
than `renderOrder` alone, ensures transparency never overlays/tints the target.
The custom renderer exists only during recognition; it restores normal
rendering, the camera and saved exploration settings when the question closes.

Regression checks cover the real dorsal radio-ulnar ligament, femur, vitreous
body and kidney; wrist bone availability; target span; ghost material and
picking rules; compositing order; and the existing 300 ms warm setup budget.
Browser tests capture anterior/orbited/local-context views for the ligament,
femur and eye, plus feedback persistence and cold-load recovery. The supervised
browser preview is unavailable here, so those captures and visual opacity
tuning remain **unverified**, not replaced by geometric tests.


## Recognition session completion

The wide-canvas regression reproduced premature exits in 10 of 10 seeded runs
at aspect ratio 2.4, after zero to two answers. Recognition was applying the
retired target-only camera's per-aspect filled-area gate to the new contextual
camera, and then clearing the whole quiz when a region had no replacement or
when three rejections accumulated across the session.

Eligibility now uses the contextual frame's projected-span bins for the actual
viewport. The original offline fragment/content checks and global thin-target
screen remain. Replacement selection prefers the current region/system, then
other structures within the existing session's system/region scope. Each new
question gets its own bounded automatic retry budget. Failed automatic recovery
never clears the session or records a fabricated answer: it pauses that question
and offers Continue session, preserving all completed answers and the original
question count. Retry remounts the failed target and clears failed GLB cache
entries. The loading and pause panels show the current question number.

The saved-session server derives replacement scope from its stored plan, not
client-supplied scope. Supabase row ownership, grading, readiness, replay checks,
the database replacement cap and rate limits are unchanged. A failed saved-run
request pauses the client without dropping its ticket; explicit sign-out still
clears that account's private state. No database migration is required.

`npm run test:quiz-session` completes 40 seeded ten-question runs over aspect
ratios 0.7, 1, 1.6 and 2.4, plus repeated per-question failures, exhausted pools,
pause/resume, saved-run request failure and stale cancellation. It verifies that
only actual answers affect progress. CI also includes a full ten-question
browser flow and a recovery flow; browser execution remains unavailable in this
editing environment, so those end-to-end tests are not claimed as verified here.

## Contextual quizzes and Find follow-up (version 10)

Recall and Function now share the same exact-target rendering path as Name that
structure. Their questions use build-generated context and mesh bounds, without
requiring three alternate structure names. Function answers are deduplicated by
actual function text, so bilateral structures cannot create identical options.
The feedback panel suppresses the atlas/software boilerplate in all three modes.
Only the target is opaque and magenta outlined; the grey reference body remains.

The version 10 Find behavior below is superseded by version 11. Find respected
the depth/opacity controls except for the required target and the
committed wrong pick, which remain accessible. It composites background, wrong
pick, and correct answer in separate passes. Transparent background tissue cannot
tint the foreground answer. Hover naming and two-tap touch confirmation remain.
Find fits eight stored bounds corners to a readable regional view before applying
the size gate: Beginner requires major structures and at least 2.5% coverage;
Advanced allows smaller named structures at 2%. This replaces the fixed-distance
regional scaling that rejected nearly every major target on wide canvases.
This bounded bounds-only calculation is cached; it never traverses triangles.

The new visible Peel layers controls select Skin, Muscles, Deep muscle, Organs or
Skeleton. Each preset loads relevant systems and clears hidden/solo/x-ray state.
Skin/fascia no longer prevent selecting exposed deeper structures after peeling.
The atlas still has no independent fat layer and no female body dataset.

All formats have a bounded model-loading deadline and a resumable pause. Failed
loads and exhausted rerolls never clear the plan or completed answers. Apply
`supabase/migrations/20260907053304_contextual_quiz_readiness.sql` before deploying
the updated full-stack API. It extends the existing service-role-only readiness
and replacement RPCs to Recall and Function. Ownership, age, sequence, replay,
rate-limit and skip-count checks remain; a readiness event awards no progress.
No production database was changed in this Site frontend publication.

Validation: `npm run test:quiz-modes` exercises ten-question runs for Find, Recall
and Function across four aspect ratios, recovery, screenshot target IDs, distinct
function choices, layer removal and the real three-pass render dispatcher.
`test:quiz-setup` additionally decodes the actual postcentral gyrus and left foot
meshes, verifies exclusive target membership/opacity and the 300ms warm budget.
`test:rls` runs the new RPCs in PostgreSQL (PGlite), including foreign-owner denial,
readiness-before-scoring and the next-question reset for both formats.
`tests/browser/quiz-modes.spec.ts` adds real pointer/DOM and screenshot checks.
Browser tests are authored but have not run in this workspace because supervised
browser preview is unavailable. Complete browser and touch-device checks before
claiming visual verification; passing geometry/state tests does not establish it.

A premade full female model is technically possible. Zygote's downloadable
[Female Anatomy Collection](https://www.zygote.com/poly-models/3d-human-collections/3d-female-anatomy-collection)
includes the body systems, lists WebGL use, and offers an optimized version.
Its price is by sales quote. A license permitting distribution in this web app
and the actual model files are needed before integration. No commercial assets
were purchased, copied, or substituted, and the male model is never relabelled.

## Find without answer clues (version 11)

Find now uses the same anterior whole-body camera, skin-level depth, visible
skin/muscle/skeleton systems, full opacity and cleared selection for every
question. The starting camera helper takes no target argument. No target system
is loaded or opened implicitly; normal depth, system, opacity and hidden-part
rules apply to the target until an answer is committed. Changing a layer or
system does not reposition the camera. The learner can use all six depth
positions, eleven system toggles, opacity, orbit/pan/zoom and camera presets.
The existing catalog size gate checks whether a structure can be studied at
manual zoom; it no longer causes a target-specific camera move at question start.

Hover is an anonymous light-blue highlight with a pointer cursor. Find has no
hover-name component, structure labels, marker, selected-part panel or searchable
structure list while unanswered. Search and selection navigation are guarded in
both the UI and the state action. Learn and free-exploration naming remain
unchanged. Touch keeps its first-tap highlight and commits on the second tap of
the same mesh. These are educational presentation controls, not a security
boundary against a learner inspecting the public browser data.

The first hint names the broad region and dims other regions without marking the
target, opening its layer or moving the camera. The second hint commits a
`revealed` outcome. After commitment, both the actual pick and the correct
structure are named, outlined and given leader lines. The reveal camera fits the
union of their stored bounds; it no longer drops a distant wrong pick out of
view. Separate background/red-pick/green-answer passes prevent covering tissue
from obscuring the reveal. Checks/crosses and solid/dashed boundaries supplement
color. Pair-specific content comparisons take priority; otherwise the panel
contrasts recorded centres and available teaching notes, without inventing
clinical information. Standard location, function and nursing notes follow.

Starting the next question synchronously clears prior material tints, emissive
values, offsets, transparency, hover, special drawing/picking priority and
camera state before rendering. Model-load failures pause the current question
instead of discarding the run. Ending Find restores the prior exploration
preferences. No other question renderer, database schema or API was changed.

Validation: `npm run test:find-no-clues` completes a ten-question run, checks
target-independent visibility for every catalog structure at every start,
resets real Three materials from each feedback color, verifies search/hint/layer
behavior and projects both reveal bounds at portrait and landscape ratios.
`test:click` and `test:quiz-modes` cover picking, touch confirmation, grading and
the existing Recall/Function paths. Browser tests include ten consecutive canvas
comparisons, anonymous hover, layer/search controls, labelled reveals and Learn
naming. They are authored but **not executed here**: the supervised preview
service is unavailable. Verify desktop pointer input, touch, orbiting and the
actual rendered colors locally before marking visual acceptance complete.


## Historical female HRA subset (v12; replaced by the NIH import below)

The free model is the HRA united-female v1.5 female-donor torso collection, using Anatria3D's pinned CC BY 4.0 mesh adaptations. It adds 264 premade meshes / 275 selectable pieces and groups, seven available systems and 18 core lessons. It does not add a full skin, muscle, limb, head, heart, lung or nervous model. Male Z-Anatomy geometry, labels and nursing overlays are never reused as female anatomy. Previous notes that this app had no female dataset are superseded by this partial addition. Original source notices, checksums and modifications are linked in the female footer. No paid asset or additional service is required.

`shared/atlas.ts` distinguishes the actual mesh donor: old male entries marked `sex: both` remain male-source geometry. Separate `female_` IDs prevent progress collisions. The UI, search, board, labels, system loader, Learn selection, quiz pools and server-side rerolls filter by the chosen donor. Model switching clears stale selection and layer state; switching is disabled during a practice run, and resuming after Learn returns to the quiz donor. Female nursing overlay controls are withheld because male marker coordinates have not been validated on this donor. Missing structures are disabled instead of silently substituted.

Saved quiz input permits only `model: male | female`; omission defaults to male for older clients. This preference is not an identity or authorization claim. User identity still comes from the verified session; grade computation and RLS remain server-side. The new `20260907060000_female_catalog.sql` migration adds only public content rows required by existing foreign keys. Apply it to the dedicated development project, verify, then to production before deploying the full-stack update. No hosted database was changed for this static Site publication. The connected Supabase project was not assumed to be a dedicated development or production database.

Female triangle coverage and disconnected-component measurements run only in the importer/build scripts. Separate static recognition geometry, ghost context and skip reports ship with the app. Quiz setup uses the existing exact-target renderer and metadata lookups. Upstream meshes contain coincident-vertex triangles: re-encoding discards these degenerate triangles; integrity tests account for them, verify the remaining triangle counts, bounds and source names, and never silently accept a missing mesh.

Verification: all seven female Draco files decode and map to 264 source names / 275 unique IDs. Left/right orientation, uterus/bladder relative position, separate 39-bone context, available-system loading, layer controls, donor switching, strict server schemas and same-donor quiz options pass. Four full ten-question female sessions pass; measured warm setup plus transition/frame allowance was under 160 ms on the test runner, against a 300 ms gate. Male source/board, Find no-clue, click, recognition, ten-question-session, quiz-mode and security tests pass. The PostgreSQL fixture additionally checks female bookmark and graded-progress foreign keys with A/B isolation and account cascade.

Browser tests were added for switching to the female atlas and completing each quiz format. They have **not run here**: the supervised browser-preview mailbox is unavailable. Geometry/CPU checks are not a visual or touch-device verification. Inspect breast/organ overlap, female pelvic context, orbit, selection, mobile layout and all four quiz formats in a browser before treating this partial donor model as classroom-ready.

## Pre-launch public-web pass

The existing security, auth, input, bot and recognition precomputation controls were reviewed and retained. `/terms` and `/credits` now accompany `/privacy`; `/` and `/about` contain initial HTML prose. `/learn` and `/quiz` retain the lab with unique route metadata. Geometry, HRA female assets and OpenStax text remain separately licensed; credit links and the required OpenStax access string appear in the public and lab footers. The preview image comes from the user's actual app capture; it is hosted on the app origin allowed by the existing CSP.

Pages middleware explicitly permits crawler files, returns styled 404 responses even when the static origin would return an SPA 200, and rewrites canonical/OG metadata from validated `APP_ORIGIN`. Build-time `SITE_ORIGIN` controls static pages and sitemap generation and must match that production origin. Empty/generated build origins remain noindex, and non-canonical Pages hosts redirect with noindex. Versioned model URLs and hashed application assets receive a year of immutable caching. No secret, HTTPS, validation or bot-protection implementation was replaced.

The homepage no longer starts WebGL or downloads any anatomy GLB. Male exploration retains its two starting systems; female exploration starts with skeletal, urinary and reproductive systems, loading the rest when enabled. Twenty-two measured failing text-color pairs were repaired to at least 5.52:1, and visible focus rings were expanded. No analytics, consent banner or additional external service was added.

`PRELAUNCH.md` records actual artifact sizes, all eleven male models, the before/after contrast table, 148 valid internal HTML references and 2,350 related IDs, plus precise verification limits. The middleware/metadata/404/crawler/cache checks pass in process. Lighthouse's four scores, a live HTTP crawl, actual feedback rendering, 375 px browser layout, real-touch behavior and mid-range hardware remain **unverified**, because the supervised preview service is unavailable and no physical device is attached. The Sites preview instructions prohibit a substitute browser/server path. The authored browser regressions and Lighthouse JSON threshold checker must run before public launch; no passing visual or performance score is claimed from CPU tests.


## NIH 3D reference-organ replacement

The v12 audit found no male-to-female geometry deformation in the import path, but no individual NIH licence verification. The active subset is now replaced by seven individually reviewed NIH 3D HRA / Visible Human Female records. All seven specifically license their models CC BY 4.0. Exact creators, IDs, versions, page URLs, source/output checksums and conversions are in `public/credits/nih-hra-models.json`; the full inventory and mesh results are in `docs/NIH-HRA-IMPORT.md`.

The UI offers **Female reproductive anatomy**, a separate reference-organ set, alongside the default male whole-body atlas. No organ is aligned to or inserted into the male donor. Availability and missing anatomy are explicit. Forty source meshes and four groups have independent identifiers; 43 entries have OpenStax-sourced lessons, and one questionable annotation is excluded from all question formats and distractors. Its missing fields are shown and logged.

Migration `20260907083540_nih_hra_provenance.sql` adds per-row `source`/`license` JSONB with separate geometry and text records plus `available` to `anatomy_structures`. Public read and service-role-only write RLS remain intact. Retired source IDs stay present for saved-record foreign keys and data export. Existing Supabase identity/session/scoring controls are unchanged. The migration passed local PostgreSQL/PGlite cross-user and provenance tests; it has **not been applied to a hosted Supabase project**.

Offline checks: 202,807 decoded triangles; 28 of 40 meshes have open boundary edges; no detected non-manifold edges at the documented weld tolerance. All 8,180 sampled rays hit real surfaces. This is not a watertightness proof. Runtime geometry work remains limited to existing decoding/BVH preparation; recognition footprints remain static lookup data. Forty female quiz questions completed in four sessions with warm setup below the 300 ms CPU budget. Real WebGL outline/orbit and touch verification remain pending because the supported preview daemon is unavailable.

No new third-party service, payment or model purchase was added. Geometry, OpenStax text and NIH models remain separately licensed components, credited in the footer, `/credits`, `/terms` and per-structure content. This is educational reference content, not independent clinical validation of research surfaces.
