# Architecture and limits

## Deployed Slate flow

The static `dist/` build includes the browser UI, input normalization,
classifier, and evidence engine. The upload uses `File.text()` and is processed
in memory. After validation, records are kept in the current browser's
IndexedDB. No external endpoint receives the imported bytes from the Slate
app. The site starts empty on a new browser profile.

Select a record → correlate by identity or asset plus address within ±2 hours
→ classify text → apply explicit evidence rules → verify finding references
→ render timeline and source rows → download a text report.

## Optional Catalyst function

`functions/investigator/index.js` exposes:

- `GET /api/health`: reports stateless mode.
- `POST /api/investigations`: accepts `{"seedId":"ROW-00001","records":[...]}`,
  normalizes submitted records, and returns an investigation. It does not
  store records or run automatically.

The function is separate from the Slate deployment. The public Slate URL
does not implement `/server/investigator`. Do not assume a successful Slate
build means the optional function is deployed.

## Boundaries

- 5 MB and 2,000 source records per import; 250 correlated records per case.
- CSV, JSON, NDJSON and JSONL imports with several common field names. Other
  source schemas may require a mapping before use.
- No ingestion of live SIEM streams, cloud authentication, shared cases,
  server-side storage, evidence signing, live threat feeds, or automatic
  containment. IndexedDB is tied to one browser profile and can be cleared
  by the browser.
- Timezone is required to avoid silently shifting event order. Rejected rows
  are reported, not treated as evidence.
- The classifier uses a tiny local training corpus. Its output and heuristic
  severity must be reviewed and are not validated for operational alerts.
- An imported record may contain sensitive data. Limit access to the device,
  clear local records when appropriate, and protect downloaded reports.
