# Google Sheets Intake Setup

This project can send the detailed intake form to a Google Sheet through:

`public/info-form/index.html` -> `netlify/functions/submit-event-intake.js` -> Google Apps Script web app -> Google Sheet

## 1. Create a new Google Sheet

Create a fresh sheet for website intake submissions.

Use this header row in the first sheet tab:

```text
submitted_at
source
name
email
phone
preferred_contact_method
event_name
event_type
event_date
event_start_time
guest_count
venue
event_city
setup_environment
venue_access
hours_needed
package_interest
prints_needed
backdrop_preference
special_requests
additional_notes
```

## 2. Add Apps Script

In the Google Sheet:

1. Open `Extensions` -> `Apps Script`
2. Replace the default code with this:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = JSON.parse(e.postData.contents);

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    const row = headers.map((header) => data[header] || "");

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. Deploy the Apps Script as a web app

1. Click `Deploy` -> `New deployment`
2. Choose `Web app`
3. Set `Execute as`: `Me`
4. Set `Who has access`: `Anyone`
5. Deploy and copy the web app URL

## 4. Add the webhook URL to Netlify

Set this environment variable in Netlify:

`GOOGLE_SHEETS_WEBHOOK_URL`

Value:

`https://script.google.com/macros/s/.../exec`

You can also add it locally in `.env` while testing:

```env
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/REPLACE_ME/exec
```

## 5. What happens after setup

When a client submits the detailed form:

1. The browser sends the form to `/.netlify/functions/submit-event-intake`
2. The Netlify function forwards the data to your Apps Script
3. Apps Script appends one row to your Google Sheet

## 6. Recommended next spreadsheet columns

After the raw intake columns, add formula-driven columns for your workflow, for example:

```text
package_base
print_add_on
travel_fee
extra_hours_total
subtotal
deposit_due
balance_due
contract_status
doc_ready
docusign_sent
```

That gives you a clean handoff into your contract doc workflow.
