/**
 * Centralized API client for frontend fetch calls.
 * Provides consistent error handling and request formatting.
 */

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || 'Request failed');
  }

  return response.json();
}

export const apiClient = {
  get: <T = any>(url: string) =>
    fetchApi<T>(url),

  post: <T = any>(url: string, body?: any) =>
    fetchApi<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(url: string, body?: any) =>
    fetchApi<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(url: string, body?: any) =>
    fetchApi<T>(url, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    }),
};
