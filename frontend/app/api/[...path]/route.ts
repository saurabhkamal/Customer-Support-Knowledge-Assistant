// Server-side proxy to the FastAPI backend.
//
// The browser calls /api/* on this origin with no credentials. This handler
// attaches X-API-Key from a server-only env var, so the key is never sent to
// the client or baked into the bundle. The backend is not publicly reachable.

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

async function proxy(request: Request) {
  if (!BACKEND_URL || !BACKEND_API_KEY) {
    return Response.json(
      { detail: "Proxy misconfigured: BACKEND_URL or BACKEND_API_KEY is not set" },
      { status: 500 },
    );
  }

  const incoming = new URL(request.url);
  // Taken from the raw pathname rather than the route params, so trailing
  // slashes survive — FastAPI's routes are defined with them.
  const target =
    BACKEND_URL.replace(/\/$/, "") +
    incoming.pathname.replace(/^\/api/, "") +
    incoming.search;

  const headers = new Headers();
  headers.set("X-API-Key", BACKEND_API_KEY);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
