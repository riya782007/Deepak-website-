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

The enquiry form currently creates a local text file and explicitly does not send data. Replace its submit handler with a server endpoint after delivery and privacy requirements are approved. Keep validation, rate limiting, consent and CRM credentials on the server. Treat CRM delivery as a queued server operation with retries. Add hosted payment checkout through a server-created session, verify signed webhooks and make fulfilment idempotent. Add AI through a server endpoint with appropriate access controls and streaming; never expose provider keys in browser code. These integrations are architectural extension points, not active features.

## Design

Reference websites: https://softpolynomials.com/ and https://dgconsulting.in/ . Service groupings draw from their education, software, corporate training, HR and individual development offerings. Original generated concept: docs/design-concept.png. Original AI-generated team photo is illustrative, not a photograph of company employees.

The production UI is live HTML/CSS, not an image of the design. The brand lockup, reusable photo in the company section and expanded footer navigation are intentional adaptations. System fonts keep the template self-contained.
