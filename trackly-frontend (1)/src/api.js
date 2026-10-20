
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

export function getToken() {
  return localStorage.getItem("trackly_token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("trackly_token", token);
  } else {
    localStorage.removeItem("trackly_token");
  }
}

export async function api(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...options,
        headers,
        body:
          options.body && typeof options.body !== "string"
            ? JSON.stringify(options.body)
            : options.body,
      }
    );
  } catch {
    throw new Error(
      `Tidak bisa terhubung ke backend (${API_URL}). Pastikan server Express berjalan.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload
        ? payload.message || payload.error || payload.msg
        : payload;

    throw new Error(message || `Request gagal (${response.status})`);
  }

  return payload;
}

export function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export function pickToken(payload) {
  return (
    payload?.token ??
    payload?.accessToken ??
    payload?.access_token ??
    payload?.data?.token ??
    payload?.data?.accessToken ??
    payload?.data?.access_token ??
    payload?.data?.user?.token ??
    payload?.user?.token ??
    null
  );
}
