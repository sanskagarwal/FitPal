// Low-level REST client shared by the remote data source and the auth helpers.
// `credentials: 'include'` sends the httpOnly auth cookie so the server can
// authenticate the request and enforce per-user ownership.

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// A failed API call. Carries the HTTP status and the server-provided error
// message (when present) so callers can distinguish error kinds and surface a
// meaningful message instead of a generic "API call failed".
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Read the server's error message from a non-OK response body, falling back to
// the status text. Mirrors the auth/AI clients so error handling is uniform.
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data?.error) return data.error;
  } catch {
    // No/invalid JSON body - fall through to the status text.
  }
  return response.statusText || 'Request failed';
}

// Helper function for API calls. `credentials: 'include'` sends the httpOnly
// auth cookie so the server can authenticate the request and enforce ownership.
export async function apiCall(endpoint: string, method: string = 'GET', body?: unknown) {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status, endpoint);
  }

  return await response.json();
}
