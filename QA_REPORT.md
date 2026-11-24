# Surakshit Gujarat V18 — QA Report

Date: 31 October 2026

## Scope
Inspected the delivered connected-frontend package and its 12 canonical page documents.

## Results

| Check | Result | Notes |
|---|---|---|
| Canonical page files | PASS | All 12 expected HTML documents are present. |
| Internal href mapping | PASS (static audit) | No unmapped root-relative internal href targets were found in the 12 documents. |
| HTML parsing | PASS | All 12 documents were parsed successfully with an HTML parser. |
| HTTP route serving | NOT VERIFIED | The simple static server used for the check does not implement Vite's public-directory mapping or clean-route fallback. |
| Vite production build | FAIL / BLOCKED | `npm run build` failed because `vite` was not installed (`sh: vite: not found`). `npm install --no-audit --no-fund` timed out in this environment. |
| Browser rendering/screenshots | NOT COMPLETED | Headless Chromium navigation was blocked by the execution environment (`ERR_BLOCKED_BY_ADMINISTRATOR` / browser process timeout). |
| Responsive visual QA | NOT COMPLETED | No trustworthy rendered desktop/mobile screenshots could be captured. |
| Page interaction QA | NOT COMPLETED | Static parsing cannot prove buttons/forms work. |
| Safety-content audit | FAIL | Disallowed unsupported affiliation/identity/alert wording remains in multiple page files. |

## Safety wording found

The following terms were found in the delivered HTML:

- `/`: `Instant 1930 Alert`
- `/app`: `Gujarat State Police`, `MHA Cyber Crime Coordination Unit`, `Golden Hour`
- `/emergency`: `Gujarat State Police`, `MHA Cyber Crime Coordination Unit`, `Cyber Crime Investigation Cell, Gujarat State`, `Dhruvi Patel`, `ધ્રુવી પટેલ`, `Golden Hour`, `Live Support Active`
- `/app/check/image`: `Gujarat State Police`, `MHA Cyber Crime Coordination Unit`, `Dhruvi Patel`, `ધ્રુવી પટેલ`, `Instant 1930 Alert`
- `/app/profile`: `Dhruvi Patel`
- `/login`: `Gujarat State Police`, `MHA Cyber Crime Coordination Unit`

These are content-audit findings, not proof that every occurrence is visible in the UI; some may be embedded in metadata or scripts. They still need review and correction.

## Important limitation

`screenshots/V18-reference-contact-sheet.png` is a contact sheet made from the original Stitch reference screenshots retained in `references/v18/`. It is **not** a screenshot of the running connected frontend. No runtime screenshot is claimed because the browser renderer could not be launched successfully here.

## Recommendation

Do not treat this package as production-ready yet. First resolve dependency installation/build, verify clean-route serving in Vite, run the app in a normal browser, capture all 12 desktop/mobile page renders, test every visible control, and correct the safety wording without changing the approved designs.
