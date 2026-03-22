document.addEventListener("DOMContentLoaded", () => {
  initTemplatesCatalog();
});

async function initTemplatesCatalog() {
  const grid = document.getElementById("templatesGrid");
  if (!grid) return;

  const searchInput = document.getElementById("templatesSearch");
  const formatFilter = document.getElementById("templatesFormatFilter");
  const eventTypeFilters = document.getElementById("templatesCategoryFilters");
  const countLabel = document.getElementById("templatesCount");
  const emptyState = document.getElementById("templatesEmpty");
  const spotlightViewButton = document.getElementById("spotlightViewButton");

  const modalEl = document.getElementById("templatePreviewModal");
  const modalTitle = document.getElementById("templatePreviewModalLabel");
  const modalImage = document.getElementById("templateModalImage");
  const modalThumbs = document.getElementById("templateModalThumbs");
  const modalBadges = document.getElementById("templateModalBadges");
  const modalMeta = document.getElementById("templateModalMeta");
  const modalDescription = document.getElementById("templateModalDescription");
  const modalReference = document.getElementById("templateModalReference");
  const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

  const spotlightEyebrow = document.getElementById("spotlightEyebrow");
  const spotlightImage = document.getElementById("spotlightImage");
  const spotlightTitle = document.getElementById("spotlightTitle");
  const spotlightDescription = document.getElementById("spotlightDescription");
  const spotlightReference = document.getElementById("spotlightReference");
  const spotlightBadges = document.getElementById("spotlightBadges");
  const spotlightMeta = document.getElementById("spotlightMeta");

  let allTemplates = [];
  let filteredTemplates = [];
  let activeEventType = "all";
  let activeFormat = "all";
  let searchTerm = "";

  try {
    const catalog = await loadCatalog();
    const sourceUrl = catalog.sourceUrl || window.SITE_CONFIG?.templateCatalogUrl || "";
    allTemplates = (catalog.templates || []).map((template) =>
      normalizeTemplate(template, sourceUrl),
    );
  } catch (error) {
    console.error(error);
    countLabel.textContent =
      error.message || "The template catalog could not be loaded right now.";
    emptyState.classList.remove("d-none");
    return;
  }

  renderSummary(allTemplates);
  renderFormatOptions(allTemplates, formatFilter);
  renderEventTypeButtons(allTemplates, eventTypeFilters, (eventType) => {
    activeEventType = eventType;
    renderActiveEventTypeButton(eventTypeFilters, activeEventType);
    applyFilters();
  });

  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  formatFilter.addEventListener("change", () => {
    activeFormat = formatFilter.value;
    applyFilters();
  });

  spotlightViewButton.addEventListener("click", () => {
    const featuredTemplate = getSpotlightTemplate(
      filteredTemplates,
      activeEventType,
    );
    if (featuredTemplate) {
      openTemplateModal(featuredTemplate);
    }
  });

  applyFilters();

  function applyFilters() {
    filteredTemplates = allTemplates.filter((template) => {
      const matchesEventType =
        activeEventType === "all" || template.eventTypes.includes(activeEventType);
      const matchesFormat =
        activeFormat === "all" || template.formats.includes(activeFormat);
      const matchesSearch =
        !searchTerm || template.searchIndex.includes(searchTerm);

      return matchesEventType && matchesFormat && matchesSearch;
    });

    renderSpotlight(getSpotlightTemplate(filteredTemplates, activeEventType));
    renderTemplateGroups(filteredTemplates, grid, openTemplateModal);

    const visibleCount = filteredTemplates.length;
    const totalCount = allTemplates.length;

    countLabel.textContent =
      visibleCount === totalCount
        ? `${totalCount} published template${totalCount === 1 ? "" : "s"} available`
        : `${visibleCount} of ${totalCount} template${totalCount === 1 ? "" : "s"} shown`;

    emptyState.classList.toggle("d-none", visibleCount !== 0);
  }

  function openTemplateModal(template) {
    if (!modal) return;

    let activeImage = template.previewImages[0] || template.previewImage;

    modalTitle.textContent = template.title;
    modalDescription.textContent = template.description;
    modalReference.innerHTML = renderReference(template);
    modalBadges.innerHTML = buildBadges(template).join("");
    modalMeta.innerHTML = buildMeta(template).join("");

    const renderModalImage = (src) => {
      activeImage = src;
      modalImage.src = src;
      modalImage.alt = `${template.title} preview`;
      modalThumbs.innerHTML = template.previewImages
        .map(
          (image, index) => `
            <button
              type="button"
              class="template-thumb ${image === activeImage ? "is-active" : ""}"
              data-image-index="${index}"
              aria-label="Open preview ${index + 1} for ${escapeHtml(template.title)}"
            >
              <img src="${image}" alt="${escapeHtml(template.title)} thumbnail ${index + 1}" />
            </button>
          `,
        )
        .join("");

      modalThumbs.querySelectorAll("[data-image-index]").forEach((button) => {
        button.addEventListener("click", () => {
          const nextImage = template.previewImages[Number(button.dataset.imageIndex)];
          renderModalImage(nextImage);
        });
      });
    };

    renderModalImage(activeImage);
    modal.show();
  }

  function renderSpotlight(template) {
    if (!template) {
      spotlightEyebrow.textContent = "Featured Match";
      spotlightTitle.textContent = "No published templates yet";
      spotlightDescription.textContent =
        "Publish templates from your admin app to populate this page.";
      spotlightReference.innerHTML = "";
      spotlightBadges.innerHTML = "";
      spotlightMeta.innerHTML = "";
      spotlightImage.src = "/assets/images/portfolio/photo1.png";
      spotlightViewButton.disabled = true;
      return;
    }

    spotlightEyebrow.textContent = template.featured
      ? "Featured Template"
      : "Suggested Match";
    spotlightImage.src = template.previewImage;
    spotlightImage.alt = `${template.title} preview`;
    spotlightTitle.textContent = template.title;
    spotlightDescription.textContent = template.description;
    spotlightReference.innerHTML = renderReference(template);
    spotlightBadges.innerHTML = buildBadges(template).join("");
    spotlightMeta.innerHTML = buildMeta(template).join("");
    spotlightViewButton.disabled = false;
  }
}

async function loadCatalog() {
  const configuredSource = window.SITE_CONFIG?.templateCatalogUrl?.trim();

  if (!configuredSource) {
    throw new Error(
      "Set SITE_CONFIG.templateCatalogUrl in /public/js/site-config.js to your published CloudFront catalog URL.",
    );
  }

  const response = await fetch(configuredSource, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Catalog request failed with status ${response.status} from ${configuredSource}`,
    );
  }

  return await response.json();
}

function normalizeTemplate(template, sourceUrl) {
  const category = String(template.category || "general").trim().toLowerCase();
  const title = template.title || "Untitled Template";
  const formats = Array.isArray(template.formats) ? template.formats : [];
  const tags = Array.isArray(template.tags) ? template.tags : [];
  const colors = Array.isArray(template.colors) ? template.colors : [];
  const eventTypes = normalizeEventTypes(template, category);
  const previewImages = Array.from(
    new Set(
      [template.previewImage, ...(template.previewImages || [])]
        .filter(Boolean)
        .map((value) => absolutizeUrl(String(value), sourceUrl)),
    ),
  );

  return {
    ...template,
    title,
    category,
    categoryLabel: titleCase(category),
    formats,
    tags,
    colors,
    eventTypes,
    primaryEventType: eventTypes[0] || category,
    featured: Boolean(template.featured),
    displayReference: getDisplayReference(template),
    previewImage: previewImages[0] || "/assets/images/portfolio/photo1.png",
    previewImages: previewImages.length
      ? previewImages
      : ["/assets/images/portfolio/photo1.png"],
    description:
      template.description || "A custom photo booth design available for event styling.",
    style: template.style || "custom",
    searchIndex: [
      title,
      category,
      template.style,
      template.description,
      getDisplayReference(template),
      ...formats,
      ...tags,
      ...colors,
      ...eventTypes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

function absolutizeUrl(value, sourceUrl) {
  if (!value) return value;

  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return value;
  }
}

function normalizeEventTypes(template, category) {
  const values = Array.isArray(template.eventTypes) && template.eventTypes.length
    ? template.eventTypes
    : [template.eventType || category];

  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase()),
    ),
  );
}

function getDisplayReference(template) {
  return (
    template.referenceId ||
    template.displayId ||
    template.clientReferenceId ||
    template.templateCode ||
    template.catalogId ||
    template.id ||
    ""
  );
}

function getSpotlightTemplate(templates, activeEventType) {
  if (!templates.length) return null;

  if (activeEventType !== "all") {
    const featuredInType = templates.find(
      (template) =>
        template.featured && template.eventTypes.includes(activeEventType),
    );
    if (featuredInType) return featuredInType;
  }

  return templates.find((template) => template.featured) || templates[0];
}

function renderSummary(templates) {
  const templateCount = document.getElementById("templateCountStat");
  const categoryCount = document.getElementById("categoryCountStat");
  const formatCount = document.getElementById("formatCountStat");

  const eventTypes = new Set(templates.flatMap((template) => template.eventTypes));
  const formats = new Set(templates.flatMap((template) => template.formats));

  templateCount.textContent = String(templates.length);
  categoryCount.textContent = String(eventTypes.size);
  formatCount.textContent = String(formats.size);
}

function renderFormatOptions(templates, select) {
  const formats = Array.from(
    new Set(templates.flatMap((template) => template.formats)),
  ).sort((left, right) => left.localeCompare(right));

  select.innerHTML = `
    <option value="all">All formats</option>
    ${formats
      .map((format) => `<option value="${format}">${format}</option>`)
      .join("")}
  `;
}

function renderEventTypeButtons(templates, container, onSelect) {
  const counts = templates.reduce((acc, template) => {
    template.eventTypes.forEach((eventType) => {
      acc[eventType] = (acc[eventType] || 0) + 1;
    });
    return acc;
  }, {});

  const eventTypes = Object.keys(counts).sort((left, right) =>
    left.localeCompare(right),
  );

  container.innerHTML = `
    <button type="button" class="template-chip is-active" data-event-type="all">
      All event types
      <span class="ms-1 text-muted-custom">${templates.length}</span>
    </button>
    ${eventTypes
      .map(
        (eventType) => `
          <button type="button" class="template-chip" data-event-type="${eventType}">
            ${escapeHtml(titleCase(eventType))}
            <span class="ms-1 text-muted-custom">${counts[eventType]}</span>
          </button>
        `,
      )
      .join("")}
  `;

  container.querySelectorAll("[data-event-type]").forEach((button) => {
    button.addEventListener("click", () => {
      onSelect(button.dataset.eventType);
    });
  });
}

function renderActiveEventTypeButton(container, activeEventType) {
  container.querySelectorAll("[data-event-type]").forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.eventType === activeEventType,
    );
  });
}

function renderTemplateGroups(templates, grid, openTemplateModal) {
  const groups = groupTemplatesByEventType(templates);

  grid.innerHTML = groups
    .map(
      ([eventType, items]) => `
        <section class="template-event-group">
          <div class="template-event-header">
            <div>
              <p class="eyebrow text-uppercase mb-2">Event Type</p>
              <h3 class="mb-0">${escapeHtml(titleCase(eventType))}</h3>
            </div>
            <p class="template-event-count mb-0">
              ${items.length} template${items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div class="row g-4">
            ${items.map((template) => renderTemplateCard(template)).join("")}
          </div>
        </section>
      `,
    )
    .join("");

  grid.querySelectorAll("[data-template-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const template = templates.find(
        (item) => item.id === button.dataset.templateId,
      );
      if (template) openTemplateModal(template);
    });
  });

  // Cards are rendered after the page-level reveal observer initializes, so
  // we mark them visible immediately instead of leaving them transparent.
  grid.querySelectorAll(".reveal").forEach((el) => {
    el.classList.add("is-visible");
  });
}

function groupTemplatesByEventType(templates) {
  const grouped = new Map();

  templates.forEach((template) => {
    const key = template.primaryEventType || "general";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(template);
  });

  return [...grouped.entries()].sort((left, right) =>
    left[0].localeCompare(right[0]),
  );
}

function renderTemplateCard(template) {
  return `
    <div class="col-md-6 col-xl-4">
      <button
        type="button"
        class="template-card-button reveal"
        data-template-id="${template.id}"
      >
        <div class="card card-brand card-animate h-100">
          <div class="template-card-media">
            <img src="${template.previewImage}" alt="${escapeHtml(template.title)} preview" />
            <div class="template-card-overlay">
              <span class="template-badge">${escapeHtml(titleCase(template.primaryEventType))}</span>
            </div>
          </div>
          <div class="template-card-body">
            <div class="template-card-topline">
              <span class="template-reference">
                <i class="bi bi-hash" aria-hidden="true"></i>
                ${escapeHtml(template.displayReference)}
              </span>
              ${template.featured ? '<span class="template-badge template-badge-featured">Featured</span>' : ""}
            </div>
            <div class="template-card-title mb-3">
              <div>
                <h3 class="h5 mb-1">${escapeHtml(template.title)}</h3>
                <p class="text-muted-custom mb-0">${escapeHtml(template.style)}</p>
              </div>
              <i class="bi bi-arrows-angle-expand icon-brand" aria-hidden="true"></i>
            </div>
            <p class="text-muted-custom mb-3">${escapeHtml(template.description)}</p>
            <div class="template-badges mb-3">
              ${buildBadges(template).join("")}
            </div>
            <div class="template-meta">
              ${buildMeta(template).join("")}
            </div>
          </div>
        </div>
      </button>
    </div>
  `;
}

function buildBadges(template) {
  const items = [template.style, ...template.tags.slice(0, 2)].filter(Boolean);

  return items.map((item) => `<span class="template-badge">${escapeHtml(item)}</span>`);
}

function buildMeta(template) {
  const items = [
    {
      icon: "bi-calendar-event",
      label: titleCase(template.primaryEventType),
    },
    ...template.formats.map((format) => ({
      icon: "bi-aspect-ratio",
      label: format,
    })),
    ...template.colors.slice(0, 3).map((color) => ({
      icon: "bi-palette",
      label: color,
    })),
  ];

  return items.map(
    (item) => `
      <span class="template-meta-item">
        <i class="bi ${item.icon}" aria-hidden="true"></i>
        ${escapeHtml(item.label)}
      </span>
    `,
  );
}

function renderReference(template) {
  if (!template.displayReference) return "";

  return `
    <i class="bi bi-hash" aria-hidden="true"></i>
    Reference ID: ${escapeHtml(template.displayReference)}
  `;
}

function titleCase(value) {
  return String(value)
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
