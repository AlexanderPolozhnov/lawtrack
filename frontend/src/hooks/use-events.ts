import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEvents, addNote } from "@/lib/api";

export function useEvents(clientId: number | undefined) {
  return useQuery({
    queryKey: ["events", clientId],
    queryFn: () => {
      if (clientId === undefined) return [];
      return fetchEvents(clientId);
    },
    enabled: clientId !== undefined,
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, note }: { clientId: number; note: string }) =>
      addNote(clientId, note),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.clientId] });
    },
  });
}
