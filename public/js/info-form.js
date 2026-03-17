document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("event-info-form");
  const submitButton = document.getElementById("event-info-submit");
  const status = document.getElementById("event-info-status");

  if (!form || !submitButton || !status) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    status.textContent = "";

    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/.netlify/functions/submit-event-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
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
