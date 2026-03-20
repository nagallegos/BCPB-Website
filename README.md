# BCPB-Website

## Event Intake Wiring

The detailed intake form lives at:

- `public/info-form/index.html`
- `public/js/info-form.js`

The CRM endpoint URL is set on the form element with the
`data-crm-intake-endpoint` attribute so it can be updated without digging
through the submission logic.

## Template Gallery

The public template gallery no longer lives in this repository.

Website navigation now points visitors to the unified template app:

- `public/js/site-config.js` stores the current template app URL.

The local `/templates.html` route is kept as a redirect so older links still
land in the right place.
