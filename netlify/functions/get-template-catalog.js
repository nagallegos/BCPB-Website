const fs = require("fs");
const path = require("path");

const LOCAL_CATALOG_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "published-templates.json",
);

function absolutizeUrl(value, baseUrl) {
  if (typeof value !== "string" || !value.trim()) return value;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function normalizeRemoteCatalog(payload, remoteCatalogUrl) {
  const sourceUrl = new URL(remoteCatalogUrl);

  return {
    ...payload,
    templates: Array.isArray(payload.templates)
      ? payload.templates.map((template) => ({
          ...template,
          previewImage: absolutizeUrl(template.previewImage, sourceUrl),
          previewImages: Array.isArray(template.previewImages)
            ? template.previewImages.map((image) => absolutizeUrl(image, sourceUrl))
            : [],
        }))
      : [],
  };
}

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

      const payload = normalizeRemoteCatalog(
        await response.json(),
        remoteCatalogUrl,
      );

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
