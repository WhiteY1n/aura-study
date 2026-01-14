"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSourceUpdate = () => {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { toast } = useToast();

  const updateSource = useMutation({
    mutationFn: async ({
      sourceId,
      title,
    }: {
      sourceId: string;
      title: string;
    }) => {
      const { data, error } = await supabase
        .from("sources")
        .update({ title })
        .eq("id", sourceId)
        .select()
        .single();

      if (error) {
        console.error("Error updating source:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast({
        title: "Source renamed",
        description: "The source has been successfully renamed.",
      });
    },
    onError: (error) => {
      console.error("Update mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to rename the source. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    updateSource: updateSource.mutate,
    isUpdating: updateSource.isPending,
  };
};
