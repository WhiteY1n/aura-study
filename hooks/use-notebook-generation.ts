"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useNotebookGeneration = () => {
  const { toast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const generateNotebookContent = useMutation({
    mutationFn: async ({
      notebookId,
      filePath,
      sourceType,
    }: {
      notebookId: string;
      filePath?: string;
      sourceType: string;
    }) => {
      console.log("Generating notebook content:", {
        notebookId,
        filePath,
        sourceType,
      });

      const { data, error } = await supabase.functions.invoke(
        "generate-notebook-content",
        {
          body: {
            notebookId,
            filePath,
            sourceType,
          },
        }
      );

      if (error) {
        console.error("Notebook generation error:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      console.log("Notebook content generated successfully:", data);
      
      // Invalidate notebook queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["notebook", variables.notebookId] });
      
      if (data?.title) {
        toast({
          title: "Content Generated",
          description: `Notebook titled: "${data.title}"`,
        });
      }
    },
    onError: (error) => {
      console.error("Failed to generate notebook content:", error);
      // Don't show error toast - this is optional functionality
    },
  });

  return {
    generateNotebookContent: generateNotebookContent.mutate,
    generateNotebookContentAsync: generateNotebookContent.mutateAsync,
    isGenerating: generateNotebookContent.isPending,
  };
};
