"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, StickyNote, RefreshCw, Loader2, Copy, Check, BookmarkPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/project/chat-input";
import { MarkdownRenderer, type Citation } from "@/components/chat/markdown-renderer";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNotes } from "@/hooks/use-notes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | { segments: Array<{ text: string; citation_id?: number }>; citations: Citation[] };
  timestamp: string;
}

interface ChatPanelProps {
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  exampleQuestions?: string[];
  onClearChat?: () => void;
  isDeletingChatHistory?: boolean;
  onCitationClick?: (citation: Citation) => void;
  notebookId?: string;
  notebook?: {
    title?: string;
    description?: string;
    icon?: string;
    generation_status?: string;
  };
  sourceCount?: number;
  pendingUserMessage?: string | null;
  showAiLoading?: boolean;
  onQuestionClick?: (question: string) => void;
}

export function ChatPanel({
  messages,
  isTyping,
  onSendMessage,
  disabled = false,
  exampleQuestions = [],
  onClearChat,
  isDeletingChatHistory = false,
  onCitationClick,
  notebookId,
  notebook,
  sourceCount = 0,
  pendingUserMessage = null,
  showAiLoading = false,
  onQuestionClick,
}: ChatPanelProps) {
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages update or when typing
  useEffect(() => {
    if (latestMessageRef.current && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        setTimeout(() => {
          latestMessageRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }, 50);
      }
    }
  }, [messages.length, isTyping, pendingUserMessage, showAiLoading]);

  return (
    <div className="flex flex-col h-full min-w-0 border-l border-border/60 dark:border-border/40 shadow-inner overflow-hidden">
      {/* Header with Clear Chat button */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">Chat</span>
        </div>

        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground gap-2"
                disabled={isDeletingChatHistory}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isDeletingChatHistory ? "animate-spin" : ""}`}
                />
                <span>
                  {isDeletingChatHistory ? "Clearing..." : "Clear Chat"}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will delete all messages in this conversation.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingChatHistory}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onClearChat?.()}
                  disabled={isDeletingChatHistory}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeletingChatHistory ? "Clearing..." : "Clear"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Messages Area - Scrollable with ScrollArea */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
        <div className="px-6 py-4 max-w-4xl mx-auto">
          {/* Document Summary Section */}
          {notebook && (
            <div className="mb-8 pb-6 border-b border-border/50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 flex items-center justify-center">
                  {notebook.generation_status === "generating" ? (
                    <Loader2 className="h-8 w-8 text-foreground animate-spin" />
                  ) : (
                    <span className="text-4xl leading-none">
                      {notebook.icon || "📝"}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">
                    {notebook.generation_status === "generating"
                      ? "Generating content..."
                      : notebook.title || "Untitled Notebook"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {sourceCount} source{sourceCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                {notebook.generation_status === "generating" ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <p className="text-sm">
                      AI is analyzing your source and generating a title and
                      description...
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-foreground leading-relaxed">
                    {notebook.description ? (
                      <MarkdownRenderer
                        content={notebook.description}
                        isUserMessage={false}
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        No description available for this notebook.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Messages or Empty State */}
          {messages.length === 0 && !pendingUserMessage && !showAiLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <StickyNote className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Start a conversation
              </h2>
              <p className="text-muted-foreground max-w-md">
                Ask questions about your sources or use the suggestions below to
                get started.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <ChatMessageWithSave
                  key={message.id}
                  message={message}
                  onCitationClick={onCitationClick}
                  notebookId={notebookId}
                />
              ))}
              {/* Pending user message */}
              {pendingUserMessage && (
                <div className="flex justify-end">
                  <Card className="max-w-xs lg:max-w-md rounded-lg shadow-sm bg-primary text-primary-foreground">
                    <div className="px-4 py-2">
                      <div className="text-sm leading-relaxed">
                        <MarkdownRenderer
                          content={pendingUserMessage}
                          isUserMessage={true}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              )}
              {/* AI Loading Indicator */}
              {showAiLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-muted rounded-lg">
                    <motion.span
                      className="w-2 h-2 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0,
                      }}
                    />
                    <motion.span
                      className="w-2 h-2 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.1,
                      }}
                    />
                    <motion.span
                      className="w-2 h-2 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.2,
                      }}
                    />
                  </div>
                </div>
              )}
              {/* Scroll target */}
              <div ref={latestMessageRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input - Fixed at bottom */}
      <div className="flex-shrink-0 bg-background border-t border-border/60 dark:border-border/40">
        <ChatInput
          onSend={onSendMessage}
          disabled={disabled || isTyping || !!pendingUserMessage}
          exampleQuestions={exampleQuestions}
          pendingUserMessage={pendingUserMessage}
          showAiLoading={showAiLoading}
          onQuestionClick={onQuestionClick}
        />
      </div>
    </div>
  );
}

function ChatMessageWithSave({
  message,
  onCitationClick,
  notebookId,
}: {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
  notebookId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { createNote } = useNotes(notebookId);
  const isUser = message.role === "user";

  const getContentString = () => {
    return typeof message.content === "string"
      ? message.content
      : message.content?.segments?.map((s) => s.text).join("") || "";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContentString());
    setCopied(true);
    toast({
      title: "Copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToNote = async () => {
    if (!notebookId) {
      toast({
        title: "Cannot save note",
        description: "No notebook selected",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const content = getContentString();
      // Generate a title from first line or first 50 chars
      const firstLine = content.split("\n")[0] || content;
      const title = firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine;

      await createNote({
        title: title.replace(/^#+\s*/, ""), // Remove markdown headers from title
        content,
      });

      toast({
        title: "Saved to notes",
        description: "Response has been saved to your notes",
      });
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "Could not save to notes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <Card className="max-w-xs lg:max-w-md rounded-lg shadow-sm bg-primary text-primary-foreground">
          <div className="px-4 py-2">
            <div className="text-sm leading-relaxed">
              <MarkdownRenderer
                content={message.content}
                isUserMessage={true}
                onCitationClick={onCitationClick}
              />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full group">
        <div className="text-sm leading-relaxed text-foreground">
          <MarkdownRenderer
            content={message.content}
            isUserMessage={false}
            onCitationClick={onCitationClick}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveToNote}
            disabled={saving}
            className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">Save to note</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
