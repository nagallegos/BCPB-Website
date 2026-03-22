# Template Gallery Ops

## Current Architecture

- The public customer-facing template gallery lives in this repo at `public/templates.html`.
- The private admin/publishing app lives in the sibling `Photo Templates` repo.
- The admin app publishes the public catalog JSON and preview assets to S3.
- CloudFront serves those public assets and is the URL the website reads from.

## Website Source Of Truth

The website reads the catalog URL from:

- `public/js/site-config.js`

Current key:

- `templateCatalogUrl`

Current expected value shape:

- `https://<cloudfront-domain>/template-catalog/published-templates.json`

## Publish Flow

1. Update templates in the private admin app.
2. Publish from the admin app.
3. The admin app uploads:
- the catalog JSON to `template-catalog/published-templates.json`
- preview assets under the public asset prefix in S3
4. CloudFront serves the updated JSON and images.
5. The website templates page fetches the catalog from `templateCatalogUrl`.

## AWS Pieces

- S3 bucket stores the published catalog and preview assets.
- CloudFront is the public delivery layer used by the website.
- CloudFront behaviors should return CORS headers for the catalog and image paths.

Recommended behavior setup:

- `Default (*)` can serve the whole bucket if this distribution is only for template assets.
- Use:
  - `Origin request policy`: `Managed-CORS-S3Origin`
  - `Response headers policy`: `Managed-SimpleCORS`
  - `Allowed methods`: `GET, HEAD, OPTIONS`

## If Publishing Works But The Website Fails

Check these in order:

1. Open the CloudFront catalog URL directly in a browser.
2. Confirm it returns `200` and valid JSON.
3. Confirm the website `public/js/site-config.js` points to the same CloudFront URL.
4. Confirm CloudFront is returning CORS headers.
5. Create a CloudFront invalidation if the published content changed but the site still shows stale results.

## Common Changes

### Change the public catalog URL

Edit:

- `public/js/site-config.js`

### Move from one CloudFront domain to another

Update only:

- `public/js/site-config.js`

No template page code changes should be required.

### Change catalog path prefix

If the admin app starts publishing somewhere other than:

- `template-catalog/published-templates.json`

update:

- the admin app publish target
- `public/js/site-config.js`

## Related Website Files

- `public/templates.html`
- `public/js/templates.js`
- `public/js/site-config.js`
- `public/header.html`
- `public/footer.html`
