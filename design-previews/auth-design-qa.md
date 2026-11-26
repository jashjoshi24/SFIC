# Citizen authentication redesign

Scope: `/login/index.html?mode=login` and `?mode=register` only. Other application pages and shared style/script files were not changed in this implementation pass.

## Visual evidence

- Selected sign-in mock: `design-previews/login-reference.png`.
- Selected registration mock: `design-previews/register-reference.png`.
- Implementation: the corresponding localhost routes, inspected in the in-app browser. Desktop comparison used a verified 1440 × 1024 CSS viewport. The browser was at 75% zoom during final capture; its viewport override was adjusted to 1080 × 768 physical pixels to retain the intended CSS dimensions. Source artwork was compared proportionally, without treating browser screenshot canvas padding as page content.
- Mobile: sign-in and registration inspected around 390 × 844 CSS pixels; desktop introduction is hidden and the form has no horizontal overflow.
- Sources and rendered captures were reviewed together in the visual review context. Form labels, tab selection, input outlines, icon alignment, photo boundaries, and header language controls were additionally inspected as focused regions.

## Findings and fixes

1. P2 — Initial desktop introduction padding pushed the footer below the intended frame. Reduced reserved photo spacing from 490px to 410px and image height from 475px to 440px. Final main region measures 850px at a 1440 × 1024 CSS viewport; form actions remain visible and no horizontal overflow is present.
2. P2 — The initial family image had a visible brown boundary against the dark page. Regenerated the upper fade while preserving the family and phone. Reloaded and visually checked the revised asset in the final registration capture.
3. P3 — The implementation uses the site's existing approved Gujarat map logo rather than the mock's extra shield-and-orbit treatment. This intentionally preserves existing brand identity.
4. P3 — Production form headings and supporting labels are more compact than the oversized generated mock text. Body text remains 14–16px, with larger Gujarati headings and 56px inputs. This keeps the complete registration form usable on smaller desktop windows.

## Required fidelity surfaces

- Typography: Noto Sans Gujarati and Manrope; clear heading hierarchy, readable labels, intact Gujarati shaping and wrapping. Header copy and placeholders support Gujarati, Hindi and English.
- Spacing: matching split desktop layout, aligned form fields, rounded selected tabs and primary actions. Mobile shows a single form column; language controls wrap when needed.
- Colors: warm charcoal `#100D0B`, brown form surfaces, ivory text, orange `#ff7a2f` actions, restrained warm outlines and visible keyboard focus.
- Images: real generated family photograph placed in the lower left region, existing map SVG reused as a supplied brand asset, Material Symbols used for interface icons. No rasterized UI or fabricated CSS illustration.
- Content: sign-in and registration have separate headings, fields and actions. Existing authentication endpoints and session keys are preserved. Footer accurately identifies independent citizen guidance.

## Functional validation

- Browser verified login/register tabs, arrow-key tab navigation, password visibility, empty required-field validation, all three language choices and mobile overflow.
- Six isolated authentication UI contract checks passed: login payload/session navigation, password mismatch, registration payload, server rejection, network error, and unavailable session storage. Server responses were mocked; no live account was created and no email was sent.
- JavaScript syntax check and production Vite build passed. No browser console errors were observed on the reviewed auth page.
- Temporary viewport overrides were reset after inspection.

No remaining P0/P1/P2 findings. Optional P3 differences are recorded above.

final result: passed
