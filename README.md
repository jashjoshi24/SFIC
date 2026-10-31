# Surakshit Gujarat — V18 Connected Frontend

This package connects the supplied V18 Stitch page exports into one navigable static frontend while retaining each original page's HTML, Tailwind classes, inline CSS, typography, colours, and layout.

## Routes
- `/` — Public landing page
- `/app` — User dashboard (V18 `user_dashboard_1`)
- `/emergency` — Emergency help and complaint hub
- `/app/check/url` — Phishing / URL checker
- `/app/check/message` — Message scam checker
- `/app/check/image` — QR / screenshot analyzer
- `/app/assistant` — Gujarati AI assistant
- `/awareness` — Scam awareness library
- `/awareness/article` — Scam guide / family sharing
- `/app/profile` — User profile and settings
- `/login` — Login and onboarding
- `/admin` — Admin dashboard

The citizen dashboard (`/app`) and platform administration dashboard (`/admin`) are separate interfaces with role-specific navigation. This static prototype does not implement authentication or role-based access control; protect `/admin` with a backend authorization layer before deployment.

## Run
Requires Node.js 18+.

```bash
npm install
npm run dev
```
Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Design preservation
The original V18 HTML pages are served as individual route documents rather than rebuilt into a new component theme. The global navigation patch only maps existing `data-path` navigation targets to the canonical routes. Original screenshots are retained under `references/v18/`.

## Notes
- The two dashboard variants are retained in the source ZIP; `user_dashboard_1` is used as the canonical `/app` page.
- The canonical emergency page is `emergency_help_complaint_hub`.
- Backend-dependent functions remain prototype-only unless connected to a real backend. Review existing page-level demo interactions before production deployment.
- Original Stitch images are externally hosted in the supplied HTML where applicable; internet access may be needed to display them.
