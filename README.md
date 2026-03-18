# BCPB-Website

## Event Intake Wiring

The detailed intake form lives at:

- `public/info-form/index.html`
- `public/js/info-form.js`

The CRM endpoint URL is set on the form element with the
`data-crm-intake-endpoint` attribute so it can be updated without digging
through the submission logic.
