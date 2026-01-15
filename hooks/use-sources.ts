"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffect } from "react";
import { useNotebookGeneration } from "./use-notebook-generation";

export interface Source {
  id: string;
  notebook_id: string;
  title: string;
  type: "pdf" | "text" | "website" | "youtube" | "audio";
  content: string | null;
  summary: string | null;
  url: string | null;
  file_path: string | null;
  file_size: number | null;
  processing_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const useSources = (notebookId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { generateNotebookContentAsync } = useNotebookGeneration();

  const {
    data: sources = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sources", notebookId],
    queryFn: async () => {
      if (!notebookId) return [];

      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .eq("notebook_id", notebookId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Source[];
    },
    enabled: !!notebookId,
    refetchInterval: (query) => {
      // Poll every 2 seconds if any source is still processing
      const data = (query.state.data as Source[]) || [];
      const hasProcessing = data.some(
        (source) =>
          source.processing_status === "pending" ||
          source.processing_status === "uploading" ||
          source.processing_status === "processing"
      );
      return hasProcessing ? 2000 : false;
    },
  });

  // Set up Realtime subscription for sources table
  useEffect(() => {
    if (!notebookId || !user) return;

    console.log(
      "Setting up Realtime subscription for sources table, notebook:",
      notebookId
    );

    const channel = supabase
      .channel("sources-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sources",
          filter: `notebook_id=eq.${notebookId}`,
        },
        (payload) => {
          console.log("Realtime: Sources change received:", payload);

          queryClient.setQueryData(
            ["sources", notebookId],
            (oldSources: Source[] = []) => {
              switch (payload.eventType) {
                case "INSERT":
                  const newSource = payload.new as Source;
                  const existsInsert = oldSources.some(
                    (source) => source.id === newSource?.id
                  );
                  if (existsInsert) {
                    return oldSources;
                  }
                  return [newSource, ...oldSources];

                case "UPDATE":
                  const updatedSource = payload.new as Source;
                  return oldSources.map((source) =>
                    source.id === updatedSource?.id ? updatedSource : source
                  );

                case "DELETE":
                  const deletedSource = payload.old as { id: string };
                  return oldSources.filter(
                    (source) => source.id !== deletedSource?.id
                  );

                default:
                  return oldSources;
              }
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notebookId, user, queryClient, supabase]);

  const addSource = useMutation({
    mutationFn: async (sourceData: {
      notebookId: string;
      title: string;
      type: "pdf" | "text" | "website" | "youtube" | "audio";
      content?: string;
      url?: string;
      file_path?: string;
      file_size?: number;
      processing_status?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("sources")
        .insert({
          notebook_id: sourceData.notebookId,
          title: sourceData.title,
          type: sourceData.type,
          content: sourceData.content,
          url: sourceData.url,
          file_path: sourceData.file_path,
          file_size: sourceData.file_size,
          processing_status: sourceData.processing_status,
          metadata: sourceData.metadata ? JSON.parse(JSON.stringify(sourceData.metadata)) : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (newSource) => {
      console.log("Source added successfully:", newSource);
      
      // The Realtime subscription will handle updating the cache
      // But we still check for first source to trigger generation
      const currentSources = queryClient.getQueryData(["sources", notebookId]) as Source[] | undefined;
      const isFirstSource = !currentSources || currentSources.length === 0;
      
      if (isFirstSource && notebookId) {
        console.log("This is the first source, checking notebook generation status...");
        
        // Check notebook generation status
        const { data: notebook } = await supabase
          .from("notebooks")
          .select("generation_status")
          .eq("id", notebookId)
          .single();
        
        if (notebook?.generation_status === "pending") {
          console.log("Triggering notebook content generation...");
          
          // Determine if we can trigger generation based on source type and available data
          const canGenerate = 
            (newSource.type === "pdf" && newSource.file_path) ||
            (newSource.type === "text" && newSource.content) ||
            (newSource.type === "website" && newSource.url) ||
            (newSource.type === "youtube" && newSource.url) ||
            (newSource.type === "audio" && newSource.file_path);
          
          if (canGenerate) {
            try {
              // For text sources, don't pass filePath - let edge function query database
              // For other sources, pass file_path or url
              const sourceFilePath = (newSource.type === "text") 
                ? undefined 
                : (newSource.file_path || newSource.url);
              
              await generateNotebookContentAsync({
                notebookId,
                filePath: sourceFilePath ?? undefined,
                sourceType: newSource.type,
              });
            } catch (error) {
              console.error("Failed to generate notebook content:", error);
            }
          } else {
            console.log("Source not ready for generation yet - missing required data");
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["sources", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });

  const updateSource = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        title?: string;
        file_path?: string;
        processing_status?: string;
      };
    }) => {
      const { data, error } = await supabase
        .from("sources")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (updatedSource) => {
      // The Realtime subscription will handle updating the cache
      
      // If file_path was added and this is the first source, trigger generation
      if (updatedSource.file_path && notebookId) {
        const currentSources = queryClient.getQueryData(["sources", notebookId]) as Source[] | undefined;
        const isFirstSource = currentSources && currentSources.length === 1;
        
        if (isFirstSource) {
          const { data: notebook } = await supabase
            .from("notebooks")
            .select("generation_status")
            .eq("id", notebookId)
            .single();
          
          if (notebook?.generation_status === "pending") {
            console.log("File path updated, triggering notebook content generation...");
            
            try {
              await generateNotebookContentAsync({
                notebookId,
                filePath: updatedSource.file_path,
                sourceType: updatedSource.type,
              });
            } catch (error) {
              console.error("Failed to generate notebook content:", error);
            }
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["sources", notebookId] });
    },
  });

  return {
    sources,
    isLoading,
    error,
    addSource: addSource.mutate,
    addSourceAsync: addSource.mutateAsync,
    isAdding: addSource.isPending,
    updateSource: updateSource.mutate,
    updateSourceAsync: updateSource.mutateAsync,
    isUpdating: updateSource.isPending,
  };
};
