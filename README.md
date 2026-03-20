# BCPB-Website

## Event Intake Wiring

The detailed intake form lives at:

- `public/info-form/index.html`
- `public/js/info-form.js`

The CRM endpoint URL is set on the form element with the
`data-crm-intake-endpoint` attribute so it can be updated without digging
through the submission logic.

## Template Catalog Source

The public templates page can load its catalog in two ways:

1. Production: set the Netlify environment variable `TEMPLATE_CATALOG_URL`
   to the published JSON endpoint from the Template Admin App deployment.
2. Local fallback: if that env var is not set, the site falls back to
   `public/data/published-templates.json`.

The templates page calls `/.netlify/functions/get-template-catalog`, which
proxies the remote catalog when configured.
