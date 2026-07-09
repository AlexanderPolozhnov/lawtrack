import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteClient } from "@/lib/api";

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["statusCounts"] });
    },
  });
}
