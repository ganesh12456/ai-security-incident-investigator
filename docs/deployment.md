# Deploy to the dedicated Catalyst project

This repository targets Catalyst organization `60077364156`, India data center,
project `AI-incident-investigator` (`54566000000077001`). The deployment
workflow runs only when started manually and deploys only to **Development**.

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
