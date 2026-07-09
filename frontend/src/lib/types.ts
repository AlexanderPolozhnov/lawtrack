export type ClientStatus = "NEW" | "IN_PROGRESS" | "CLOSED";

export interface Client {
  id: number;
  name: string;
  phone: string;
  status: ClientStatus;
  statusDisplayName: string;
  caseDescription?: string;
  deadline?: string;
  createdAt: string;
}

export interface StatusCounts {
  newCount: number;
  inProgressCount: number;
  closedCount: number;
  total: number;
}

export type ClientEventType = "CREATED" | "STATUS_CHANGED" | "NOTE_ADDED";

export interface ClientEvent {
  id: number;
  clientId: number;
  eventType: ClientEventType;
  description: string;
  createdAt: string;
}
