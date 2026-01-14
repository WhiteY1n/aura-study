"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";

export const useNotebookDelete = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const deleteNotebook = useMutation({
    mutationFn: async (notebookId: string) => {
      console.log("Starting notebook deletion process for:", notebookId);

      try {
        // First, get the notebook details for better error reporting
        const { data: notebook, error: fetchError } = await supabase
          .from("notebooks")
          .select("id, title")
          .eq("id", notebookId)
          .single();

        if (fetchError) {
          console.error("Error fetching notebook:", fetchError);
          throw new Error("Failed to find notebook");
        }

        console.log("Found notebook to delete:", notebook.title);

        // Get all sources for this notebook to delete their files
        const { data: sources, error: sourcesError } = await supabase
          .from("sources")
          .select("id, title, file_path, type")
          .eq("notebook_id", notebookId);

        if (sourcesError) {
          console.error("Error fetching sources for notebook:", sourcesError);
          throw new Error("Failed to fetch sources for cleanup");
        }

        console.log(`Found ${sources?.length || 0} sources to clean up`);

        // Delete all files from storage for sources that have file_path
        const filesToDelete =
          sources
            ?.filter((source) => source.file_path)
            .map((source) => source.file_path) || [];

        if (filesToDelete.length > 0) {
          console.log("Deleting files from storage:", filesToDelete);

          const { error: storageError } = await supabase.storage
            .from("sources")
            .remove(filesToDelete as string[]);

          if (storageError) {
            console.error("Error deleting files from storage:", storageError);
          } else {
            console.log("All files deleted successfully from storage");
          }
        }

        // Delete the notebook - this will cascade delete all sources
        const { error: deleteError } = await supabase
          .from("notebooks")
          .delete()
          .eq("id", notebookId);

        if (deleteError) {
          console.error("Error deleting notebook:", deleteError);
          throw deleteError;
        }

        console.log("Notebook deleted successfully with cascade deletion");
        return notebook;
      } catch (error) {
        console.error("Error in deletion process:", error);
        throw error;
      }
    },
    onSuccess: (deletedNotebook, notebookId) => {
      console.log("Delete mutation success, invalidating queries");

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["notebooks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["sources", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });

      toast({
        title: "Notebook deleted",
        description: `"${deletedNotebook?.title || "Notebook"}" and all its sources have been successfully deleted.`,
      });
    },
    onError: (error: Error) => {
      console.error("Delete mutation error:", error);

      toast({
        title: "Failed to delete",
        description: error.message || "Failed to delete the notebook. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    deleteNotebook: deleteNotebook.mutate,
    isDeleting: deleteNotebook.isPending,
  };
};
