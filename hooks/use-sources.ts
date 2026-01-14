"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffect } from "react";

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
    onSuccess: () => {
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
    onSuccess: () => {
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
