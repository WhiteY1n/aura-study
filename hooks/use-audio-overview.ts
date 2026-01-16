"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAudioOverview = (notebookId?: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Đăng ký realtime cho cập nhật notebook
  useEffect(() => {
    if (!notebookId) return;

    const channel = supabase
      .channel("notebook-audio-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notebooks",
          filter: `id=eq.${notebookId}`,
        },
        (payload) => {
          console.log("Notebook updated:", payload);
          const newData = payload.new as {
            audio_overview_generation_status?: string;
            audio_overview_url?: string;
          };

          if (newData.audio_overview_generation_status) {
            setGenerationStatus(newData.audio_overview_generation_status);

            if (
              newData.audio_overview_generation_status === "completed" &&
              newData.audio_overview_url
            ) {
              setIsGenerating(false);
              toast({
                title: "Audio Overview Ready!",
                description: "Your deep dive conversation is ready to play!",
              });

              // Invalidate query để làm mới UI
              queryClient.invalidateQueries({ queryKey: ["notebooks"] });
            } else if (newData.audio_overview_generation_status === "failed") {
              setIsGenerating(false);
              toast({
                title: "Generation Failed",
                description:
                  "Failed to generate audio overview. Please try again.",
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notebookId, toast, queryClient, supabase]);

  const generateAudioOverview = useMutation({
    mutationFn: async (notebookId: string) => {
      setIsGenerating(true);
      setGenerationStatus("generating");

      const { data, error } = await supabase.functions.invoke(
        "generate-audio-overview",
        {
          body: { notebookId },
        }
      );

      if (error) {
        console.error("Error starting audio generation:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log("Audio generation started successfully:", data);
    },
    onError: (error) => {
      console.error("Audio generation failed to start:", error);
      setIsGenerating(false);
      setGenerationStatus(null);

      toast({
        title: "Failed to Start Generation",
        description:
          (error as Error).message ||
          "Failed to start audio generation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const refreshAudioUrl = useMutation({
    mutationFn: async ({
      notebookId,
      silent = false,
    }: {
      notebookId: string;
      silent?: boolean;
    }) => {
      if (!silent) {
        setIsAutoRefreshing(true);
      }

      const { data, error } = await supabase.functions.invoke(
        "refresh-audio-url",
        {
          body: { notebookId },
        }
      );

      if (error) {
        console.error("Error refreshing audio URL:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      console.log("Audio URL refreshed successfully:", data);
      // Invalidate query để cập nhật URL mới trên UI
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });

      if (!variables.silent) {
        setIsAutoRefreshing(false);
      }
    },
    onError: (error, variables) => {
      console.error("Failed to refresh audio URL:", error);
      if (!variables.silent) {
        setIsAutoRefreshing(false);
        toast({
          title: "Failed to Refresh URL",
          description: "Unable to refresh the audio URL. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const checkAudioExpiry = (expiresAt: string | null): boolean => {
    if (!expiresAt) return true;
    return new Date(expiresAt) <= new Date();
  };

  const autoRefreshIfExpired = async (
    notebookId: string,
    expiresAt: string | null
  ) => {
    if (
      checkAudioExpiry(expiresAt) &&
      !isAutoRefreshing &&
      !refreshAudioUrl.isPending
    ) {
      console.log("Audio URL expired, auto-refreshing...");
      try {
        await refreshAudioUrl.mutateAsync({ notebookId, silent: true });
      } catch (error) {
        console.error("Auto-refresh failed:", error);
      }
    }
  };

  return {
    generateAudioOverview: generateAudioOverview.mutate,
    refreshAudioUrl: (notebookId: string) =>
      refreshAudioUrl.mutate({ notebookId }),
    autoRefreshIfExpired,
    isGenerating: isGenerating || generateAudioOverview.isPending,
    isAutoRefreshing,
    generationStatus,
    checkAudioExpiry,
  };
};
