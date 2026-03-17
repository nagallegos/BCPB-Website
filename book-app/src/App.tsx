import { useEffect, useMemo, useState } from "react";

type LockedEvent = {
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS or HH:MM
  duration_hours: number;
};

type ApiLockedResponse = {
  ok: boolean;
  locked?: LockedEvent[];
  error?: string;
};
type ApiCreateResponse = {
  ok: boolean;
  booking_request_id?: string;
  error?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function timeToMinutes(t: string) {
  // accepts "HH:MM" or "HH:MM:SS"
  const parts = t.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

function overlaps(
  aStartMin: number,
  aEndMin: number,
  bStartMin: number,
  bEndMin: number,
) {
  // overlap if ranges intersect
  return aStartMin < bEndMin && bStartMin < aEndMin;
}

const EVENT_TYPES = [
  "Wedding",
  "Birthday Party",
  "Corporate Event",
  "School Event",
  "Holiday Party",
  "Other",
];

function buildTimeOptions() {
  // 30-min increments from 9:00 to 22:00
  const times: string[] = [];
  for (let h = 9; h <= 22; h++) {
    for (let m of [0, 30]) {
      if (h === 22 && m === 30) continue;
      times.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return times;
}

const TIME_OPTIONS = buildTimeOptions();

export default function App() {
  const [locked, setLocked] = useState<LockedEvent[]>([]);
  const [loadingLocked, setLoadingLocked] = useState(true);
  const [lockedError, setLockedError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [durationHours, setDurationHours] = useState(3);

  const [eventType, setEventType] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLocked() {
      setLoadingLocked(true);
      setLockedError(null);
      try {
        const res = await fetch("/.netlify/functions/list-locked-events");
        const json = (await res.json()) as ApiLockedResponse;

        if (!json.ok)
          throw new Error(json.error || "Failed to load availability");

        if (!cancelled) {
          setLocked(json.locked || []);
        }
      } catch (err: any) {
        if (!cancelled)
          setLockedError(err.message || "Error loading availability");
      } finally {
        if (!cancelled) setLoadingLocked(false);
      }
    }

    loadLocked();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRange = useMemo(() => {
    const startMin = timeToMinutes(startTime);
    const endMin = startMin + durationHours * 60;
    return { startMin, endMin };
  }, [startTime, durationHours]);

  const conflicts = useMemo(() => {
    if (!eventDate) return [];
    const { startMin, endMin } = selectedRange;

    return locked
      .filter((l) => l.event_date === eventDate)
      .filter((l) => {
        const bStart = timeToMinutes(l.start_time);
        const bEnd = bStart + (l.duration_hours || 0) * 60;
        return overlaps(startMin, endMin, bStart, bEnd);
      });
  }, [locked, eventDate, selectedRange]);

  const isBlocked = conflicts.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitResult(null);

    if (!fullName.trim() || !email.trim() || !eventDate) {
      setSubmitResult({
        ok: false,
        message: "Please fill out name, email, and event date.",
      });
      return;
    }

    if (isBlocked) {
      setSubmitResult({
        ok: false,
        message:
          "That time overlaps an existing locked booking. Please choose another slot.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        event_date: eventDate,
        start_time: startTime,
        duration_hours: durationHours,
        event_type: eventType || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/.netlify/functions/create-booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiCreateResponse;

      if (!json.ok) throw new Error(json.error || "Submission failed");

      setSubmitResult({
        ok: true,
        message: `Request submitted! We'll review it and follow up. Reference: ${json.booking_request_id}`,
      });

      // optional: clear form
      // setNotes("");
    } catch (err: any) {
      setSubmitResult({
        ok: false,
        message: err.message || "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "2rem 1rem",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Request a Booking</h1>
        <p style={{ marginTop: ".5rem", color: "#555" }}>
          Pick a date and time. If the slot is available, submit a request and
          we’ll confirm next steps.
        </p>
      </header>

      {loadingLocked ? (
        <p>Loading availability…</p>
      ) : lockedError ? (
        <div
          style={{
            padding: "1rem",
            border: "1px solid #f00",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          <strong>Availability error:</strong> {lockedError}
          <div style={{ marginTop: ".5rem" }}>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <section
          style={{
            display: "grid",
            gap: ".75rem",
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Your info</h2>

          <div
            style={{
              display: "grid",
              gap: ".75rem",
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <label style={{ display: "grid", gap: ".25rem" }}>
              Full name *
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>

            <label style={{ display: "grid", gap: ".25rem" }}>
              Email *
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: ".25rem" }}>
            Phone (optional)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(###) ###-####"
            />
          </label>
        </section>

        <section
          style={{
            display: "grid",
            gap: ".75rem",
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Event time</h2>

          <div
            style={{
              display: "grid",
              gap: ".75rem",
              gridTemplateColumns: "1fr 1fr 1fr",
            }}
          >
            <label style={{ display: "grid", gap: ".25rem" }}>
              Date *
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </label>

            <label style={{ display: "grid", gap: ".25rem" }}>
              Start time
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: ".25rem" }}>
              Duration (hours)
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {eventDate && (
            <div
              style={{
                padding: ".75rem",
                borderRadius: 10,
                background: isBlocked ? "#fff3f3" : "#f3fff5",
                border: `1px solid ${isBlocked ? "#ffb3b3" : "#b3ffbf"}`,
              }}
            >
              {isBlocked ? (
                <>
                  <strong>That slot overlaps a locked booking.</strong>
                  <div style={{ marginTop: ".25rem" }}>
                    Try a different start time or date.
                  </div>
                </>
              ) : (
                <>
                  <strong>Looks good!</strong>
                  <div style={{ marginTop: ".25rem" }}>
                    This slot doesn’t overlap any locked bookings.
                  </div>
                </>
              )}
            </div>
          )}

          {isBlocked && conflicts.length > 0 && (
            <details>
              <summary>See conflicting locked bookings</summary>
              <ul>
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {c.event_date} — {c.start_time} ({c.duration_hours}h)
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section
          style={{
            display: "grid",
            gap: ".75rem",
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Event details</h2>

          <div
            style={{
              display: "grid",
              gap: ".75rem",
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <label style={{ display: "grid", gap: ".25rem" }}>
              Event type
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="">Select…</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: ".25rem" }}>
              Location / venue
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City or venue name"
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: ".25rem" }}>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Anything we should know? Add-ons, guest count, timing, etc."
            />
          </label>
        </section>

        <button
          type="submit"
          disabled={submitting || !eventDate || isBlocked}
          style={{
            padding: "0.9rem 1.1rem",
            fontWeight: 700,
            borderRadius: 12,
            border: "none",
            cursor:
              submitting || !eventDate || isBlocked ? "not-allowed" : "pointer",
            opacity: submitting || !eventDate || isBlocked ? 0.6 : 1,
          }}
        >
          {submitting ? "Submitting…" : "Submit booking request"}
        </button>

        {submitResult && (
          <div
            style={{
              padding: "1rem",
              borderRadius: 12,
              border: `1px solid ${submitResult.ok ? "#b3ffbf" : "#ffb3b3"}`,
              background: submitResult.ok ? "#f3fff5" : "#fff3f3",
            }}
          >
            {submitResult.message}
          </div>
        )}
      </form>

      <footer style={{ marginTop: "2rem", color: "#777" }}>
        <small>
          Note: “Locked” events are deposit-paid bookings. Requests may still be
          reviewed manually and approved by the owner.
        </small>
      </footer>
    </div>
  );
}
