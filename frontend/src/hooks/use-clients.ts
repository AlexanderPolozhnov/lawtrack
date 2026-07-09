import { useQuery } from "@tanstack/react-query";
import { fetchClients } from "@/lib/api";
import { ClientStatus } from "@/lib/types";

export function useClients(statusFilter: ClientStatus | "ALL", searchQuery: string) {
  return useQuery({
    queryKey: ["clients", statusFilter, searchQuery],
    queryFn: () =>
      fetchClients({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: searchQuery || undefined,
      }),
    retry: 1,
  });
}
