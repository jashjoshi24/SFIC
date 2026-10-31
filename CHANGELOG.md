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

## 31 October 2026 — Landing page sidebar
- Removed the left sidebar from the landing page and reclaimed its content gutter; other pages are unchanged.

## 31 October 2026 — Login page sidebar
- Removed the left sidebar from the login page and expanded its header/content; other pages are unchanged.
