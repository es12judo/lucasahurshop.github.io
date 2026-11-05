# Lucasahur Shop

A bilingual English / Swedish website for Lucasahur Shop. Built with plain HTML, CSS and JavaScript for GitHub Pages.

## Publish with GitHub Pages

1. Open the repository **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then Save.
4. Wait a few minutes for the first deployment.

The default project-site URL for this repository is:

`https://es12judo.github.io/lucasahurshop.github.io/`

A custom domain such as `lucasahurshop.github.io` is not automatically assigned by the repository name. Configure a domain you own in Settings → Pages and set its DNS records with your domain provider if you want a branded custom domain.

## Files

- `index.html` — page structure and English / Swedish content
- `styles.css` — responsive dark premium design
- `script.js` — language switch, mobile navigation and enquiry form

## Contact form

The enquiry form opens the visitor's email application with a pre-filled message addressed to `enzosundberg12@gmail.com`. It does not store submissions or send them from the website. For a hosted form that works without the visitor's email app, connect a form service later.

## Editing content

Edit the text in `index.html`. For bilingual text, keep both `data-en` and `data-sv` attributes. Edit colours and layout in `styles.css`.


## Paid course system

A starter implementation for Stripe Checkout, Cloudflare Workers + D1, Resend email delivery and a token-protected course portal is in [`course-system/README.md`](course-system/README.md). It is not live yet: create the Cloudflare/Stripe/Resend accounts, configure secrets and prices, add real lessons, and complete test-mode purchases before enabling sales.
