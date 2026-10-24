# Deploy SignalDesk on Zoho Catalyst

Project: `AI-incident-investigator` (`54566000000077001`) in organization
`60077364156`. The website is deployed through **Catalyst Slate** from
`ganesh12456/ai-security-incident-investigator`.

## Update the live app

1. Push changes to `main`, wait for the GitHub Verify workflow.
2. In Catalyst, open **Slate → SignalDesk** and click **Sync Now**. Auto Deploy
   is currently disabled.
3. The build settings are root `./`, Node.js 22, `npm install`,
   `npm run build`, output `dist`.
4. Wait for build **Success**, then open
   https://ai-security-incident-zvtkamcv.onslate.in/ .
5. The first screen should have zero imported records. Upload an authorized
   log export, run a case, inspect source rows, download a report, and clear
   local records. Do not use unapproved production telemetry for a test.

Slate runs the investigation in the browser. It does not need a CLI token,
paid AI API, Data Store table, or deployed function for the file-to-report
workflow. The application uses the existing Catalyst plan; monitor that plan's
usage and billing separately. The site is public, but data loaded into its
local workspace is not published to other visitors.

## Optional stateless Advanced I/O API

The `functions/investigator` source can be uploaded as a separate Node.js 20
Advanced I/O function named `investigator` using Catalyst
**Serverless → Functions → Create Function → File Upload**. Archive the
*contents* of that directory so `catalyst-config.json` is at the ZIP root.
The function accepts records with each request and stores none. Uploading
it does not convert Slate's local workspace into a shared backend.

The existing Slate Git deployment is the supported website path. A direct
deployment of the `client/` folder without the Slate build will miss the
browser engine. Do not upload old ZIP bundles from earlier revisions: they
contain the former sample application.
