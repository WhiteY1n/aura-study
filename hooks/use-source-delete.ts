"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";

export const useSourceDelete = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const deleteSource = useMutation({
    mutationFn: async (sourceId: string) => {
      console.log("Starting source deletion process for:", sourceId);

      try {
        // First, get the source details including file information
        const { data: source, error: fetchError } = await supabase
          .from("sources")
          .select("id, title, file_path, type, notebook_id")
          .eq("id", sourceId)
          .single();

        if (fetchError) {
          console.error("Error fetching source:", fetchError);
          throw new Error("Failed to find source");
        }

        console.log(
          "Found source to delete:",
          source.title,
          "with file_path:",
          source.file_path
        );

        // Delete the file from storage if it exists
        if (source.file_path) {
          console.log("Deleting file from storage:", source.file_path);

          const { error: storageError } = await supabase.storage
            .from("sources")
            .remove([source.file_path]);

          if (storageError) {
            console.error("Error deleting file from storage:", storageError);
          } else {
            console.log("File deleted successfully from storage");
          }
        }

        // Delete the source record from the database
        const { error: deleteError } = await supabase
          .from("sources")
          .delete()
          .eq("id", sourceId);

        if (deleteError) {
          console.error("Error deleting source from database:", deleteError);
          throw deleteError;
        }

        console.log("Source deleted successfully from database");
        return source;
      } catch (error) {
        console.error("Error in source deletion process:", error);
        throw error;
      }
    },
    onSuccess: (deletedSource) => {
      console.log("Delete mutation success, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({
        queryKey: ["sources", deletedSource.notebook_id],
      });
      toast({
        title: "Source deleted",
        description: `"${deletedSource?.title || "Source"}" has been successfully deleted.`,
      });
    },
    onError: (error: Error) => {
      console.error("Delete mutation error:", error);

      let errorMessage = "Failed to delete the source. Please try again.";

      if (error?.message?.includes("not found")) {
        errorMessage =
          "Source not found or you don't have permission to delete it.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  return {
    deleteSource: deleteSource.mutate,
    deleteSourceAsync: deleteSource.mutateAsync,
    isDeleting: deleteSource.isPending,
  };
};
