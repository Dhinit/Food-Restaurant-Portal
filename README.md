# Flavour Lab: Full-stack Food Website

**Stack:** Node.js + Express (REST API, JSON-file storage) and HTML/CSS/vanilla JavaScript (multi-page frontend).

## Run
    npm install
    npm start        # http://localhost:3000   (admin: /admin.html, password admin123)

## Pages
Home (choose Delivery / Takeaway / Dine-in once), Menu, Dish, Ingredient finder, Book a table (with food pre-order),
Cart & checkout (uses the mode chosen on the home page), How I Cook (8 topic pages), Kind Words (reviews, one page per
category), Good to Know (6 topic pages + FAQ), About, Contact, Admin, 404.

## Architecture
- public/  : static frontend (site.css, site.js shared by all pages; topic.html is one template for all guide pages)
- server.js: Express REST API. Prices, coupons and delivery fees are always calculated on the server.
- data/    : dishes.json, content.json (guide topics) and runtime files messages/bookings/orders/reviews/subscribers.json

## API
GET /api/dishes, /api/dishes/:id, /api/content, /api/ratings, /api/reviews?dish=, /api/reviews/all, /api/reviews/latest, /api/slots?date=
POST /api/contact, /api/subscribe, /api/bookings, /api/quote, /api/orders, /api/reviews, /api/reviews/:id/helpful
GET /api/bookings/lookup, /api/orders/lookup
Admin (header x-admin-password): GET/PATCH/DELETE /api/admin/:type  (messages, bookings, orders, reviews, subscribers)

## Photos
On start the server saves a photo per dish into public/images (Wikipedia, then TheMealDB). Drop your own <dish-id>.jpg to override.

## Change admin password (Windows)
    set ADMIN_PASSWORD=yourpass
    npm start
