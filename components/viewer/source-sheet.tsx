"use client";

import { useState, useEffect } from "react";
import { ChevronUp, FileText, Folder, Link, Plus, Type, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AddSourceDialog } from "@/components/sources/add-source-dialog";
import { SourceContentViewer } from "@/components/sources/source-content-viewer";
import { useSources, type Source } from "@/hooks/use-sources";
import { useSourceDelete } from "@/hooks/use-source-delete";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Citation {
  citation_id: number;
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_index?: number;
  excerpt?: string;
  chunk_lines_from?: number;
  chunk_lines_to?: number;
}

interface SourceSheetProps {
  projectId: string;
  notebookId?: string;
  onSourceClick?: (source: Source) => void;
  highlightedCitation?: Citation | null;
  onCitationClear?: () => void;
}

function getSourceIcon(type: string | null) {
  switch (type?.toLowerCase()) {
    case "url":
    case "website":
      return <Link className="h-4 w-4 text-primary" />;
    case "text":
    case "paste":
      return <Type className="h-4 w-4 text-orange-500" />;
    default:
      return <FileText className="h-4 w-4 text-blue-500" />;
  }
}

export function SourceSheet({ 
  projectId, 
  notebookId, 
  onSourceClick,
  highlightedCitation,
  onCitationClear,
}: SourceSheetProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedForViewing, setSelectedForViewing] = useState<Source | null>(null);
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
  const { sources } = useSources(notebookId);
  const { deleteSource, isDeleting } = useSourceDelete();

  // Auto-open sheet when citation is clicked
  useEffect(() => {
    if (highlightedCitation) {
      const source = sources?.find((s) => s.id === highlightedCitation.source_id);
      if (source) {
        setSelectedForViewing({
          id: source.id,
          title: source.title,
          type: source.type,
          content: source.content ?? null,
          summary: source.summary ?? null,
          url: source.url ?? null,
        });
        setOpen(true);
      }
    }
  }, [highlightedCitation, sources]);

  const handleSourceClick = (source: Source) => {
    setSelectedForViewing({
      id: source.id,
      title: source.title,
      type: source.type,
      content: source.content ?? null,
      summary: source.summary ?? null,
      url: source.url ?? null,
    });
    onSourceClick?.(source);
  };

  const handleCloseViewer = () => {
    setSelectedForViewing(null);
    onCitationClear?.();
  };

  const handleSheetClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedForViewing(null);
      onCitationClear?.();
    }
  };

  const handleDeleteSource = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    setDeleteSourceId(sourceId);
  };

  const confirmDelete = async () => {
    if (deleteSourceId) {
      await deleteSource(deleteSourceId);
      setDeleteSourceId(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetClose}>
        <SheetTrigger asChild>
          <Button
            className="lg:hidden fixed bottom-4 left-4 z-50 shadow-lg rounded-full px-6 gap-2"
          >
            <ChevronUp className="h-4 w-4" />
            Sources
            {sources && sources.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {sources.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[80vh] bg-background border-border p-0"
          hideTitle
          title="Sources"
        >
          {/* Show source viewer if a source is selected */}
          {selectedForViewing ? (
            <SourceContentViewer
              sourceTitle={selectedForViewing.title}
              sourceContent={selectedForViewing.content || "No content available for this source yet. The content will appear here once the source has been processed."}
              sourceSummary={selectedForViewing.summary}
              sourceUrl={selectedForViewing.url}
              sourceType={selectedForViewing.type}
              onClose={handleCloseViewer}
              highlightedCitation={highlightedCitation || undefined}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Folder className="h-4 w-4" />
                  <span className="text-sm font-medium">Sources</span>
                </div>
              </div>

              {/* Sources list */}
              <div className="flex-1 min-h-0 flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    <AnimatePresence mode="popLayout">
                      {sources && sources.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-sm text-muted-foreground">No sources yet</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add sources to give your AI context
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddDialog(true)}
                            className="mt-4 gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add your first source
                          </Button>
                        </div>
                      ) : (
                        sources?.map((source) => (
                          <motion.div
                            key={source.id}
                            layout
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div
                              className={cn(
                                "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                                "hover:bg-muted/50 hover:shadow-sm border",
                                "bg-background border-border/40"
                              )}
                              onClick={() => handleSourceClick(source)}
                            >
                              <div className="flex-shrink-0">
                                {getSourceIcon(source.type)}
                              </div>
                              <span className="flex-1 text-sm font-medium truncate">
                                {source.title}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteSource(e, source.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>

                    {sources && sources.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowAddDialog(true)}
                        className="w-full h-12 rounded-xl border-dashed border-2 border-muted hover:border-primary/50 hover:bg-primary/5 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">Add source</span>
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddSourceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projectId={projectId}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteSourceId !== null}
        onOpenChange={(open) => !open && setDeleteSourceId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this source? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
