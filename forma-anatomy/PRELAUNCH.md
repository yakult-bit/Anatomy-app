> Current female reference data supersedes the v12/v13 measurements below. See [NIH 3D import report](docs/NIH-HRA-IMPORT.md): seven individually licensed official records, 40 meshes / 44 selectable entries, 708,732 bytes of runtime systems + 222,664 bytes of quiz context. The v12/v13 entries below are historical. Actual browser checks are still pending.

# Pre-launch verification — 7 September 2026

This report covers the public-web pass and the separate free female model addition. Existing security controls were reviewed in `SECURITY.md` before editing. The code and artifact checks below passed; **this is not a completed production, Lighthouse, visual or physical-device acceptance report**. The private static Site is a demonstration frontend. The production custom domain and full-stack Supabase deployment are not configured or verified by this update.

## Existing work retained

Secrets handling, environment examples, gitleaks, Google PKCE, HttpOnly sessions, server validation, RLS, Turnstile, rate limiting, HTTPS, CSP and other security headers, PII scrubbing, export/deletion, CI and dependency updates already exist. They were not rebuilt. The root Wrangler configuration already supplies the compatibility date and `nodejs_compat`; `dev:full` and deploy no longer pass a custom Pages config path. The direct production-handler configuration test still passes. No analytics, tracking SDK, cookie banner, upload service or replacement authentication provider was added.

Recognition geometry was already precomputed. The runtime uses metadata lookups, a short camera transition and bounded loading/recovery, not synchronous triangle rasterization. `test:quiz-setup` checked 621 eligible male structures using real decoded geometry: maximum runtime setup **7.80 ms**, maximum reroll **5.86 ms**, context setup **1.09 ms**. Adding the 120 ms transition and 34 ms frame allowance stays below 300 ms. The separate female test completed 40 questions with maximum warm setup plus allowance **155.91 ms**. These are runner measurements, **not a browser question-to-interactive measurement**. The existing browser regression times from question start through enabled answer buttons and fails above 300 ms; it has not executed here. Cold network/decoder waits have a separate hard deadline and resumable recovery. Static skip reports remain in `public/data/`.

## Pages, licences and discoverability

| Item | Change and verification | Previously missing or unsafe |
| --- | --- | --- |
| `/terms` | Initial HTML covers free educational use, no clinical advice/reference, no accuracy warranty, acceptable use, account deletion and separate licences. Footer link added. | No terms route. |
| `/credits` | Z-Anatomy CC BY-SA attribution, retained upstream component terms, HRA female CC BY 4.0, and OpenStax AP2e CC BY-NC-SA 4.0 with authors and exact “Access for free at openstax.org” link. Geometry and text explicitly remain separately licensed components. | A short model footer was insufficient for the combined source inventory. |
| Homepage and `/about` | Generated initial HTML prose, intended audience, model limits and guest access; homepage primary **Start exploring** link leads to `/learn`. Sign-in is secondary. No JS required to read these pages. | Near-empty SPA shell gave crawlers no marketing content. |
| Route metadata | Unique title and description for `/`, `/learn`, `/quiz`, `/about`, `/privacy`, `/terms`, `/credits`. OG title/description/image/url/type and Twitter large-image card are in initial HTML. Learn/Quiz navigation also updates the document head. | One static app title. |
| Social preview | `public/social-preview.png`, 1200×630, combines the user's actual in-app skull capture with the Forma wordmark. Image output visually inspected. It is an existing app capture, not a fresh browser QA screenshot. | No complete share image/tags. |
| Icons | ICO, 16/32 PNG, 180 Apple touch, 192/512 manifest icons derived from the existing Forma “f” and dot. Manifest and head references resolve. | Incomplete icon set. |
| Crawler files | Seven-route sitemap and robots file generated. Production Pages handlers explicitly return both files; hidden/source-path guards still reject protected paths. | Missing crawler files. |
| 404 | Styled initial HTML with home/lab links. Middleware returns status 404 before or after an erroneous SPA fallback. `404.html` is included for static-host fallback. | Unknown routes could become successful SPA responses. |
| Preview indexing | Private/generated builds have noindex metadata, noindex headers and `Disallow: /`; production non-canonical hosts redirect with noindex. | A preview could inherit public indexing defaults. |

OpenStax licence/attribution requirements were checked on the [official book](https://openstax.org/details/books/anatomy-and-physiology-2e) and [its online text](https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction). The detailed model provenance pages and downloadable adaptations remain available. Text adaptations do not relicense the geometry; independent third-party references retain their own terms.

### Canonical-origin configuration

Set **build-time `SITE_ORIGIN`** to the registered production HTTPS origin, without a trailing slash. Set **runtime `APP_ORIGIN`** to the same value for Cloudflare Pages Functions. `SITE_ORIGIN` can be provided in the build environment or `.env`; `.env.example` keeps an empty placeholder. It contains public metadata, never credentials.

With that custom origin, the sitemap lists its real routes and robots allows crawlers. With an empty or generated origin, this private build intentionally remains non-indexable. The production middleware rewrites canonical and OG URLs using validated runtime configuration and 301-redirects other origins with `X-Robots-Tag: noindex, nofollow`. Do not remove the middleware on branch deployments. For another static host, equivalent host-based redirects/noindex enforcement must be verified before making its custom-origin build public.

The preview PNG is hosted at the same origin; the existing CSP's `img-src 'self'` permits it. No external image host was added. Social crawlers need publicly accessible production pages; the owner-private Site is not a public social-card test endpoint. Static-host clean routes, actual HTTP 404 behavior, cache headers and canonical redirects still need a deployed HTTP check. The production middleware fixture verifies them in-process, not over the deployed network.

## Transfer and rendering performance

Measured from the built files. **MB means 1,000,000 bytes.** HTML/JS/CSS estimates use Node's gzip output; GLB/WASM/PNG use their original compressed asset sizes. Actual transfer depends on host Brotli/gzip, cache state and browser requests. These are byte-budget estimates, not a captured cold-load network trace.

| Asset/load | Size |
| --- | ---: |
| Application JavaScript | 12.509 MB raw; 2.025 MB gzip |
| Application CSS | 0.193 MB raw; 0.034 MB gzip |
| Homepage, CSS, hero and one favicon | 0.183 MB estimated; **0 JS and 0 anatomy models** |
| Default male lab: skeletal + muscular | 17.175 MB estimated, including app and Draco decoder |
| Default female lab: skeletal + urinary + reproductive | 5.001 MB estimated, including app and decoder |
| All eleven male GLBs | 31.569 MB |
| All eleven male GLBs plus app/decoder | 33.833 MB estimated |
| All seven female GLBs | 6.243 MB |
| Additional quiz context GLB | Male 1.577 MB; female 3.181 MB |

### All eleven male systems

| System | Actual bytes | Decimal size |
| --- | ---: | ---: |
| Skeletal | 4,704,096 | 4.704 MB |
| Muscular | 10,206,888 | 10.207 MB |
| Cardiovascular | 5,698,416 | 5.698 MB |
| Respiratory | 851,648 | 0.852 MB |
| Digestive | 1,031,756 | 1.032 MB |
| Nervous | 7,091,864 | 7.092 MB |
| Urinary | 72,832 | 0.073 MB |
| Reproductive | 75,072 | 0.075 MB |
| Endocrine | 75,132 | 0.075 MB |
| Lymphatic | 599,788 | 0.600 MB |
| Integumentary | 1,161,292 | 1.161 MB |

The app still loads Draco GLBs by system. All eleven are **not** requested on first paint. The homepage now avoids the app entirely; opening the male lab requests its existing two default systems. The female lab now opens only three systems instead of all seven. Explicit **Show all** can load everything. Recognition questions request their target system and the additional prebuilt context asset. GLB integrity/Draco decode checks pass for both donors.

Versioned model URLs carry the source SHA suffix. Pages gives those URLs `Cache-Control: public, max-age=31536000, immutable`; unversioned model requests use ten minutes. Static `_headers` also supplies a year for model and hashed app assets. Change model URLs whenever their bytes change; retain older versions if deploying behind a long-lived shared cache. HTML remains uncached in the Pages middleware.

Existing demand rendering, low default pixel ratio, BVH picking, anonymous transient hover and bounded question preparation remain intact. The lab's 12.5 MB parsed JS and 17.2 MB default male transfer are still substantial. **Do not call this mobile-data or mid-range-device ready on the strength of compression alone.** Further splitting the lesson/geometry catalogs and profiling decoder/render memory should be driven by the pending browser traces; no anatomical mesh quality was silently reduced in this pass.

### Lighthouse scores

| Category | Score | Status |
| --- | --- | --- |
| Performance | Not measured | Browser unavailable |
| Accessibility | Not measured | Browser unavailable |
| Best Practices | Not measured | Browser unavailable |
| SEO | Not measured | Browser unavailable |

The Sites skill requires the supervised preview path for browser work. Both preview status and a requested start reported a missing daemon mailbox. Its troubleshooting instructions prohibit starting a substitute preview server/browser, so no Lighthouse numbers were invented or inferred from geometry tests. There is no evidence that all scores are at least 70 yet.

On the production build, use [Chrome DevTools Lighthouse](https://developer.chrome.com/docs/lighthouse/overview), export JSON, and run `npm run check:lighthouse -- home-mobile.json lab-mobile.json quiz-mobile.json`. The script requires all four categories and fails for a score below 70. Audit home, the loaded lab, quiz, and the public legal/about routes; fix any failing score and re-run before launch. Use mobile and desktop profiles, a cold cache, and record tested URL, build, browser, device and throttling. A preview intentionally marked noindex is not the production SEO acceptance target.

## Accessibility measurements

The original palette had 22 identified failing **text** foreground/background pairs. The table measures sRGB WCAG contrast from the declared CSS, including the original orientation-letter opacity. Replacements are 5.52:1 or higher for these pairs, above 4.5:1 body and 3:1 large text. `audit:contrast` reads the source declarations and rejects changed baselines or failing replacements. This is not an exhaustive computed-style or WCAG conformance audit: hover/disabled/focus states, underlying WebGL backgrounds and actual browser composites remain to be checked.

| Text | Original text / background | Before | New text | After |
| --- | --- | ---: | --- | ---: |
| Workspace breadcrumb | #8b9187 / #fcfcfa | 3.15:1 | #526248 | 6.39:1 |
| Sidebar muted labels | #6c7b5f / #f9faf6 | 4.32:1 | #526248 | 6.26:1 |
| Question labels | #697c59 / #f7f9f2 | 4.28:1 | #526248 | 6.18:1 |
| Quiz supporting text | #6b7e59 / #f7f9f2 | 4.16:1 | #526248 | 6.18:1 |
| Text links | #7a9067 / #f7f9f2 | 3.29:1 | #405f36 | 6.8:1 |
| Camera presets | #829586 / #2d3637 | 3.89:1 | #b4c3b6 | 6.74:1 |
| Orientation letters | #829086 / #2d3637 | 2.12:1 | #b4c3b6 | 6.74:1 |
| Incorrect feedback | #967d52 / #f2ece0 | 3.34:1 | #805039 | 5.71:1 |
| Incorrect option | #ac775a / #f4e7de | 3.13:1 | #805039 | 5.55:1 |
| Correct feedback | #607d4b / #e8f1de | 3.99:1 | #365a2b | 6.81:1 |
| Correct option | #567c3c / #e2efda | 4.05:1 | #365a2b | 6.63:1 |
| Quiz option | #70815f / #ffffff | 4.2:1 | #526248 | 6.56:1 |
| Option number | #99a58c / #f2f5ec | 2.35:1 | #526248 | 5.95:1 |
| Hint button | #96a487 / #f7f9f2 | 2.49:1 | #405f36 | 6.8:1 |
| Timer | #8ba075 / #e9efdf | 2.42:1 | #405f36 | 6.15:1 |
| Urgent timer | #b57558 / #f5e6dd | 3.05:1 | #805039 | 5.52:1 |
| Recall label | #879775 / #f7f9f2 | 2.95:1 | #526248 | 6.18:1 |
| Touch guidance | #a0ad95 / #f7f9f2 | 2.22:1 | #526248 | 6.18:1 |
| Clinical supporting note | #697f56 / #eaf0e0 | 3.78:1 | #526248 | 5.64:1 |
| Source links | #77925f / #fafbf7 | 3.33:1 | #405f36 | 6.95:1 |
| Keyboard shortcut | #7e9869 / #eef3e7 | 2.83:1 | #405f36 | 6.4:1 |
| Account error | #f0aaa0 / #fafbf7 | 1.84:1 | #923c32 | 6.93:1 |

Visible 3 px keyboard focus rings now cover buttons, links, fields, tabs, checkboxes, sliders and details/summary, with a light ring inside the dark viewport. The existing Radix focus traps and Learn text-only Structure library remain. Controlled dialogs lacked Radix Trigger elements, so focus return could be lost on close; they now remember the opening button and return focus when it is still visible, falling back to the lab main region when necessary. Browser confirmation of this repair is pending. The WebGL canvas now identifies itself as an image and points screen-reader users to that library; the no-WebGL fallback explains which study path remains available.

Existing Find feedback code contains check/cross symbols, labelled leader lines, a solid correct boundary and dashed wrong boundary, plus separately composited answer colors. The state/render-dispatch tests pass; **their actual visible pixels have not been confirmed here**. Existing browser tests capture correct/wrong reveals and anonymous hover. No color-only conformance claim is made from inspecting JSX or Three materials.

## Mobile and interaction acceptance

The existing sidebar is a bottom sheet. Footer links now reserve their own space above the viewport bottom, and the mobile controls sit above them. Active quiz canvas sizing observes the question panel to keep a separate orbit area. Find camera presets are restored on narrow screens. The default female load is reduced to three systems. The existing touch controller requires first-tap highlight, second-tap commitment; no answer is committed by the first touch.

`tests/browser/prelaunch.spec.ts` adds 375×812 checks for initial HTML, above-fold CTA, horizontal overflow, keyboard sheet controls, focus return, text-library selection, separate canvas/question bounds, preset visibility and hint reveal. Existing Find tests cover emulated two-tap input and no hover names. **These browser tests are authored but not executed in this workspace.** Desktop touch emulation is not a real touch-device test.

Physical-device checks still required: 375 px layout with the keyboard open; orbit/zoom/pan on the model; one/two-tap selection; all ten questions without returning home; wrong/correct simultaneous visibility; slow mobile data, decoder cancellation/retry, memory pressure, and sustained orbit on mid-range hardware. Try the smallest and largest eligible targets, a wrist ligament with local bones, and female pelvic anatomy. Record real device/OS/browser, cold transfer, load duration and tab survival. No actual device was available here.

## Link and regression results

`test:public-pages` checks all seven initial-HTML routes, metadata and expected status, plus a deliberately broken SPA fallback against the production middleware. It crawled **148 internal HTML link/asset references with zero missing files/routes** and validated **2,350 related-structure IDs** against the combined content table. Footer licence/download links and manifest icons resolve. This is a static artifact and handler crawl, not a live browser click-through. Related structures are state actions, not fabricated URLs; the existing UI filters unavailable entries.

`test:find-no-clues` passes ten identical neutral starts, 34,640 target-independent visibility checks, thirty material-state resets, search protection, hint behavior and both reveal bounds. `test:quiz-modes` passes twelve complete ten-question sessions, recovery, layers and shared contextual rendering. `test:female` passes all seven Draco files, 264 source meshes, 275 selectable IDs and forty questions. `test:pages-config` still passes production handler/config/redirect checks. RLS tests pass the new public female IDs, A/B isolation and hard-delete cascade. Build/type checks and the client-secret boundary also pass.

## Before public launch

- [ ] Supply the real canonical domain; build with matching `SITE_ORIGIN` and deploy with matching `APP_ORIGIN`. Verify root/learn/quiz/legal routes, 301 variants, robots, sitemap, image CSP and actual 404 status over HTTPS.
- [ ] Apply the new female public-catalog migration to the dedicated development Supabase project, verify, then production before the full-stack release. Preserve all existing security gates in `SECURITY.md`.
- [ ] Execute browser regression tests, including the 300 ms interactive timing gate, all four ten-question formats and female/male switching. Passing CPU tests alone does not close visual defects.
- [ ] Export Lighthouse reports and achieve at least 70 in all four categories. Capture the actual cold-load network waterfall and report app, decoder, selected systems and quiz context separately.
- [ ] Complete 375 px, real-touch and mid-range hardware checks. Confirm labels/icons/boundary styles are visible and anonymous Find hover does not leak names.
- [ ] Run the browser link/hint/related-structure flows and keyboard/screen-reader checks, then record any remaining failures instead of claiming full conformance.

No added feature requires a paid service plan or a paid model licence. Domain registration/renewal is a separate cost if it is not already covered; no domain was purchased and no provider plan was changed. This pass adds no analytics and no non-essential cookie.


## Viewport controls follow-up

The collapsed sidebar hid the only Female switch. Male/Female buttons now appear directly above the model during exploration, using the same guarded donor-switch action as the sidebar. The free female coverage remains a partial torso atlas, and the viewport states that skin and muscles are not included.

Heading, model switch, arrangement tabs, view context, peeling buttons and selection actions now share a wrapping flow layout. Their positions no longer compete through fixed top offsets. Board filters and cards follow the measured header height; on phones the model starts below the controls. The collapsed-sidebar opener is labelled All controls and opens the mobile sheet on narrow screens. Quiz presentation and donor-switch restrictions remain intact.

Build/type checks and the quiz-mode state/render-dispatch regression pass. `tests/browser/viewport-controls.spec.ts` adds collapsed-sidebar female switching and non-overlap checks at 1896, 1024 and 375 px, plus board header/filter/card separation. These browser checks have not executed here; do not treat this source change as completed visual or touch-device acceptance. The transfer figures above remain the pre-launch baseline before this small control-layout follow-up.
