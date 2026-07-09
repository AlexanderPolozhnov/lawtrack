import { Client, StatusCounts } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function fetchClients(params?: { status?: string; search?: string }): Promise<Client[]> {
  const url = new URL(`${API_BASE_URL}/api/clients`);
  if (params?.status) {
    url.searchParams.append("status", params.status);
  }
  if (params?.search) {
    url.searchParams.append("search", params.search);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch clients: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchStatusCounts(): Promise<StatusCounts> {
  const response = await fetch(`${API_BASE_URL}/api/stats/status-counts`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch status counts: ${response.statusText}`);
  }

  return response.json();
}
