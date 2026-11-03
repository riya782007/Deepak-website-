# Soft Binomials India

A responsive 15-page information website, built with Vite and modular JavaScript. Repository: https://github.com/riya782007/Deepak-website-

## Run

npm install
npm run dev
npm run build
npm run preview
npm test

Deploy the dist directory to a static host. The build creates an index.html entry for each page so direct links work. For subdirectory hosting configure Vite base and the root-relative links before deployment. Unknown routes should serve 404.html with HTTP 404.

## Content

Edit src/content.js for service information, insight previews and company settings. Editorial page content and homepage copy are in src/main.js. Shared navigation and footer are in src/components.js. Design tokens and responsive rules are in src/style.css.

The content is draft template copy. Confirm company identity, service offerings, legal text, team information and contact details before launch. No client endorsements, partnerships, statistics or leadership claims from the reference companies are attributed to this new brand. Social impact and careers deliberately avoid invented programmes or vacancies.

## Future integrations

All integrations route through src/integrations.js. The enquiry form calls submitEnquiry(): with no endpoint configured it creates a local text brief (nothing is sent); set company.enquiryEndpoint in src/content.js to a server URL and the same form posts JSON there instead, so CRM delivery needs no front-end changes. Feature flags for payments and an AI assistant live in the same file. Point that endpoint at a server after delivery and privacy requirements are approved. Keep validation, rate limiting, consent and CRM credentials on the server. Treat CRM delivery as a queued server operation with retries. Add hosted payment checkout through a server-created session, verify signed webhooks and make fulfilment idempotent. Add AI through a server endpoint with appropriate access controls and streaming; never expose provider keys in browser code. These integrations are architectural extension points, not active features.

## Design

Reference websites: https://softpolynomials.com/ and https://dgconsulting.in/ . Service groupings draw from their education, software, corporate training, HR and individual development offerings. Original generated concept: docs/design-concept.png. Original AI-generated team photo is illustrative, not a photograph of company employees.

The production UI is live HTML/CSS, not an image of the design. The brand lockup, reusable photo in the company section and expanded footer navigation are intentional adaptations. System fonts keep the template self-contained.

## Interaction and motion

The final-touch layer is src/delight.css: pastel gradient heroes with drifting colour blobs, floating service chips and a gentle 3D tilt on the homepage photo, an animated keyword marquee, cursor-following highlights on cards, a self-drawing process timeline, staggered scroll reveals, a scroll progress bar, compact sticky header and back-to-top button. The homepage adds Who we serve and How we work sections; service pages add Who it’s for and the approach steps; the contact page adds What happens next, chip-style interest selection, inline validation and a character count.

Shared visual refinements live in src/polish.css; navigation, search, filters and motion live in src/experience.js. Service category and search state are stored in the URL so filtered links can be shared and refreshed. Service pages preserve their selected service when opening an enquiry. Related services favour the same group.

Entrance animations use the native Web Animations API with IntersectionObserver and run once per element. Content stays visible without animation support. CSS and JavaScript respect prefers-reduced-motion, including preference changes during a visit. The mobile navigation supports Escape, outside click and keyboard focus dismissal.
