# Launch checklist

Remaining steps before a public release. Security and account setup are covered in [`SECURITY.md`](../SECURITY.md).

- [ ] Set the canonical domain: build with a matching `SITE_ORIGIN` and deploy with a matching `APP_ORIGIN`. Check the root, `/learn`, `/quiz` and legal routes, 301 redirects, `robots.txt`, `sitemap.xml`, image CSP and 404 status over HTTPS.
- [ ] Apply the Supabase migrations to the development project, verify them, then apply to production.
- [ ] Run the browser regression tests (`npm run test:quiz-browser`), including all four quiz formats and male/female switching.
- [ ] Export Lighthouse reports and reach at least 70 in all four categories (`npm run check:lighthouse -- <report.json>`).
- [ ] Test on a 375 px screen, a real touch device and mid-range hardware.
- [ ] Walk through links, hints, related structures, keyboard navigation and a screen reader.

Measurement snapshots from earlier checks are kept in [`verification/`](verification/).
