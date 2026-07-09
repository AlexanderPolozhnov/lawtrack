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
