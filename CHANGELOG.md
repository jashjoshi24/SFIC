# Changelog

## V18 connected frontend
- Created the 12 canonical route documents from the supplied V18 HTML.
- Selected `user_dashboard_1` as the canonical dashboard and `emergency_help_complaint_hub` as the canonical emergency page.
- Mapped existing `data-path` navigation targets to the canonical route URLs.
- Preserved source HTML, inline styles, Tailwind configuration, and page-specific layouts.
- Copied original screenshot references into `references/v18/`.

## 31 October 2026 — Landing-page authentication entry points
- Added Gujarati Login and Register actions to the landing-page top navigation, matching existing V18 button styling and palette.
- Login opens `/login?mode=login`; Register opens `/login?mode=register`.
- Login page now selects the matching login or registration tab from the query parameter.

## 31 October 2026 — Desktop sidebar toggle
- Added a keyboard-accessible desktop control to collapse or restore the sidebar.
- Saved the selected sidebar state across routes; mobile layouts retain the full sidebar.

## 31 October 2026 — Separate admin dashboard navigation
- Added admin-only navigation for threat trends, scam-pattern review, and incident monitoring.
- Added a clearly labeled link from the admin dashboard to the separate citizen dashboard.
