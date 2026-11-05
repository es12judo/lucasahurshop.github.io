const CATALOG = {
  "web-foundations": {
    title: "The Web Foundations",
    priceEnv: "PRICE_WEB_FOUNDATIONS",
  },
  "first-business": {
    title: "Build Your First Business",
    priceEnv: "PRICE_FIRST_BUSINESS",
  },
};

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  });

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = env.SITE_ORIGIN;
  if (!origin || !allowed || origin !== allowed) return {};
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index), part.slice(index + 1)];
  }));
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !parts.v1) return false;
  const expected = await hmacHex(secret, timestamp + "." + payload);
  // Compare without an early character-by-character exit.
  return parts.v1.length === expected.length &&
    [...expected].reduce((diff, char, i) => diff | (char.charCodeAt(0) ^ parts.v1.charCodeAt(i)), 0) === 0;
}

async function createCheckout(request, env) {
  const body = await request.json().catch(() => null);
  const slug = body?.course;
  const course = CATALOG[slug];
  if (!course) return json({ error: "That course is not available for purchase." }, 400);
  const priceId = env[course.priceEnv];
  if (!priceId) return json({ error: "This course is not configured for checkout yet." }, 503);

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", env.SITE_URL + "/course-success.html");
  params.set("cancel_url", env.SITE_URL + "/#courses");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", slug);
  params.set("metadata[course_slug]", slug);
  params.set("allow_promotion_codes", "true");
  params.set("billing_address_collection", "auto");
  params.set("payment_method_types[0]", "card");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.STRIPE_SECRET_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const session = await response.json();
  if (!response.ok || !session.url) {
    console.error("Stripe checkout creation failed", response.status, session?.error?.type);
    return json({ error: "We couldn't start checkout. Please try again later." }, 502);
  }
  return json({ url: session.url });
}

async function sendAccessEmail(env, email, courseTitle, token) {
  const accessUrl = env.SITE_URL + "/course.html?token=" + encodeURIComponent(token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: "Your Lucasahur Shop course is ready",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#24231f;line-height:1.6">
        <p style="letter-spacing:3px;font-size:11px;color:#9b8051">LUCASAHUR SHOP</p>
        <h1 style="font-family:Georgia,serif;font-weight:normal">${courseTitle}</h1>
        <p>Thank you for your purchase. Your course access is ready.</p>
        <p style="margin:28px 0"><a href="${accessUrl}" style="background:#171612;color:#f5f0e5;padding:14px 20px;text-decoration:none">Open your course</a></p>
        <p>If the button doesn't work, copy this link into your browser:</p>
        <p style="word-break:break-all;font-size:12px">${accessUrl}</p>
        <p style="font-size:12px;color:#777">Keep this email private. Anyone with the access link may be able to open your course.</p>
      </div>`,
      text: `Thank you for purchasing ${courseTitle}. Open your course here: ${accessUrl}\n\nKeep this email private because the link grants access.`,
    }),
  });
  if (!response.ok) {
    console.error("Resend delivery failed", response.status);
    throw new Error("Email delivery failed");
  }
}

async function handleWebhook(request, env) {
  const payload = await request.text();
  const valid = await verifyStripeSignature(
    payload, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET
  );
  if (!valid) return json({ error: "Invalid webhook signature." }, 400);

  let event;
  try { event = JSON.parse(payload); } catch { return json({ error: "Invalid event." }, 400); }
  if (event.type !== "checkout.session.completed") return json({ received: true });

  const session = event.data?.object;
  if (session?.payment_status !== "paid" || session?.mode !== "payment") return json({ received: true });

  const slug = session.metadata?.course_slug;
  const course = CATALOG[slug];
  const email = session.customer_details?.email;
  if (!course || !email || !session.id) {
    console.error("Paid session missing expected course or customer details", session?.id);
    return json({ error: "Purchase details were incomplete." }, 400);
  }

  // Derive a stable bearer token for this Stripe session so webhook retries can safely resend it.
  const token = await hmacHex(env.TOKEN_SECRET, "lucasahur-course:" + session.id);
  const tokenHash = await sha256(token);
  await env.DB.prepare(`
    INSERT INTO course_access (stripe_session_id, course_slug, customer_email, token_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(stripe_session_id) DO NOTHING
  `).bind(session.id, slug, email.toLowerCase(), tokenHash, new Date().toISOString()).run();

  const existing = await env.DB.prepare(
    "SELECT email_sent_at, token_hash FROM course_access WHERE stripe_session_id = ?"
  ).bind(session.id).first();
  if (!existing || existing.token_hash !== tokenHash) return json({ error: "Access record could not be confirmed." }, 500);

  if (!existing.email_sent_at) {
    await sendAccessEmail(env, email, course.title, token);
    await env.DB.prepare(
      "UPDATE course_access SET email_sent_at = ? WHERE stripe_session_id = ? AND email_sent_at IS NULL"
    ).bind(new Date().toISOString(), session.id).run();
  }
  return json({ received: true });
}

async function getCourse(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token.length > 256) return json({ error: "A valid access link is required." }, 401);
  const tokenHash = await sha256(token);
  const access = await env.DB.prepare(
    "SELECT course_slug FROM course_access WHERE token_hash = ? AND revoked_at IS NULL"
  ).bind(tokenHash).first();
  if (!access || !CATALOG[access.course_slug]) return json({ error: "This access link is invalid or has been revoked." }, 403);

  const lessons = await env.DB.prepare(
    "SELECT id, title, content, sort_order FROM lessons WHERE course_slug = ? ORDER BY sort_order ASC"
  ).bind(access.course_slug).all();
  return json({
    course: { slug: access.course_slug, title: CATALOG[access.course_slug].title },
    lessons: lessons.results || [],
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Max-Age": "86400" } });
    }
    if (url.pathname === "/api/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }
    if (url.pathname === "/api/checkout" && request.method === "POST") {
      if (!cors["Access-Control-Allow-Origin"]) return json({ error: "Origin not allowed." }, 403);
      if (!env.STRIPE_SECRET_KEY || !env.SITE_URL) return json({ error: "Checkout is not configured." }, 503, cors);
      const result = await createCheckout(request, env);
      return new Response(result.body, { status: result.status, headers: { ...Object.fromEntries(result.headers), ...cors } });
    }
    if (url.pathname === "/api/course" && request.method === "GET") {
      if (!cors["Access-Control-Allow-Origin"]) return json({ error: "Origin not allowed." }, 403);
      const result = await getCourse(request, env);
      return new Response(result.body, { status: result.status, headers: { ...Object.fromEntries(result.headers), ...cors } });
    }
    if (url.pathname === "/health") return json({ status: "ok", service: "Lucasahur Shop course API" });
    return json({ error: "Not found." }, 404);
  },
};
