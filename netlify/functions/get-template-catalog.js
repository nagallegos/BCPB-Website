const fs = require("fs");
const path = require("path");

const LOCAL_CATALOG_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "published-templates.json",
);

exports.handler = async () => {
  try {
    const remoteCatalogUrl = process.env.TEMPLATE_CATALOG_URL;

    if (remoteCatalogUrl) {
      const response = await fetch(remoteCatalogUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(
          `Remote catalog request failed with status ${response.status}`,
        );
      }

      const payload = await response.json();

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          source: "remote",
          sourceUrl: remoteCatalogUrl,
        }),
      };
    }

    if (fs.existsSync(LOCAL_CATALOG_PATH)) {
      const payload = JSON.parse(fs.readFileSync(LOCAL_CATALOG_PATH, "utf8"));

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          source: "local",
        }),
      };
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "No template catalog source is configured.",
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: err.message || String(err),
      }),
    };
  }
};
