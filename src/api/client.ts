export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL as string;
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}
