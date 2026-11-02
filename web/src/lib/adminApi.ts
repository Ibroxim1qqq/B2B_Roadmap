import { parseResponse } from './api';

/** Calls an admin endpoint and turns any failure into an Error carrying the server's message. */
async function request(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`/api/admin/${path}`, {
    method,
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await parseResponse(res);
  if (!json.success) throw new Error(json.error || "So'rov bajarilmadi");
  return json;
}

const query = (params: Record<string, string>) => new URLSearchParams(params).toString();

export const adminApi = {
  list: async (resource: string, params: Record<string, string> = {}) => request('GET', `${resource}?${query(params)}`),
  create: (resource: string, body: unknown) => request('POST', resource, body),
  update: (resource: string, body: unknown) => request('PATCH', resource, body),
  remove: (resource: string, params: Record<string, string>) => request('DELETE', `${resource}?${query(params)}`)
};
