# Audit Register

| Route | Source | Integrated | Visual regression | Functional test |
|---|---|---:|---|---|
| `/` | `public_landing_page/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/app` | `user_dashboard_1/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/emergency` | `emergency_help_complaint_hub/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/app/check/url` | `phishing_url_checker/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/app/check/message` | `message_scam_checker/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/app/check/image` | `qr_screenshot_qr_analyzer/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/app/assistant` | `ai_gujarati_ai_assistant/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/awareness` | `scam_awareness_library/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/awareness/article` | `scam_guide_family_sharing/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/app/profile` | `user_profile_settings/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/login` | `login_onboarding/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |
| `/admin` | `admin_dashboard/code.html` | Yes | Not run in browser | Navigation targets mapped; page controls require manual QA |

## Limitations
- Automated browser screenshots and visual pixel comparisons were not run in this environment.
- Responsive layouts are inherited from the original V18 HTML and Tailwind responsive classes; manual checks at 360, 390, 430, 768, 1024, 1280 and 1440 px are still required.
- External images/fonts and Tailwind CDN require network access.
- Backend-dependent actions are not connected to a production backend.
