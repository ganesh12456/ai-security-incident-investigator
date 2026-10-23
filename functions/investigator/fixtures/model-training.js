'use strict';

// Curated examples are separate from the held-out demo alerts. The model is
// intentionally small; evaluation documents its limits on synthetic data.
module.exports = [
  ['credential_access','password spraying failed login followed by successful unfamiliar session'],
  ['credential_access','multiple account lockouts then a new device signed in'],
  ['credential_access','unusual sign in new browser after rejected passwords'],
  ['credential_access','compromised identity login failure burst then token issued'],
  ['credential_access','suspicious login from unknown address followed by privilege change'],
  ['credential_access','account takeover sign in and admin role granted'],
  ['credential_access','brute force login attempts followed by account access'],
  ['credential_access','new session after repeated authentication failures'],
  ['data_access','large data export downloaded from finance workspace'],
  ['data_access','sensitive files read in bulk by newly privileged account'],
  ['data_access','unusual document export created and downloaded'],
  ['data_access','bulk download from financial record workspace'],
  ['data_access','database extraction following privilege elevation'],
  ['data_access','many documents read in short time window'],
  ['data_access','export role granted and dataset downloaded'],
  ['data_access','large volume records copied by employee'],
  ['oauth_abuse','third party application requested broad mail read scope'],
  ['oauth_abuse','unknown OAuth app consent followed by token use'],
  ['oauth_abuse','new integration granted files read and mail access'],
  ['oauth_abuse','suspicious application authorization with expansive scopes'],
  ['oauth_abuse','OAuth grant generated token used from second address'],
  ['oauth_abuse','unreviewed third party app requests sensitive permissions'],
  ['oauth_abuse','application token accessed files without review'],
  ['oauth_abuse','broad consent grant to new application'],
  ['benign','approved device enrollment with MFA completed'],
  ['benign','routine browser sign in confirmed by service desk ticket'],
  ['benign','scheduled build command matches approved change record'],
  ['benign','expected maintenance operation during scheduled window'],
  ['benign','known device signed in with successful MFA'],
  ['benign','authorized laptop replacement and first login'],
  ['benign','approved service account activity from CI job'],
  ['benign','normal user session with no additional risk activity']
];
