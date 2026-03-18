document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("event-info-form");
  const submitButton = document.getElementById("event-info-submit");
  const status = document.getElementById("event-info-status");

  if (!form || !submitButton || !status) return;

  const crmIntakeEndpoint = form.dataset.crmIntakeEndpoint;

  if (!crmIntakeEndpoint) {
    status.textContent =
      "Missing CRM intake endpoint configuration on the form.";
    status.className = "small text-center mb-3 text-danger";
    return;
  }

  function asNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  function buildCrmPayload(payload) {
    const eventType = payload.event_type || "Unknown";
    const eventName = payload.event_name || `${eventType} Inquiry`;
    const notes = [
      payload.special_requests,
      payload.additional_notes,
      payload.venue ? `Venue: ${payload.venue}` : "",
      payload.event_start_time ? `Start time: ${payload.event_start_time}` : "",
      payload.setup_environment ? `Setup type: ${payload.setup_environment}` : "",
      payload.venue_access ? `Venue access: ${payload.venue_access}` : "",
      payload.hours_needed ? `Hours needed: ${payload.hours_needed}` : "",
      payload.prints_needed ? `Prints needed: ${payload.prints_needed}` : "",
      payload.backdrop_preference
        ? `Backdrop preference: ${payload.backdrop_preference}`
        : "",
      payload.preferred_contact_method
        ? `Preferred follow-up: ${payload.preferred_contact_method}`
        : "",
    ].filter(Boolean);

    return {
      name: payload.name || "",
      email: payload.email || "",
      phone: payload.phone || "",
      eventTitle: eventName,
      eventType,
      eventDate: payload.event_date || "",
      city: payload.event_city || "",
      packageInterest: payload.package_interest || "Needs Recommendation",
      guestCount: asNumber(payload.guest_count),
      estimatedValue: 0,
      details: notes.join("\n"),
    };
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    status.textContent = "";

    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const crmPayload = buildCrmPayload(payload);

    try {
      const response = await fetch(crmIntakeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(crmPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit the form.");
      }

      window.location.href = "/thank-you.html";
    } catch (error) {
      status.textContent =
        error.message ||
        "Something went wrong while sending the form. Please try again.";
      status.className = "small text-center mb-3 text-danger";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send Event Details";
    }
  });
});
