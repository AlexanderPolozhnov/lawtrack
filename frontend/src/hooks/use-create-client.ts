import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/api";

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["statusCounts"] });
    },
  });
}
