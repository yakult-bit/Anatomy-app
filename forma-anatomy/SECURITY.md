# Security model


## Threat model

Protect Google sessions, profiles, bookmarks and study history against account crossover, stolen browser tokens, login CSRF, forged scores, injection, automated abuse, secret disclosure and dependency compromise. A hostile visitor can modify every browser value, inspect the entire public anatomy dataset and call APIs directly. The browser is never an authorization or scoring authority.

The trusted boundary is Cloudflare Pages Functions, Supabase Auth/Postgres and the server-side Upstash session store. Compromise of a service-role key, provider account or deployed server code defeats this boundary. Admin accounts need MFA and restricted membership. Recognition quizzes are educational practice, not proctored examinations: the public atlas inherently reveals anatomical answers. Server validation prevents arbitrary score writes and replay; it cannot prove that someone answered without looking up the material.

The SPA, Z-Anatomy geometry, Learn mode and other exploration features remain client-rendered. No additional auth/database provider, analytics or replay service is used. PGlite is a local test dependency running PostgreSQL in WASM, not a hosted service.

## 1. Secrets and configuration

- `.env.example` contains empty placeholders. `.env*`, `.dev.vars*`, private keys, reports and local work are ignored; the example is explicitly unignored.
- No `VITE_` variables are needed. Any `VITE_` value is public. Supabase URL and anon/publishable key are the only allowable public configuration slots; the actual SPA talks only to same-origin `/api` endpoints.
- Service-role, Turnstile secret, Upstash token, HMAC key and Sentry configuration remain in server runtime environment settings. Google client ID/secret go directly into Supabase's Google provider settings, never into this repository.
- Turnstile's site key is intentionally public and is returned by `/api/config`. It is not its secret key. No API exposes server secrets or Supabase session tokens.
- `server/config.ts` validates exact origin, HTTPS services, environment separation, key separation and required production monitoring. Missing configuration fails closed.
- `npm run check:client` checks source and built assets for server imports/secret names; CI additionally runs gitleaks. A client-boundary check is not a replacement for scanning real secret values.

Install gitleaks from its official release (Linux x86_64: `bash scripts/install-gitleaks.sh`), then run `npm run hooks:install`. The pre-commit hook scans the staged diff and fails if the scanner is unavailable. The installer verifies the pinned release checksum. CI scans full history and the checkout even if someone bypasses their local hook.

### If a secret was ever committed

1. Revoke/rotate it at its provider immediately. Deleting it from a file is not revocation. Investigate provider access logs and invalidate affected sessions.
2. On a separate backup/mirror clone, install `git-filter-repo`. To remove an entire secret file, use `git filter-repo --sensitive-data-removal --invert-paths --path .env`. Add each historical path. If the file must remain, use `--replace-text` with a private, untracked replacement file.
3. Coordinate the destructive history rewrite with repository administrators before force-pushing rewritten branches/tags. Ask collaborators to re-clone; old clones can reintroduce the secret. Remove affected CI artifacts, caches, releases and public bundles. Request provider help for cached PR views/forks where necessary.
4. Re-run gitleaks on all reachable refs and re-check the deployed bundle. Never place the replacement key in the rewrite rules or commit message.

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

Account data is limited to Auth user ID, email, display name, Google avatar URL and study data. Account settings include JSON export and hard deletion, gated by a sign-in within five minutes and explicit DELETE confirmation. Deleting Auth's user hard-deletes all app rows via foreign-key cascades, revokes sessions and clears client memory.

The privacy route `/privacy` describes purposes, cookies, providers, retention, export and deletion. No analytics, advertising, tracking or replay SDK is present. It accurately distinguishes no sale/advertising sharing from essential processing by Supabase, Google, Cloudflare, Upstash and Sentry. Quiz working records expire for use after 24 hours and are removed on the user's next quiz start; other study data remains until account deletion.

## 12. Dependencies and CI

Direct dependencies are exact-pinned with a lockfile. PR/push/scheduled GitHub Actions run gitleaks CLI, `npm audit --audit-level=low`, TypeScript, anatomy/regression/security/RLS/recognition/click tests, the client build, client-boundary scan and Pages Functions compilation. CodeQL uses the extended JavaScript/TypeScript security suite. Actions are pinned to commit SHAs. Dependabot checks npm and Actions weekly. No PR workflow receives production credentials; there is no pull_request_target execution of untrusted source.

The initial npm audit found 23 vulnerabilities (17 high, 5 moderate, 1 low). Unused vulnerable Next/Vinext/D1 starter dependencies and entrypoints were removed because they were not used by this Vite app. Required tooling and vulnerable transitive dependencies were updated. The subsequent audit reported zero known vulnerabilities. Re-run before every release; an audit is a point-in-time advisory check, not proof of safety.

Enable branch protection requiring these jobs and review lockfile/dependency changes. Install uses `npm ci --ignore-scripts`.

## 13. Hosting, custom domain and project separation

Use **Cloudflare Pages + Pages Functions**. `wrangler.jsonc` contains no credentials and targets `dist`. Connect the chosen GitHub repository, protect `main`, use `npm run build`, output `dist`, and retain the `functions` directory. Compile locally with `npm run build:functions`.

Do not use a generated Pages/Sites URL as `APP_ORIGIN` in production. Set `APP_ORIGIN` to exactly one HTTPS origin, without a trailing slash, and `APP_ENV=production` in host runtime configuration.

Create two **dedicated Supabase projects**, development and production; never reuse a project that serves another application with these triggers/migrations. Apply the same migration files to each. Production gets only production keys/allowlists. Development runs locally with `APP_ENV=development`, `APP_ORIGIN=http://localhost:8788` and the development project. See [docs/local-development.md](docs/local-development.md) for the minimum two-variable `.dev.vars` that serves public pages, and the separate complete service configuration needed for sign-in/saved data. `npm run dev:full` builds the current frontend before starting Pages. Plain Vite supports public exploration and unsigned practice.

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
- [ ] Verify Find hover/cursor, two-tap touch input, simultaneous correct/wrong outlines and labels, occlusion reveal, Beginner/Advanced framing, hints and Learn return on desktop/mobile.
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

Local mocked-provider tests exercise the real Supabase PKCE client, single-use transactions, wrong Turnstile hostname, strict input rejection, body limits, cookie flags, CSP and PII scrubbing. They do not validate Google Cloud, hosted Supabase, real Turnstile, Upstash outage behavior or live TLS settings.
