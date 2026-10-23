# Investigation decisions

The public demo answers a narrow question: “What happened around this alert,
and which records support the answer?”

```text
Alert → bounded event correlation → text classification + explicit evidence
      → severity rule score → cited timeline and findings → analyst report
```

Each case is recomputed from immutable bundled examples. The seed event,
account, shared asset/address, and ±2-hour time limit bound correlation.
The event graph must not use the scenario label to select records. Worker
findings contain only IDs of events returned by correlation; an integrity
check prevents unsupported findings from leaving the engine.

The classifier is a small multinomial Naive Bayes model using 32 manually
curated synthetic sentences. Its score is the relative probability under
that simple model, **not** a calibrated probability of compromise. Explicit
rules determine severity and recommend human review.

Threat intelligence is an offline, manually curated one-entry KEV snapshot.
A catalog match requires an exact CVE listed on an event, then still states
that catalog inclusion is not proof of exploitation. The source is CISA's
public KEV catalog; a full feed refresh is future work.

### Release stages

1. Local and GitHub: syntax checks, event and API tests, documented benchmark.
2. Catalyst development: health, hosted client, two guided cases, report export.
3. Catalyst production: first migration, fresh-browser smoke test, cost guard.

### Extensions with separate evaluation gates

- Authenticated analyst decisions persisted to Catalyst Data Store.
- A CISA KEV snapshot with a recorded import date and license provenance.
- More incident families and independently labeled held-out evaluation cases.
- QuickML natural-language report polish if enabled and within budget.
- Live SIEM ingestion only after permissions, data minimization, isolation,
  access controls, and monitoring are implemented.
