import { Client, ClientStatus, StatusCounts, ClientEvent } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

/**
 * Returns standard headers including the optional X-Admin-Token if configured.
 */
const getHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (ADMIN_TOKEN) {
    headers["X-Admin-Token"] = ADMIN_TOKEN;
  }
  return headers;
};

export async function fetchClients(params?: { status?: string; search?: string }): Promise<Client[]> {
  const url = new URL(`${API_BASE_URL}/api/clients`);
  if (params?.status) {
    url.searchParams.append("status", params.status);
  }
  if (params?.search) {
    url.searchParams.append("search", params.search);
  }

  const response = await fetch(url.toString(), {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch clients: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchStatusCounts(): Promise<StatusCounts> {
  const response = await fetch(`${API_BASE_URL}/api/stats/status-counts`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch status counts: ${response.statusText}`);
  }

  return response.json();
}

export async function createClient(clientData: {
  name: string;
  phone: string;
  caseDescription?: string;
  deadline?: string;
}): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/api/clients`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(clientData),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to create client: ${response.statusText}`);
  }

  return response.json();
}

export async function updateClientStatus(id: number, status: ClientStatus): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/api/clients/${id}/status`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to update status: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchEvents(id: number): Promise<ClientEvent[]> {
  const response = await fetch(`${API_BASE_URL}/api/clients/${id}/events`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  return response.json();
}

export async function addNote(id: number, note: string): Promise<ClientEvent> {
  const response = await fetch(`${API_BASE_URL}/api/clients/${id}/notes`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ note }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to add note: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteClient(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to delete client: ${response.statusText}`);
  }
}
