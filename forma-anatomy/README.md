# Forma — Anatomy for nursing

An interactive human anatomy lab built with React, Vite, TypeScript, React Three Fiber, Drei, Tailwind CSS, Radix/Shadcn controls, and Zustand.

## Run locally

- Install dependencies with `npm install`.
- Start with `npm run dev`. The homepage is at `/`, the anatomy lab at `/learn`, and practice at `/quiz`.
- Build with `npm run build`.
- Verify source provenance, compressed model mappings, anatomical orientation, and quiz state transitions with `npm test`.
- Verify study-board pagination, hover restoration, lazy systems, and accelerated picking with `npm run test:board`. The reported CPU raycast timing is a small test sample, not a browser frame-rate claim.

## Anatomy assets and content

Forma uses the existing **Z-Anatomy male atlas**, distributed as FBX by [LluisV/Z-Anatomy](https://github.com/LluisV/Z-Anatomy/tree/6c7f9016bd5899ac8edafd31b9900c151df42ed6/Resources/Models/FBX). The original anatomical geometry is converted and compressed for the browser. Established, licensed anatomy assets should be preferred for future additions; do not replace them with generated placeholder anatomy.

The atlas is split into 11 independently lazy-loaded Draco-compressed GLBs in `public/models/z-anatomy/`. The Draco decoder is local in `public/draco/`. `src/data/model-info.json` records the pinned source revision, original Git blob checksums, output SHA-256 checksums, conversion details, and current structure counts. Source mesh names and `partId` are retained in each glTF node's extras. Core study IDs are stable, preserving existing bookmarks and learning progress.

`src/data/anatomy.json` is keyed by the app's logical mesh identifier. Each entry includes the requested anatomy content fields, position, bounds, layer, model availability, recall aliases, original source mesh names, and quiz eligibility. Core structures have nursing lessons and questions. All available source structures and study groups participate in identification, click, and recall quizzes and mastery calculations. Function matching remains restricted to core groups with learning notes. Individual source components of core groups have stable detail IDs and link back to their group notes. Detailed nursing notes are not claimed for every individual atlas structure. Edit instructional content directly in this JSON file.

The Z-Anatomy source contains **male anatomy only** and no separate subcutaneous fat layer. A separate free **Human Reference Atlas female** option is now available; see coverage below. Legacy placeholder IDs remain unavailable and are never relabelled as female anatomy. Nursing markers are aligned to source surfaces but remain approximate educational landmarks, not instructions for performing procedures.

## Reproduce the asset conversion

The converted GLBs are committed and ready to serve; rebuilding them is not needed to run the app. To reproduce the import from approximately 222 MiB of upstream FBXs:

1. Run `npm run models:fetch` to download the pinned files into ignored `work/z-anatomy/` and verify their Git blob checksums. Existing files are reused only after verification.
2. Run `npm run models` to convert real FBX meshes, map core structures, retain additional structures, assign display colors, normalize scale uniformly, and Draco-compress the output. The importer removes non-anatomical source annotations and uses constrained mesh simplification. Joints, ligaments, fascia, and covering membranes are retained. It does not generate anatomy.
3. Run `npm run models:landmarks` to align nursing study markers to the imported source anatomy.
4. Run `npm test` and `npm run build`.

Core instructional text is retained on reimport. Additional atlas entries and geometric metadata are regenerated from the pinned assets. The content seed script is historical; rerunning it resets the edited atlas content.

## Licenses and credits

Attribution and complete upstream notices are included in `public/credits/`, linked from the viewport and Help. The atlas is distributed under CC BY-SA 4.0 with component-specific terms retained from the upstream model notice, including noncommercial terms for certain contributed assets. Refer to these notices before redistributing or reusing the models. The app does not claim endorsement by Z-Anatomy or its contributors. Adapted GLB files and provenance are downloadable from the credits page.

## Features

- Selection pops a structure out into an independent 360° inspection view, with orbit/pinch controls, auto-rotation, and a return action. Disable Pop out on selection to keep selections in place. Body and Study board tabs switch between anatomical assembly and a flat grid. Category tabs, region filters, search, and pages of 6–12 cards organize the atlas. Each card uses original 3D geometry resized to fit; select it for full 360° inspection. Returning preserves the chosen category and page. Translations preserve the original shapes; quizzes and nursing markers use anatomical positions.
- Independent system visibility, depth peeling where source layers are available, active-system opacity, per-part hide/isolate/X-ray, search-to-frame, optional auto focus, labels and leader lines, hover tooltips, outline selection, smooth fading, and five camera views.
- Nursing content, related structures, bookmarks, and overlays for IM sites, peripheral pulses, heart/lung listening regions, and common peripheral IV regions.
- Four quiz formats: model click, four-choice identification, fuzzy free recall, and structure-to-function matching. Filter available atlas structures by system/region (function questions use core groups), choose 5/10/20/50 questions (capped at available structures), and optionally time each question.
- Immediate feedback, final score, missed-only retry, per-structure accuracy, mastery, weakest systems, daily streak, and review scheduling. Guest practice lasts for the visit; configured Google accounts save server-verified study data. Wrong answers are due immediately; consecutive correct answers return after 1, 3, 7, 14, and 30 days.
- Mobile bottom sheet, touch rotate/pinch/pan, keyboard shortcuts, a text-only structure list in Learn, and WebGL fallback. Find deliberately disables named answer lists and search while unanswered. Nonvisual learners can study the text library; visual identification requires WebGL. See `PRELAUNCH.md` for the browser/device checks still outstanding.

Muscles are visible on opening. Quick views reveal muscles, internal organs, skeleton, or all systems. The fascia/membranes toggle hides covering tissues without deleting them. There are 3,156 source meshes and 3,189 selectable structures/groups in this pinned import; this does not imply every anatomical structure or variation is represented.

Keyboard: Escape returns from inspection; R reset; L labels; 1–4 multiple-choice answer; Space next question after feedback. Shortcuts pause in fields and dialogs.

Public exploration and guest practice work without signing in. The full-stack Cloudflare Pages deployment supports optional Google accounts through Supabase, server-verified progress and bookmarks; see `SECURITY.md` for setup. The private static Site does not run those Pages Functions and does not claim working account sync. Device display preferences remain local. No patient information is accepted.

## Rendering performance

Rendering uses demand frames: idle scenes stop drawing, while camera motion, damping, fades, and auto-rotation explicitly request frames. Static meshes have frozen local matrices. Only meshes still fading or moving remain in the animation queue. Hidden systems leave the scene after their fade. Inspection renders the selected system. Recognition, Recall and Function load the target system plus prebuilt context; Find loads the learner's visible systems without revealing the target. The study board uses one system and at most 12 previews. The new static homepage loads no app JavaScript or anatomy models. The separate reproductive reference view loads only its three available systems: pelvic skeleton, urinary bladder and reproductive organs.

Pointer hover lives in a separate transient Zustand store, so it does not refresh app panels or write browser storage. Only previous/new hovered materials are recolored light blue, then restored exactly. Shared geometry has cached BVH acceleration; hidden and low-opacity meshes exit before raycasting. Opaque materials use the opaque render pass, and translucent materials use a single pass. Smooth mode defaults to a pixel ratio of 1; Sharper allows up to 1.75. Anatomical geometry, original models, and teaching content are not reduced for these optimizations.

## Female reproductive reference organs (NIH 3D)

Choose **Female reproductive anatomy** above the viewport or in the system list. **Whole-body anatomy** returns to the default male Z-Anatomy donor. This is a separate reference-organ scene, not a whole female body. Available: uterus and cervix, both ovaries and uterine tubes, urinary bladder, sacrum, coccyx and pelvic bones. Vagina, complete urethra, external genitalia and pelvic floor muscles are not included. The UI states the gaps explicitly.

Seven official NIH 3D HRA / Visible Human Female entries were individually checked: each carries CC BY 4.0, with its own creator attribution, source ID, version, URL and checksum. Their 40 meshes and four groups replace the previous 264-mesh Anatria intermediate subset. That earlier importer did not deform male anatomy, but had not verified each NIH page. See [complete audit](docs/female-audit/V12-FEMALE-AUDIT.md) and [current import/quality report](docs/NIH-HRA-IMPORT.md).

`src/data/nih-hra-lessons.json` is the editable OpenStax lesson input; `female-anatomy.json` is the compiled catalogue. Geometry source/licence and text source/licence remain separate per entry. One questionable source annotation has no invented lesson and is excluded from quizzes. Source records: `nih-hra-sources.json`; downloadable individual attribution and quality details: `/credits/hra-female.html`.

`npm run models:female` retrieves pinned, checksum-verified official NIH files, converts with one shared uniform transform, Draco-compresses them, rebuilds static quiz/context measurements and emits quality reports. It performs no anatomical deformation or hole filling. Runtime files total 708,732 bytes across three lazy system bundles, plus 222,664 bytes of optional quiz context. The default male view requests none of these GLBs.

`npm run test:female` exercises all decoded meshes, raycasting, donor isolation, layers, server quiz filtering, four ten-question sessions and warm setup timing. Browser regressions in `tests/browser/female.spec.ts` and `viewport-controls.spec.ts` remain unexecuted here because the supported preview daemon is unavailable. Open surfaces remain and are reported; successful sampled rays do not prove watertightness.

Apply all migrations through `20260907083540_nih_hra_provenance.sql` to the dedicated development Supabase project, verify there, then production. It adds per-row geometry/text `source` and `license` JSONB plus availability to the existing public catalogue. Retired IDs remain for saved-data history. Public RLS and server-only scoring are unchanged. No hosted project was modified during this pass.

## Public pages and launch checks

`/`, `/about`, `/privacy`, `/terms` and `/credits` are generated as readable HTML with no app script. `/learn` and `/quiz` retain the existing SPA with distinct initial metadata, and mode changes update the URL and head tags. Every page links the separately licensed geometry and OpenStax text credits. `/404.html` plus the Pages middleware provide styled HTTP 404 responses rather than indexing the SPA fallback.

Set `SITE_ORIGIN` in the build environment (or local `.env`) to the exact production HTTPS origin, without a trailing slash. On the full-stack host, `APP_ORIGIN` must match it. Leave `SITE_ORIGIN` empty for this private preview: metadata and crawler files deliberately prevent indexing. Production Pages middleware redirects non-canonical hosts with `X-Robots-Tag: noindex, nofollow`, rewrites canonical metadata using verified configuration, and serves `robots.txt` and `sitemap.xml` explicitly. Follow the existing domain and OAuth checklist in `SECURITY.md`; no production domain is invented here.

Run `npm run build`, `npm run test:public-pages`, `npm run audit:contrast` and `npm run audit:bundle`. Run `npm run test:quiz-browser` locally for the authored desktop/mobile browser regressions. For a production Lighthouse audit, export actual Chrome DevTools JSON reports and pass them to `npm run check:lighthouse -- <report.json>`; missing scores or any score below 70 fail the gate. Do not treat CPU tests as Lighthouse or real-device results.

`PRELAUNCH.md` contains the measured before/after contrast ratios, model and application sizes, link-check scope, remaining browser/mobile checks and launch configuration. Recreate the existing preview and wordmark icons with `python scripts/create-web-assets.py` (Pillow required); the actual in-app source capture and outputs are committed, so this is unnecessary for normal builds. No analytics, cookie banner, paid model or additional third-party service was added.
