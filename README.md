# BCPB-Website

## Event Intake Wiring

The detailed intake form lives at:

- `public/info-form/index.html`
- `public/js/info-form.js`

The CRM endpoint URL is set on the form element with the
`data-crm-intake-endpoint` attribute so it can be updated without digging
through the submission logic.

## Template Gallery

The public template gallery lives on the main website in `public/templates.html`.

The page reads its published catalog from the URL configured in:

- `public/js/site-config.js`

Set `templateCatalogUrl` to the public CloudFront URL for your
`template-catalog/published-templates.json` file.
