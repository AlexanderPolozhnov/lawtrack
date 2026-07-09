import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClientStatus } from "@/lib/api";
import { Client, ClientStatus } from "@/lib/types";

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ClientStatus }) =>
      updateClientStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["clients"] });

      // Snapshot the previous values
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: ["clients"] });
      
      const previousQueriesData = queries.map((query) => ({
        queryKey: query.queryKey,
        data: query.state.data,
      }));

      // Optimistically update to the new value in all matched queries
      queries.forEach((query) => {
        const queryKey = query.queryKey;
        queryClient.setQueryData<Client[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((client) => {
            if (client.id === id) {
              let statusDisplayName = client.statusDisplayName;
              if (status === "NEW") statusDisplayName = "Новый";
              else if (status === "IN_PROGRESS") statusDisplayName = "В работе";
              else if (status === "CLOSED") statusDisplayName = "Закрыт";

              return {
                ...client,
                status,
                statusDisplayName,
              };
            }
            return client;
          });
        });
      });

      // Return a context object with the snapshotted value
      return { previousQueriesData };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousQueriesData) {
        context.previousQueriesData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // Always refetch after success or failure:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["statusCounts"] });
    },
  });
}
