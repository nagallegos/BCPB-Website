const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);

    // basic validation
    const required = ["full_name", "email", "event_date", "start_time"];
    for (const k of required) {
      if (!data[k]) {
        return { statusCode: 400, body: `Missing field: ${k}` };
      }
    }

    const insert = {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      event_date: data.event_date,
      start_time: data.start_time,
      duration_hours: data.duration_hours || 3,
      event_type: data.event_type || null,
      location: data.location || null,
      notes: data.notes || null,
      status: "requested",
    };

    const { data: created, error } = await supabase
      .from("booking_requests")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;

    // Add audit event
    await supabase.from("booking_status_events").insert({
      booking_request_id: created.id,
      from_status: null,
      to_status: "requested",
      actor: "customer",
      note: "Booking request submitted",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, booking_request_id: created.id }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
