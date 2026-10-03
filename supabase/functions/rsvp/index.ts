import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      {
        success: false,
        error: "METHOD_NOT_ALLOWED",
      },
      { status: 405 },
    );
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        success: false,
        error: "INVALID_JSON",
      },
      { status: 400 },
    );
  }

  // Name
  if (
    typeof body.name !== "string" ||
    body.name.trim() === ""
  ) {
    return Response.json(
      {
        success: false,
        error: "INVALID_NAME",
      },
      { status: 400 },
    );
  }

  // Email
  if (
    typeof body.email !== "string" ||
    body.email.trim() === ""
  ) {
    return Response.json(
      {
        success: false,
        error: "INVALID_EMAIL",
      },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return Response.json(
      {
        success: false,
        error: "INVALID_EMAIL",
      },
      { status: 400 },
    );
  }

  // Attendance
  if (typeof body.attendance !== "boolean") {
    return Response.json(
      {
        success: false,
        error: "INVALID_ATTENDANCE",
      },
      { status: 400 },
    );
  }

  // Companions
  if (
    !Number.isInteger(body.companions) ||
    body.companions < 0 ||
    body.companions > 15
  ) {
    return Response.json(
      {
        success: false,
        error: "INVALID_COMPANIONS",
      },
      { status: 400 },
    );
  }

  // Business rule:
  // If the guest will not attend, companions must be 0.
  const companions = body.attendance
    ? body.companions
    : 0;

  const name = body.name.trim();

  console.log({
    name,
    email,
    attendance: body.attendance,
    companions,
  });

  return Response.json({
    success: true,
  });
});