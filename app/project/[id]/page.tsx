"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Moon,
  Sun,
  CloudUpload,
  Settings,
  LogOut,
} from "lucide-react";
import { SourcePanel, type Source } from "@/components/viewer/source-panel";
import { ChatPanel, type Message } from "@/components/viewer/chat-panel";
import { MobileTabs } from "@/components/viewer/mobile-tabs";
import { AddSourceDialog } from "@/components/sources/add-source-dialog";
import { StudioPanel, StudioSheet, StudioContent } from "@/components/project/studio-panel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/components/providers/auth-provider";
import { useNotebooks } from "@/hooks/use-notebooks";
import { useSources } from "@/hooks/use-sources";
import { useSourceDelete } from "@/hooks/use-source-delete";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import type { Citation } from "@/components/chat/markdown-renderer";

export default function ProjectView() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { setTheme, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { notebooks, isLoading: notebooksLoading } = useNotebooks();
  const { sources: sourcesData, isLoading: sourcesLoading } = useSources(id);
  const { deleteSource } = useSourceDelete();
  const {
    messages: chatMessages,
    sendMessage,
    isSending,
    deleteChatHistory,
    isDeletingChatHistory,
  } = useChatMessages(id);

  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>();
  const [selectedSourceForViewing, setSelectedSourceForViewing] =
    useState<Source | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null
  );
  const [showAiLoading, setShowAiLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [highlightedCitation, setHighlightedCitation] = useState<Citation & { clickedAt?: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<"sources" | "chat" | "studio">("chat");

  const project = notebooks?.find((nb) => nb.id === id);
  const isLoading = notebooksLoading || sourcesLoading;

  // Debug: Log notebook data when it changes
  useEffect(() => {
    if (project) {
      console.log("ProjectView - Current notebook data:", {
        id: project.id,
        title: project.title,
        description: project.description,
        generation_status: project.generation_status,
      });
    }
  }, [project]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update document title
  useEffect(() => {
    if (project?.title) {
      document.title = `${project.title} | Aura Notebook`;
    } else {
      document.title = "Aura Notebook | Project";
    }
  }, [project?.title]);

  const sources: Source[] = (sourcesData || []).map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type as Source["type"],
    content: s.content ?? undefined,
    summary: s.summary ?? undefined,
    url: s.url ?? undefined,
    processing_status: s.processing_status ?? undefined,
  }));

  // Load user avatar
  useEffect(() => {
    const loadUserAvatar = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (!error && data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (error) {
        console.error("Error loading avatar:", error);
      }
    };

    loadUserAvatar();
  }, [user?.id, supabase]);

  // Transform chat messages to Message format for ChatPanel
  const messages: Message[] = (chatMessages || []).map((msg, index) => {
    const isUser = msg.message.type === "human";

    return {
      id: msg.id?.toString() || index.toString(),
      role: isUser ? "user" : "assistant",
      content: msg.message.content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });

  // Track message count to clear pending message when new messages arrive
  const [lastMessageCount, setLastMessageCount] = useState(0);

  useEffect(() => {
    if (
      chatMessages &&
      chatMessages.length > lastMessageCount &&
      pendingUserMessage
    ) {
      setPendingUserMessage(null);
      setShowAiLoading(false);
    }
    setLastMessageCount(chatMessages?.length || 0);
  }, [chatMessages, lastMessageCount, pendingUserMessage]);

  // Handle notebook not found
  useEffect(() => {
    if (!notebooksLoading && !project && id) {
      const timeoutId = setTimeout(() => {
        const currentProject = notebooks?.find((nb) => nb.id === id);
        if (!currentProject) {
          toast({
            title: "Notebook not found",
            description: "The notebook you're looking for doesn't exist",
            variant: "destructive",
          });
          router.push("/dashboard");
        }
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [notebooksLoading, project, id, router, toast, notebooks]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!id) return;

      try {
        setPendingUserMessage(content);

        await sendMessage({
          notebookId: id,
          role: "user",
          content: content,
        });

        setShowAiLoading(true);
      } catch (error: unknown) {
        console.error("Failed to send message:", error);
        setPendingUserMessage(null);
        setShowAiLoading(false);
        toast({
          title: "Failed to send message",
          description:
            error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      }
    },
    [id, sendMessage, toast]
  );

  const handleSourceAdded = useCallback(() => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: ["sources", id] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["notebook", id] });
    }
  }, [id, queryClient]);

  const handleSelectSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
  };

  const handleRemoveSource = async (sourceId: string) => {
    try {
      await deleteSource(sourceId);
      if (selectedSourceId === sourceId) {
        setSelectedSourceId(undefined);
      }
      toast({
        title: "Source deleted",
        description: "The source has been removed successfully",
      });
    } catch (error: unknown) {
      console.error("Error deleting source:", error);
      toast({
        title: "Error deleting source",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleClearChat = async () => {
    if (!id) return;
    deleteChatHistory(id);
  };

  const handleCitationClick = (citation: Citation) => {
    const source = sources.find((s) => s.id === citation.source_id);
    if (source) {
      setSelectedSourceId(source.id);
      setSelectedSourceForViewing(source);
      setHighlightedCitation({
        ...citation,
        clickedAt: Date.now(), // Force re-trigger on mobile
      });
    }
  };

  const handleSourceViewerChange = (source: Source | null) => {
    setSelectedSourceForViewing(source);
    if (!source) {
      setHighlightedCitation(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "user@example.com";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasSources = sources.length > 0;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            <h1 className="font-semibold text-foreground truncate">
              {project?.title || "Loading..."}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="text-muted-foreground hover:text-foreground"
              >
                {mounted ? (
                  isDark ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )
                ) : (
                  <Sun className="h-5 w-5 opacity-0" />
                )}
              </Button>
            </motion.div>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={avatarUrl || undefined} alt={userName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="flex items-center cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => setShowLogoutDialog(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Nội dung chính - Desktop */}
      <div className="flex-1 hidden lg:flex overflow-hidden">
        {/* Panel nguồn (trái) */}
        <div className="flex h-full">
          <SourcePanel
            sources={sources}
            onSelectSource={handleSelectSource}
            selectedSourceId={selectedSourceId}
            selectedSourceForViewing={selectedSourceForViewing}
            onSourceViewerChange={handleSourceViewerChange}
            projectId={id || ""}
            notebookId={id}
            onSourceAdded={handleSourceAdded}
            onAddSourceClick={() => setAddDialogOpen(true)}
            highlightedCitation={highlightedCitation}
          />
        </div>

        {/* Panel chat (giữa) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isLoading && !hasSources ? (
            /* Trạng thái trống trong khu vực Chat */
            <div className="flex flex-col h-full">
              {/* Header Chat */}
              <div className="flex-shrink-0 flex items-center justify-end px-6 py-4 border-b border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm font-medium">Chat</span>
                </div>
              </div>

              {/* Nội dung khi trống */}
              <div className="flex-1 flex items-center justify-center p-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center text-center max-w-md"
                >
                  <div className="p-6 rounded-full bg-primary/10 mb-6">
                    <CloudUpload className="h-12 w-12 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Add a source to get started
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Upload PDFs, add links, or paste content to begin
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setAddDialogOpen(true)}
                    className="gap-2"
                  >
                    <CloudUpload className="h-5 w-5" />
                    Upload a source
                  </Button>
                </motion.div>
              </div>
            </div>
          ) : (
            <ChatPanel
              messages={messages}
              isTyping={isSending}
              onSendMessage={handleSendMessage}
              exampleQuestions={
                (project?.example_questions as string[] | undefined) || []
              }
              onClearChat={handleClearChat}
              isDeletingChatHistory={isDeletingChatHistory}
              onCitationClick={handleCitationClick}
              notebookId={id}
              notebook={{
                title: project?.title ?? undefined,
                description: project?.description ?? undefined,
                icon: project?.icon ?? undefined,
                generation_status: project?.generation_status ?? undefined,
              }}
              sourceCount={sources.length}
              pendingUserMessage={pendingUserMessage}
              showAiLoading={showAiLoading}
            />
          )}
        </div>

        {/* Panel Studio (phải) */}
        <StudioPanel
          projectId={id || ""}
          notebookId={id}
          onCitationClick={handleCitationClick}
        />
      </div>

      {/* Nội dung chính - Mobile (Tabs) */}
      <div className="flex-1 flex flex-col lg:hidden overflow-hidden">
        <MobileTabs
          sources={sources}
          onRemoveSource={handleRemoveSource}
          onSelectSource={handleSelectSource}
          selectedSourceId={selectedSourceId}
          projectId={id || ""}
          onSourceAdded={handleSourceAdded}
          highlightedCitation={highlightedCitation}
          activeTab={mobileActiveTab}
          onTabChange={setMobileActiveTab}
          chatContent={
            !isLoading && !hasSources ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 flex items-center justify-center p-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center text-center max-w-md"
                  >
                    <div className="p-6 rounded-full bg-primary/10 mb-6">
                      <CloudUpload className="h-12 w-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">
                      Add a source to get started
                    </h2>
                    <p className="text-muted-foreground mb-8">
                      Upload PDFs, add links, or paste content to begin
                    </p>
                    <Button
                      size="lg"
                      onClick={() => setAddDialogOpen(true)}
                      className="gap-2"
                    >
                      <CloudUpload className="h-5 w-5" />
                      Upload a source
                    </Button>
                  </motion.div>
                </div>
              </div>
            ) : (
              <ChatPanel
                messages={messages}
                isTyping={isSending}
                onSendMessage={handleSendMessage}
                exampleQuestions={
                  (project?.example_questions as string[] | undefined) || []
                }
                onClearChat={handleClearChat}
                isDeletingChatHistory={isDeletingChatHistory}
                onCitationClick={handleCitationClick}
                notebookId={id}
                notebook={{
                  title: project?.title ?? undefined,
                  description: project?.description ?? undefined,
                  icon: project?.icon ?? undefined,
                  generation_status: project?.generation_status ?? undefined,
                }}
                sourceCount={sources.length}
                pendingUserMessage={pendingUserMessage}
                showAiLoading={showAiLoading}
              />
            )
          }
          studioContent={
            <StudioContent
              projectId={id || ""}
              notebookId={id}
              onCitationClick={handleCitationClick}
            />
          }
        />
      </div>

      {/* Dialog thêm nguồn */}
      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={id || ""}
        onSourceAdded={handleSourceAdded}
      />

      {/* Dialog xác nhận đăng xuất */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
