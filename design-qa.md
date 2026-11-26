# Interactive landing page QA

Scope: root landing page. User requested combining landing concepts 1 and 2 with real interactive motion. Combined reference was generated and shown before implementation: `design-previews/landing-combined-reference.png`.

Implementation: http://localhost:5173/. Also verified the compiled production build on a temporary localhost:4173 preview, then stopped that test server. Normal development server remains running.

## Visual review

Source and implementation were reviewed together in the visual context. Compared the hero and phone compositions, then inspected phone text, map edges, typography, warning buttons and scene controls in detail. Desktop verified at 1440 × 1024 CSS pixels; mobile around 391 × 844. Browser screenshot padding and transient cropped captures during smooth scrolling were excluded from layout findings; settled element bounds were checked alongside captures.

- P2 fixed: washed-out initial map lighting and a gray floor rectangle. Adjusted lights/materials, neutral tone mapping and a transparent shadow receiver. Final production capture has a warm map and continuous charcoal background.
- P2 fixed: narrow scene viewports could crop the map. Camera distance now fits available width as well as aspect ratio; mobile has no horizontal overflow.
- P2 fixed: small mobile chips and scene controls. Increased label and control sizes.
- P3 accepted: clean extruded brand outline and restrained ceramic grain replace the mock's invented terrain relief. The follow-up visual polish adds a restrained bloom pass on desktop; mobile renders directly without that pass.

## Required fidelity surfaces

- Typography: Manrope/Noto Sans Gujarati, ivory/orange heading hierarchy, readable form labels; Gujarati, Hindi and English copy.
- Spacing: editorial copy/scene layout on desktop, stacked composition on mobile, separate checker and registration sections. The long static blueprint becomes successive poses of one sticky 3D stage, as requested.
- Colors: charcoal #100D0B, orange actions #ff7a2f, cream text and warm brown surfaces. Lit map color varies with rotation and lighting.
- Assets: approved map SVG extruded into real geometry; actual Three.js phone, plinth, trails and camera. No UI mockup is used as the scene. Material texture: `public/assets/landing-map-grain.png`, generated with built-in image generation from the prompt: seamless low-contrast grayscale ceramic micro-grain, no objects, text, map geography or baked lighting.
- Content: independent guidance, illustrative phone message using a reserved .example domain, no fabricated live metrics or government status.

## Verification

Native drag changed rotation to 41 degrees. Keyboard rotation/reset, forward/reverse chapters, pause/resume, warning chip selection and corresponding phone highlights worked. Language controls update page and phone copy. Guest checker CTA correctly requires sign-in and retains text on the current page. No real message/account activity was submitted.

Localized keys, phone highlight arrays, anchor targets, linked pages and asset paths passed structural checks. Production build passed. Compiled scene and its interactions worked with no errors/warnings in the final production browser check. Temporary viewport overrides were reset; normal landing preview retained for user.

Renderer is asynchronously loaded; pixel ratio/frame frequency are limited, offscreen/hidden rendering is skipped. Reduced-motion and unavailable-WebGL paths were reviewed in code, not forced through browser runtime injection. Authenticated live scanning was not exercised; it uses the existing /api/scans/message endpoint.

Vite reports a large renderer chunk (~618 kB minified /161 kB gzip); advisory is not suppressed. No cross-device frame-rate claim is made. Login/register files were unchanged in this pass. Previous auth QA: `design-previews/auth-design-qa.md`.

No unresolved P0/P1/P2 findings.

final result: passed

## Follow-up: more attractive motion

Preserved the accepted page layout and brand. Increased map extrusion/bevel depth, reduced its scale, enriched its material/edge detail, added moving bright trail particles and sparse depth particles, darkened the display stand, and replaced the straight phone rise with a turning approach from depth. Added staged text entrances and modest camera parallax. Desktop uses a low-resolution bloom chain with a final output pass; narrow/mobile viewports use direct rendering. Canvas edges are feathered into the charcoal page.

Reviewed revised desktop hero and phone states against the existing visual direction. Fixed the initially visible rectangular postprocessing boundary and distracting gray pedestal. Rechecked mobile at 391 � 844: canvas rendered, no horizontal overflow, active heading fully opaque, warning selection and rotation/pause controls operational. No browser errors were observed. Viewport override reset and preview retained.

final result: passed
