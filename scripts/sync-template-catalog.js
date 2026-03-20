const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const templatesRoot = path.resolve(repoRoot, "..", "Photo Templates");
const publishedCatalogDir = path.join(templatesRoot, "Published Catalog");
const publishedCatalogPath = path.join(
  publishedCatalogDir,
  "published-templates.json",
);
const publicDir = path.join(repoRoot, "public");
const outputDataDir = path.join(publicDir, "data");
const outputTemplatesDir = path.join(publicDir, "templates");

function main() {
  if (!fs.existsSync(publishedCatalogPath)) {
    throw new Error(`Published catalog was not found at ${publishedCatalogPath}`);
  }

  const sourceCatalog = JSON.parse(fs.readFileSync(publishedCatalogPath, "utf8"));
  const templates = Array.isArray(sourceCatalog.templates)
    ? sourceCatalog.templates
    : [];

  fs.mkdirSync(outputDataDir, { recursive: true });
  fs.rmSync(outputTemplatesDir, { recursive: true, force: true });
  fs.mkdirSync(outputTemplatesDir, { recursive: true });

  const normalizedTemplates = templates.map((template) => syncTemplate(template));
  const outputCatalog = {
    ...sourceCatalog,
    templateCount: normalizedTemplates.length,
    syncedAt: new Date().toISOString(),
    templates: normalizedTemplates,
  };

  fs.writeFileSync(
    path.join(outputDataDir, "published-templates.json"),
    `${JSON.stringify(outputCatalog, null, 2)}\n`,
  );

  console.log(
    `Synced ${normalizedTemplates.length} template(s) into ${path.relative(repoRoot, outputTemplatesDir)}`,
  );
}

function syncTemplate(template) {
  const category = String(template.category || "general").trim().toLowerCase();
  const slug = String(template.slug || template.id || "template").trim();
  const destinationDir = path.join(outputTemplatesDir, category, slug);
  fs.mkdirSync(destinationDir, { recursive: true });

  const copiedAssets = new Map();
  const assetCandidates = [
    template.previewImage,
    ...(Array.isArray(template.previewImages) ? template.previewImages : []),
  ].filter(Boolean);

  for (const assetPath of assetCandidates) {
    const resolvedSource = resolveSourceAsset(assetPath, category, slug);
    if (!resolvedSource) continue;

    const fileName = path.basename(resolvedSource);
    const destinationPath = path.join(destinationDir, fileName);
    fs.copyFileSync(resolvedSource, destinationPath);
    copiedAssets.set(assetPath, toWebPath(destinationPath));
  }

  const normalizedPreviewImages = Array.from(
    new Set(
      assetCandidates
        .map((assetPath) => copiedAssets.get(assetPath))
        .filter(Boolean),
    ),
  );

  return {
    ...template,
    category,
    previewImage:
      copiedAssets.get(template.previewImage) ||
      normalizedPreviewImages[0] ||
      "",
    previewImages: normalizedPreviewImages,
  };
}

function resolveSourceAsset(assetPath, category, slug) {
  const directCandidates = [];
  const templateLibraryRoot = path.join(templatesRoot, "Template Library");

  if (typeof assetPath !== "string" || !assetPath.trim()) return null;

  if (assetPath.startsWith("http://") || assetPath.startsWith("https://")) {
    return null;
  }

  if (assetPath.startsWith("../") || assetPath.startsWith("./")) {
    directCandidates.push(path.resolve(publishedCatalogDir, assetPath));
  } else if (assetPath.startsWith("/templates/")) {
    directCandidates.push(
      path.join(
        templateLibraryRoot,
        titleCase(category),
        slug,
        "web",
        path.basename(assetPath),
      ),
      path.join(
        templateLibraryRoot,
        titleCase(category),
        slug,
        "print",
        path.basename(assetPath),
      ),
      path.join(
        templateLibraryRoot,
        titleCase(category),
        slug,
        "source",
        path.basename(assetPath),
      ),
    );
  } else {
    directCandidates.push(path.resolve(templatesRoot, assetPath));
  }

  const existingDirect = directCandidates.find((candidate) => fs.existsSync(candidate));
  if (existingDirect) return existingDirect;

  const templateDir = path.join(templateLibraryRoot, titleCase(category), slug);
  if (!fs.existsSync(templateDir)) {
    return null;
  }

  const desiredName = path.basename(assetPath).toLowerCase();
  const fallbackMatch = findFileByName(templateDir, desiredName);
  return fallbackMatch || null;
}

function findFileByName(rootDir, desiredName) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const nestedMatch = findFileByName(fullPath, desiredName);
      if (nestedMatch) return nestedMatch;
      continue;
    }

    if (entry.name.toLowerCase() === desiredName) {
      return fullPath;
    }
  }

  return null;
}

function toWebPath(filePath) {
  return `/${path.relative(publicDir, filePath).replaceAll(path.sep, "/")}`;
}

function titleCase(value) {
  return String(value)
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

main();
