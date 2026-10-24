# Deploy to the dedicated Catalyst project

This repository targets Catalyst organization `60077364156`, India data center,
project `AI-incident-investigator` (`54566000000077001`). The deployment
workflow runs only when started manually and deploys only to **Development**.

## Deploy this repository with Catalyst Slate from GitHub

The **Slate** Git deployment builds a static website. To fix its default
`npm run build` step, the repository includes a dependency-free build script.
The output bundles the same investigation engine and fictional examples for
execution in the visitor's browser, so all five sample cases and report
exports work without a separate API. It does **not** deploy a Catalyst
Advanced I/O function or connect to production security data.

In the existing Slate deployment, select **Sync Now** (or enable Auto Deploy)
after the fix is pushed to `main`. Under **Show Advanced Options**, set:

| Setting | Value |
| --- | --- |
| Repository | `ganesh12456/ai-security-incident-investigator` |
| Root path | `/` |
| Node runtime | `22` |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output path | `dist` |

The Slate URL is
`https://ai-security-incident-zvtkamcv.onslate.in/`. Open it and investigate `ALT-1001`; the
evidence-linked report should download as text. The endpoint
`/server/investigator/api/health` applies to the **separate Catalyst Functions
deployment** on your project domain, not to the Slate URL. For a server-backed
deployment, use the function and web client steps below in the project console.

## Use the Catalyst website without a CLI token

Open the `AI-incident-investigator` project in the [Catalyst console](https://console.catalyst.zoho.com/).
The direct upload method works even when the older GitHub integration is not
available on your account.

1. Upload the **function ZIP**: **Serverless** → **FAAS** → **Functions** →
   **Create Function**. Select **Advanced I/O**, name it exactly `investigator`,
   select **Node.js 20**, choose **File Upload**, and upload the ZIP containing
   the contents of `functions/investigator/` at the ZIP root. In particular,
   `catalyst-config.json`, `index.js`, and `package.json` must be at the root.
2. Upload the **web client ZIP**: **Cloud Scale** → **Host & Manage** →
   **Web Client Hosting** → **Upload**. The ZIP must contain the contents of
   `client/` at its root, including `client-package.json` and `index.html`.
3. Open the development web app URL shown in **Web Client Hosting**. Check
   `/server/investigator/api/health` on the same domain, then investigate
   `ALT-1001` in the UI. This demo uses fictional alerts only.

If the console offers **Catalyst DevOps** → **Repositories** → **Git**, you
can instead integrate the `ganesh12456` GitHub account, choose
`ganesh12456/ai-security-incident-investigator`, and deploy from the website.
Catalyst limits this older integration to accounts active before July 2024 or
accounts that already integrated GitHub. If it is absent, use the ZIP uploads.

To create the ZIPs from this repository, archive the *contents* of each source
folder separately, with no enclosing `investigator/` or `client/` directory.
The project root ZIP from GitHub cannot be uploaded to either component as is.

## Optional GitHub Actions deployment with a CLI token

## One-time credential setup

Generate a Catalyst CLI token on your own computer. Do not paste it into a
chat, commit it, or put it in a file in this repository.

1. Install Node.js 20 or newer and run `npm install --global zcatalyst-cli`.
2. Run `catalyst login --dc in` and finish the Zoho sign-in.
3. Run `catalyst token:generate` and complete the device verification shown
   by the CLI. Copy the resulting token privately.
4. Open this repository on GitHub → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**. Name it `CATALYST_TOKEN` and paste
   the token as its value.

## Run and verify

1. Open **Actions** → **Deploy to Catalyst development** → **Run workflow**
   on `main`.
2. Wait for the job to pass. The job checks the application, installs the
   Catalyst CLI, deploys the client and `investigator` function, then checks
   the API health endpoint.
3. Open the development host:
   `https://ai-incident-investigator-60077364156.development.catalystserverless.in/`
   and investigate alerts `ALT-1001` and `ALT-1002`. Download a report and
   confirm that its finding IDs match the displayed evidence.

If deployment fails, copy the **error text without the token** from the
workflow run for diagnosis. The project domain alone does not establish that
the app has been deployed. The Catalyst CLI targets Development; a separate
production migration and cost review are required for a production URL.

The `CATALYST_TOKEN` secret belongs only in GitHub Actions. Rotate or revoke
it from your Catalyst CLI when it is no longer needed.
