const REQUIRED_FIELDS = ["name", "email", "event_type", "event_date", "venue", "event_city"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method Not Allowed" });
  }

  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
    return jsonResponse(500, {
      ok: false,
      error: "Missing GOOGLE_SHEETS_WEBHOOK_URL environment variable.",
    });
  }

  try {
    const payload = JSON.parse(event.body || "{}");

    for (const field of REQUIRED_FIELDS) {
      if (!payload[field]) {
        return jsonResponse(400, {
          ok: false,
          error: `Missing required field: ${field}`,
        });
      }
    }

    const submission = {
      submitted_at: new Date().toISOString(),
      source: "bombcityphotobooth.com/info-form",
      ...payload,
    };

    const upstreamResponse = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submission),
    });

    const upstreamText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return jsonResponse(502, {
        ok: false,
        error: "Google Sheets webhook returned an error.",
        details: upstreamText,
      });
    }

    return jsonResponse(200, {
      ok: true,
      message: "Event intake submitted successfully.",
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error.message || "Unknown server error.",
    });
  }
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}
