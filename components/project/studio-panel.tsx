"use client";

import { useState, useEffect } from "react";
import { ChevronUp, Plus, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { NoteListItem } from "./note-list-item";
import { NoteViewer } from "./note-viewer";
import { ManualNoteEditor } from "./manual-note-editor";
import { AudioPlayer } from "./audio-player";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNotes } from "@/hooks/use-notes";
import { useNotebooks } from "@/hooks/use-notebooks";
import { useSources } from "@/hooks/use-sources";
import { useAudioOverview } from "@/hooks/use-audio-overview";
import { useQueryClient } from "@tanstack/react-query";
import type { Citation } from "@/components/chat/markdown-renderer";

interface Note {
  id: string;
  title: string;
  content: string;
  source_type?: string;
  extracted_text?: string;
  created_at: string;
  updated_at?: string;
}

interface StudioPanelProps {
  projectId: string;
  notebookId?: string;
  onAddNote?: () => void;
  onCitationClick?: (citation: Citation) => void;
}

// Desktop panel content
function StudioContent({
  projectId,
  notebookId,
  onAddNote,
  onCitationClick,
}: StudioPanelProps) {
  const { notes, deleteNote } = useNotes(notebookId);
  const { notebooks } = useNotebooks();
  const { sources } = useSources(notebookId);
  const {
    generateAudioOverview,
    refreshAudioUrl,
    autoRefreshIfExpired,
    isGenerating,
    isAutoRefreshing,
    generationStatus,
    checkAudioExpiry,
  } = useAudioOverview(notebookId);
  const queryClient = useQueryClient();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const notebook = notebooks?.find((n) => n.id === notebookId);
  const hasValidAudio =
    notebook?.audio_overview_url &&
    !checkAudioExpiry(notebook.audio_url_expires_at ?? null);
  const currentStatus =
    generationStatus || notebook?.audio_overview_generation_status;

  // Check if at least one source has been successfully processed
  const hasProcessedSource =
    sources?.some((source) => source.processing_status === "completed") || false;

  // Auto-refresh expired URLs
  useEffect(() => {
    if (!notebookId || !notebook?.audio_overview_url) return;

    const checkAndRefresh = async () => {
      if (checkAudioExpiry(notebook.audio_url_expires_at ?? null)) {
        console.log("Detected expired audio URL, initiating auto-refresh...");
        await autoRefreshIfExpired(
          notebookId,
          notebook.audio_url_expires_at ?? null
        );
      }
    };

    // Check immediately
    checkAndRefresh();

    // Set up periodic check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [
    notebookId,
    notebook?.audio_overview_url,
    notebook?.audio_url_expires_at,
    autoRefreshIfExpired,
    checkAudioExpiry,
  ]);

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
  };

  const handleBackToList = () => {
    setSelectedNote(null);
    setShowManualEditor(false);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    setSelectedNote(null);
  };

  const handleAddNote = () => {
    setShowManualEditor(true);
    setSelectedNote(null);
  };

  const handleNoteSaved = () => {
    // Refresh notes list
    queryClient.invalidateQueries({
      queryKey: ["notes", notebookId],
    });
  };

  const handleGenerateAudio = () => {
    if (notebookId) {
      generateAudioOverview(notebookId);
      setAudioError(false);
    }
  };

  const handleAudioError = () => {
    setAudioError(true);
  };

  const handleAudioRetry = () => {
    handleGenerateAudio();
  };

  const getStatusDisplay = () => {
    if (isAutoRefreshing) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />,
        text: "Refreshing URL...",
        description: "Updating audio access",
      };
    }

    if (currentStatus === "generating" || isGenerating) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-600" />,
        text: "Generating audio...",
        description: "This may take a few minutes",
      };
    } else if (currentStatus === "failed") {
      return {
        icon: <AlertCircle className="h-4 w-4 text-red-600" />,
        text: "Generation failed",
        description: "Please try again",
      };
    } else if (currentStatus === "completed" && hasValidAudio) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        text: "Ready to play",
        description: "Audio overview available",
      };
    }
    return null;
  };

  // Show manual note editor
  if (showManualEditor) {
    return (
      <ManualNoteEditor
        notebookId={notebookId}
        onBack={handleBackToList}
        onSave={handleNoteSaved}
      />
    );
  }

  // Show note viewer if a note is selected
  if (selectedNote) {
    return (
      <NoteViewer
        note={selectedNote}
        onBack={handleBackToList}
        onDelete={() => handleDeleteNote(selectedNote.id)}
        onCitationClick={onCitationClick}
      />
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-foreground">Studio</h2>
          <p className="text-xs text-muted-foreground">Notes and saved responses</p>
        </div>

        {/* Audio Overview Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground">Audio Overview</h3>
          </div>

          {/* Show AudioPlayer when audio is ready */}
          {hasValidAudio && !audioError && currentStatus !== "generating" && !isAutoRefreshing && notebook?.audio_overview_url ? (
            <AudioPlayer
              audioUrl={notebook.audio_overview_url}
              title="Deep Dive Conversation"
              notebookId={notebookId}
              expiresAt={notebook.audio_url_expires_at}
              onError={handleAudioError}
              onRetry={handleAudioRetry}
              onDeleted={() => {
                queryClient.invalidateQueries({ queryKey: ["notebooks"] });
                setAudioError(false);
              }}
              onUrlRefresh={(id) => refreshAudioUrl(id)}
            />
          ) : (
            <Card className="p-3 border border-border">
              {/* Hide icon section when generating or auto-refreshing */}
              {currentStatus !== "generating" &&
                !isGenerating &&
                !isAutoRefreshing && (
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 -960 960 960"
                        width="24px"
                        fill="currentColor"
                      >
                        <path d="M280-120v-123q-104-14-172-93T40-520h80q0 83 58.5 141.5T320-320h10q5 0 10-1 13 20 28 37.5t32 32.5q-10 3-19.5 4.5T360-243v123h-80Zm20-282q-43-8-71.5-40.5T200-520v-240q0-50 35-85t85-35q50 0 85 35t35 85v160H280v80q0 31 5 60.5t15 57.5Zm340 2q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm-40 280v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T640-320q83 0 141.5-58.5T840-520h80q0 105-68 184t-172 93v123h-80Zm40-360q17 0 28.5-11.5T680-520v-240q0-17-11.5-28.5T640-800q-17 0-28.5 11.5T600-760v240q0 17 11.5 28.5T640-480Zm0-160Z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        Deep Dive conversation
                      </h4>
                      <p className="text-sm text-muted-foreground">Two hosts</p>
                    </div>
                  </div>
                )}

              {/* Status Display */}
              {getStatusDisplay() && (
                <div className="flex items-center space-x-2 mb-3 p-2 rounded-md bg-muted/50">
                  {getStatusDisplay()!.icon}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {getStatusDisplay()!.text}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getStatusDisplay()!.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Audio error div */}
              {audioError && (
                <div className="flex items-center space-x-2 mb-3 p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <div className="flex-1">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Audio unavailable
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAudioRetry}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleGenerateAudio}
                  disabled={
                    isGenerating ||
                    currentStatus === "generating" ||
                    !hasProcessedSource ||
                    isAutoRefreshing
                  }
                  className="flex-1"
                >
                  {isGenerating || currentStatus === "generating" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>

              {/* Help text when no processed sources */}
              {!hasProcessedSource && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Add and process a source first to generate audio
                </p>
              )}
            </Card>
          )}
        </Card>

        <Separator />

        {/* Notes Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Notes
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddNote}
              className="h-6 px-2 gap-1 text-xs hover:bg-primary/10"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {notes && notes.length === 0 ? (
            <div className="text-center py-6 px-2">
              <p className="text-xs text-muted-foreground">No notes yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Save responses from chat to create notes
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notes?.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  onClick={() => handleNoteClick(note)}
                  onDelete={() => deleteNote(note.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// Desktop version
export function StudioPanel(props: StudioPanelProps) {
  return (
    <aside className="hidden lg:block w-80 xl:w-96 bg-background border-l border-border/50 flex-shrink-0">
      <StudioContent {...props} />
    </aside>
  );
}

// Mobile bottom sheet version
export function StudioSheet(props: StudioPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 shadow-lg rounded-full px-6 gap-2">
          <ChevronUp className="h-4 w-4" />
          Studio
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] bg-background border-border p-0" hideTitle title="Studio">
        <StudioContent {...props} />
      </SheetContent>
    </Sheet>
  );
}
