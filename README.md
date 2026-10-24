# SignalDesk · Security Incident Investigator

SignalDesk imports security records you are authorized to inspect, correlates
related activity, suggests a category with a small local text classifier, and
produces source-linked findings, a UTC timeline, and a report. The deployed
Slate app starts with **zero records**. No sample alerts or customer data are
bundled.

**App:** https://ai-security-incident-zvtkamcv.onslate.in/

## End-to-end workflow

1. Export security records from your identity, endpoint, or audit system.
2. Upload a CSV, JSON, NDJSON, or JSONL file (at most 5 MB or 2,000 records).
3. Inspect accepted and rejected rows. Any accepted record can be the seed.
4. Run the investigation. Review evidence links and original source rows.
5. Export the text report. Clear the local records when done.

The app runs entirely on the visitor's device in Catalyst Slate. IndexedDB
persists the imported records in that browser only; if browser storage is
unavailable, the workspace runs for the current tab session. Replacing a file
replaces the workspace. No records are sent to a server by the Slate app.
Use a device and browser profile approved for the sensitivity of the logs.

### Input requirements

Each record needs a timezone-aware timestamp (ISO 8601 with `Z` or an offset,
or a Unix seconds/milliseconds value), an identity, asset, or IP address, and
a message or action. Recognized fields include:

| Meaning | Common fields |
| --- | --- |
| Time | `@timestamp`, `timestamp`, `time`, `event.created`, `TimeGenerated` |
| Identity | `user.name`, `user.email`, `actor`, `principal`, `username` |
| Asset | `host.name`, `asset`, `device.name`, `resource.name` |
| Address | `source.ip`, `src_ip`, `client.ip`, `ip` |
| Action | `event.action`, `action`, `operation`, `activity` |
| Description | `message`, `summary`, `description`, `details` |

JSON may be an array or an object with an `events` array. An
Elasticsearch-style `hits.hits[]._source` response is also recognized. CSV
headers can use the dot field names in the table. Each accepted row receives
an internal `ROW-00001` style reference; a supplied original ID remains visible
in the evidence panel. Invalid rows are counted and explained.

## How findings work

- Correlation considers at most two hours around the selected record and
  matches the identity, or the asset together with its address. At most 250
  related records are shown, including the seed.
- Rules detect recorded sequences such as failed then successful sign-in,
  privilege changes, export then download, OAuth consent, token use followed
  by file access, and endpoint detections. Every finding cites imported rows.
- A small Naive Bayes classifier trained on generic category phrases suggests
  a label. Its score is **uncalibrated** and is not a probability of compromise.
- CVE mentions in imported text are just mentions; there is no live threat
  intelligence lookup. No response action runs automatically.

These are investigative aids, not a validated security detection product.
Absence of a finding does not establish safety. An analyst must verify source
records, approvals, and the surrounding logs before acting.

## Run and verify

Node.js 20 or newer; no paid AI API and no npm dependencies:

```sh
npm run build
npm start
```

Open `http://localhost:9000`. To check parser, engine, API, and Slate bundle:

```sh
npm run check
```

## Catalyst deployment

The `main` branch builds a static Slate application using `npm run build`
and output path `dist`. In the Catalyst **SignalDesk** Slate deployment,
click **Sync Now** after changes (Auto Deploy is currently off).
The optional `functions/investigator` Advanced I/O function exposes a
stateless `POST /api/investigations` endpoint that requires records with each
request. It is **not deployed by Slate** and has no persistent queue.
See [deployment details](docs/deployment.md) and
[architecture and limitations](docs/architecture.md).

Only independently authored code is included. This repository is a personal
project; it does not establish employer use, SOC performance gains, or a
measured reduction in investigation time.
