"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// Kiểu dữ liệu cho tin nhắn chat
export interface MessageSegment {
  text: string;
  citation_id?: number;
}

export interface Citation {
  citation_id: number;
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_lines_from?: number;
  chunk_lines_to?: number;
  chunk_index?: number;
  excerpt?: string;
  page_number?: number;
}

export interface MessageContent {
  segments: MessageSegment[];
  citations: Citation[];
}

export interface ChatMessageData {
  type: "human" | "ai";
  content: string | MessageContent;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
  tool_calls?: unknown[];
  invalid_tool_calls?: unknown[];
}

export interface EnhancedChatMessage {
  id: number;
  session_id: string;
  message: ChatMessageData;
}

// Kiểu dữ liệu phản hồi AI từ n8n
interface N8nAiResponseContent {
  output: Array<{
    text: string;
    citations?: Array<{
      chunk_index: number;
      chunk_source_id: string;
      chunk_lines_from: number;
      chunk_lines_to: number;
    }>;
  }>;
}

const transformMessage = (
  item: { id: number; session_id: string; message: unknown },
  sourceMap: Map<string, { id: string; title: string; type: string }>
): EnhancedChatMessage => {
  let transformedMessage: ChatMessageData;

  const messageObj = item.message as {
    type?: string;
    content?: string | MessageContent;
    additional_kwargs?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
    tool_calls?: unknown[];
    invalid_tool_calls?: unknown[];
  };

  if (
    messageObj &&
    typeof messageObj === "object" &&
    "type" in messageObj &&
    "content" in messageObj
  ) {
    // Kiểm tra tin nhắn AI có nội dung JSON hay không
    if (messageObj.type === "ai" && typeof messageObj.content === "string") {
      try {
        const parsedContent = JSON.parse(
          messageObj.content
        ) as N8nAiResponseContent;

        if (parsedContent.output && Array.isArray(parsedContent.output)) {
          const segments: MessageSegment[] = [];
          const citations: Citation[] = [];
          let citationIdCounter = 1;

          parsedContent.output.forEach((outputItem) => {
            segments.push({
              text: outputItem.text,
              citation_id:
                outputItem.citations && outputItem.citations.length > 0
                  ? citationIdCounter
                  : undefined,
            });

            if (outputItem.citations && outputItem.citations.length > 0) {
              outputItem.citations.forEach((citation) => {
                const sourceInfo = sourceMap.get(citation.chunk_source_id);
                citations.push({
                  citation_id: citationIdCounter,
                  source_id: citation.chunk_source_id,
                  source_title: sourceInfo?.title || "Unknown Source",
                  source_type: sourceInfo?.type || "pdf",
                  chunk_lines_from: citation.chunk_lines_from,
                  chunk_lines_to: citation.chunk_lines_to,
                  chunk_index: citation.chunk_index,
                  excerpt: `Lines ${citation.chunk_lines_from}-${citation.chunk_lines_to}`,
                });
              });
              citationIdCounter++;
            }
          });

          transformedMessage = {
            type: "ai",
            content: { segments, citations },
            additional_kwargs: messageObj.additional_kwargs,
            response_metadata: messageObj.response_metadata,
            tool_calls: messageObj.tool_calls,
            invalid_tool_calls: messageObj.invalid_tool_calls,
          };
        } else {
          transformedMessage = {
            type: "ai",
            content: messageObj.content,
            additional_kwargs: messageObj.additional_kwargs,
            response_metadata: messageObj.response_metadata,
            tool_calls: messageObj.tool_calls,
            invalid_tool_calls: messageObj.invalid_tool_calls,
          };
        }
      } catch {
        transformedMessage = {
          type: "ai",
          content: messageObj.content,
          additional_kwargs: messageObj.additional_kwargs,
          response_metadata: messageObj.response_metadata,
          tool_calls: messageObj.tool_calls,
          invalid_tool_calls: messageObj.invalid_tool_calls,
        };
      }
    } else {
      transformedMessage = {
        type: messageObj.type === "human" ? "human" : "ai",
        content: (messageObj.content as string | MessageContent) || "Empty message",
        additional_kwargs: messageObj.additional_kwargs,
        response_metadata: messageObj.response_metadata,
        tool_calls: messageObj.tool_calls,
        invalid_tool_calls: messageObj.invalid_tool_calls,
      };
    }
  } else if (typeof item.message === "string") {
    transformedMessage = {
      type: "human",
      content: item.message,
    };
  } else {
    transformedMessage = {
      type: "human",
      content: "Unable to parse message",
    };
  }

  return {
    id: item.id,
    session_id: item.session_id,
    message: transformedMessage,
  };
};

export const useChatMessages = (notebookId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();

  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["chat-messages", notebookId],
    queryFn: async () => {
      if (!notebookId) return [];

      const { data, error } = await supabase
        .from("n8n_chat_histories")
        .select("*")
        .eq("session_id", notebookId)
        .order("id", { ascending: true });

      if (error) throw error;

      // Lấy thêm danh sách nguồn để có tiêu đề đúng
      const { data: sourcesData } = await supabase
        .from("sources")
        .select("id, title, type")
        .eq("notebook_id", notebookId);

      const sourceMap = new Map(sourcesData?.map((s) => [s.id, s]) || []);

      return data.map((item) => transformMessage(item, sourceMap));
    },
    enabled: !!notebookId && !!user,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Đăng ký Realtime cho tin nhắn mới
  useEffect(() => {
    if (!notebookId || !user) return;

    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "n8n_chat_histories",
          filter: `session_id=eq.${notebookId}`,
        },
        async (payload) => {
          console.log("Realtime: New message received:", payload);

          const { data: sourcesData } = await supabase
            .from("sources")
            .select("id, title, type")
            .eq("notebook_id", notebookId);

          const sourceMap = new Map(sourcesData?.map((s) => [s.id, s]) || []);

          const newMessage = transformMessage(
            payload.new as { id: number; session_id: string; message: unknown },
            sourceMap
          );

          queryClient.setQueryData(
            ["chat-messages", notebookId],
            (oldMessages: EnhancedChatMessage[] = []) => {
              const messageExists = oldMessages.some(
                (msg) => msg.id === newMessage.id
              );
              if (messageExists) {
                return oldMessages;
              }
              return [...oldMessages, newMessage];
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notebookId, user, queryClient, supabase]);

  const sendMessage = useMutation({
    mutationFn: async (messageData: {
      notebookId: string;
      role: "user" | "assistant";
      content: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const webhookResponse = await supabase.functions.invoke(
        "send-chat-message",
        {
          body: {
            session_id: messageData.notebookId,
            message: messageData.content,
            user_id: user.id,
          },
        }
      );

      if (webhookResponse.error) {
        throw new Error(`Webhook error: ${webhookResponse.error.message}`);
      }

      return webhookResponse.data;
    },
    onSuccess: () => {
      console.log("Message sent to webhook successfully");
    },
  });

  const deleteChatHistory = useMutation({
    mutationFn: async (notebookId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("n8n_chat_histories")
        .delete()
        .eq("session_id", notebookId);

      if (error) throw error;
      return notebookId;
    },
    onSuccess: (notebookId) => {
      toast({
        title: "Chat history cleared",
        description: "All messages have been deleted successfully.",
      });

      queryClient.setQueryData(["chat-messages", notebookId], []);
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", notebookId],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear chat history. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendMessage: sendMessage.mutate,
    sendMessageAsync: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
    deleteChatHistory: deleteChatHistory.mutate,
    isDeletingChatHistory: deleteChatHistory.isPending,
  };
};
