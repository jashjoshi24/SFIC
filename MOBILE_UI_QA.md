# Mobile frontend review

Reviewed locally on the `priyanshu` branch on 26 November 2026. These changes affect frontend presentation and navigation only.

## Fixes

- Shared citizen and admin overview header: a compact 72px single-row mobile bar with menu, brand, notifications, and profile. Language, theme, and labeled account actions live inside the drawer on mobile and return to their desktop positions when the viewport grows.
- Mobile and tablet navigation: viewport-height drawers, scrollable links, an accessible close button, and no handle covering page content. Opening navigation closes notifications, locks background scrolling, and traps keyboard focus; Escape restores focus to the menu button.
- Admin workspace: backdrop dismissal, Escape dismissal, hidden drawers removed from keyboard navigation, and background content disabled while the drawer is open.
- Forms and actions: readable input sizes, larger touch targets, wrapping controls, and constrained grid children.
- Scanner and assistant: emergency action no longer floats over uploads; the assistant composer is pinned to the bottom on mobile with its measured height reserved below the conversation; decorative overflow is clipped. The composer responds to viewport changes and keeps long results scrollable.
- Login and support: wrapping headers and language/theme controls on narrow screens.
- Icon fonts: fixed icon space prevents text fallback from pushing controls outside the viewport while fonts load.
- Image-scan results: OCR text has readable preserved line breaks and a copy button; structured risk findings show titles, explanations, and brand/domain evidence; safety guidance uses numbered actions, precautions, and reference links. Copied reports use the same readable output, and the emergency action no longer covers result text.

## Page coverage

| Page | Route |
| --- | --- |
| Landing | `/` |
| Citizen login | `/login/index.html` |
| Registration | `/login/index.html?mode=register` |
| Dashboard | `/app/index.html` |
| AI assistant | `/app/assistant/index.html` |
| Message/call checker | `/app/check/message/index.html` |
| URL checker | `/app/check/url/index.html` |
| Image/QR scanner | `/app/check/image/index.html` |
| Complaint generator | `/app/complaint/index.html` |
| Complaint alias | `/complaint/index.html` |
| Profile/settings | `/app/profile/index.html` |
| Awareness library | `/awareness/index.html` |
| Awareness article | `/awareness/article/index.html` |
| Emergency | `/emergency/index.html` |
| Support/preferences | `/support/index.html` |
| Admin login | `/admin/login.html` |
| Admin overview | `/admin/index.html` |
| Scan history | `/admin/scans.html` |
| Complaint desk | `/admin/complaints.html` |
| Citizens | `/admin/citizens.html` |
| Reports | `/admin/reports.html` |
| Awareness administration | `/admin/awareness.html` |
| Email/support administration | `/admin/emails.html` |

## Verification

- Chromium viewport checks at 320, 390, 641, 768, 1024, and 1440 pixels, including page overflow and header geometry.
- A second narrow-screen pass with Hindi, light theme, and the app's largest text preference.
- Screenshot review of citizen tools, login, awareness content, admin pages, the mobile drawer, and notifications.
- Interactive checks of language selection, theme switching, notification opening/closing, citizen/admin drawers, Escape dismissal, scan detail dialogs, and long complaint details.
- `npm run build`: passed. Vite reports a large bundle warning for the existing 3D landing scene.
- `npm run test:translations`: all six tests passed.
- JavaScript syntax and `git diff --check`: passed.
- Navbar follow-up: 96 header checks across 12 shared-shell routes at 320, 390, 641, 768, 812 (landscape), 1024, 1100, and 1440 pixels passed. No control overlaps or offscreen controls were found. Focus trapping, notification dismissal, scroll locking, and restoration of desktop controls also passed.
- Image-result follow-up: five formatter tests pass (`npm run test:image-results`), including structured response shapes, safe escaping, safe reference links, and localized section labels. Browser checks at 320, 390, 768, 1154, and 1440 pixels passed in Gujarati, Hindi, and English, including light/dark themes, OCR copying, readable report copying, and unchanged OCR text.

API responses were mocked for frontend review, including account identity, histories, awareness content, and sample admin data. This review does not validate backend operations or live data. The hosted site has not been deployed or changed.
