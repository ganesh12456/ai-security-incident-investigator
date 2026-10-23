# SignalDesk · AI Security Incident Investigator

An evidence-first investigation workspace built as an independent, synthetic
portfolio demo. It correlates security events, suggests an alert category with a
small trained text classifier, scores findings with explicit rules, and exports
reports whose claims cite source events.

**Status:** implementation and local checks are complete. GitHub publication,
Catalyst deployment, and live URL verification are separate release gates.

## Demo workflow

1. Open the alert queue and select one of five fictional alerts.
2. Run the bounded investigation.
3. Review a UTC timeline, linked evidence, severity, and limitations.
4. Select an event ID to inspect the original sample record.
5. Export a plain-text report. All actions recommended in the report require
   a human reviewer; the app takes no containment action.

The five cases cover a potential account takeover with export, an approved
device change, broad OAuth consent, scheduled build activity, and a flagged
mail message with a CVE indicator. The last case does not claim exploitation.

## Run locally

Requirements: Node.js 20 or newer. No paid API keys or npm dependencies.

```sh
npm start
```

Visit `http://localhost:9000`. To verify logic:

```sh
npm run check
npm run benchmark
```

The benchmark creates 10,000 **distinct synthetic alert IDs** from five
scenario templates. It measures in-process computation on small case-specific
event sets. It does not measure realistic SOC data volume, backend deployment
latency, or a real organization's alert workload. Do not use its throughput
number as a customer performance claim.

## Architecture

- `client/`: zero-dependency responsive web app for Catalyst Web Client
  Hosting.
- `functions/investigator/`: dependency-free Node.js Advanced I/O function
  with case-scoped engine and bundled fixture data.
- `functions/investigator/model.js`: Laplace-smoothed multinomial Naive
  Bayes classifier trained on curated synthetic descriptions.
- `functions/investigator/engine.js`: event correlation within ±2 hours,
  evidence rules, severity score, and report integrity validation.
- `functions/investigator/fixtures/kev-snapshot.json`: one curated CISA KEV
  entry, sourced from the official catalog; it is not a full or live feed.

The current public demo is read-only and stateless. The bundled fixtures are
the source of truth. Catalyst Data Store integration for saved analyst reviews
is **not implemented**; do not describe it as implemented.

## API

| Route | Method | Result |
| --- | --- | --- |
| `/api/health` | GET | Health and dataset type |
| `/api/alerts` | GET | Synthetic alerts |
| `/api/alerts/:id` | GET | Alert details |
| `/api/investigations` | POST | Run by `{ "alertId": "ALT-1001" }` |
| `/api/investigations/:id` | GET | Recompute a deterministic case |
| `/api/investigations/:id/report` | GET | Download cited report |

When deployed, prepend `/server/investigator` to these routes. The local
Node server also serves the static client for development.

## Deploy on Zoho Catalyst

1. Create a project in your Catalyst India organization. Check the monthly
   account-wide Basic allowance before enabling production.
2. Link this repository to the new Catalyst project. The root
   `catalyst.json`, the function's `catalyst-config.json`, and
   `client/client-package.json` are included for CLI/Pipelines deployment.
3. Deploy the client and the `investigator` Advanced I/O function to the
   development environment. The function bundles all fixtures within its own
   directory; no outside files or runtime downloads are required.
4. Verify `/server/investigator/api/health`, then open the web client and
   investigate `ALT-1001` and `ALT-1002`.
5. Review costs and perform the first migration to production from the
   Catalyst console, then repeat the URL and report checks. Catalyst requires
   a configured payment method for its first production migration.

The CLI may require the project to be initialized or selected on first use.
If Catalyst adjusts the generated project or function metadata, sync the
canonical `catalyst.json` files back to this repository.

## Security and accuracy

- Data is fictional; IPs use documentation ranges and addresses use
  `.example` domains.
- No user-provided URLs, uploads, or external execution are accepted.
- The exported report distinguishes observed actions from unknown intent.
- A report finding fails if it references an absent source event.
- Severity is a transparent rule score, and model output is an uncalibrated
  category suggestion. Neither is a professional SOC decision.
- Production customer telemetry, live threat enrichment, authentication for
  analyst writes, and audit-ready persistence are outside this public demo.

## Provenance

This repository must contain only independently authored code and fictional
data. An employer's code, data, branding, and measured operational claims
must not be added without authorization. Tests in this repository do not
establish a reduction in an employer's manual investigation time.
