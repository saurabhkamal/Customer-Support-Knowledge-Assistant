// Calls go to this app's own /api/* route handler, which attaches the backend
// API key server-side. No credentials are present in client code.

export async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
