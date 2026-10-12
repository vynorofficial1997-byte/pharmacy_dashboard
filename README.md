# Ausway admin panel - frontend

Plain HTML, CSS and JavaScript (no backend). Open `index.html` in a browser.

## Structure
- `*.html` - one HTML file per page (index, login, otp, signup, dashboard, orders, inventory, reports, driver, notifications, settings-page)
- `css/` - all stylesheets. `common.css` (Inter font, colour tokens, animations) is on every page; `auth.css` is shared by login/otp/signup; `app.css` is shared by the admin pages (header, sidebar, cards, tables, pop-ups); each page also has its own file (e.g. `css/orders.css`)
- `js/app.js` - the single JavaScript file for all pages
- `assets/` - logo, chart/bill/prescription images and `fonts/` (Inter, bundled, works offline)

## Colours
933535, 993535, 6F0000 (maroons) · 414141, 404040, 1C1B1F (text) · F0CFCF (light pink). Dashboard panels use the design's #FFE4E4 tint.

## Flow
index -> login -> otp -> dashboard. Login -> Sign-up -> otp. Sidebar: dashboard / orders / inventory / reports / logout. Bell -> notifications, gear -> settings. Header search filters the table on the current page.
