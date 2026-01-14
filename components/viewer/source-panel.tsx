"use client";

import {
  useState,
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  File,
  Globe,
  Youtube,
  FileText,
  Plus,
  Trash2,
  Folder,
  ChevronLeft,
  ChevronRight,
  FileAudio,
  Image,
  Loader2,
  CheckCircle,
  XCircle,
  Upload,
  MoreVertical,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSourceDelete } from "@/hooks/use-source-delete";
import { SourceContentViewer } from "@/components/sources/source-content-viewer";
import { RenameSourceDialog } from "@/components/sources/rename-source-dialog";

export interface Source {
  id: string;
  title: string;
  type: "pdf" | "text" | "youtube" | "website" | "audio" | "image";
  content?: string;
  summary?: string;
  url?: string;
  processing_status?: string;
}

export interface Citation {
  citation_id: number;
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_index?: number;
  excerpt?: string;
  chunk_lines_from?: number;
  chunk_lines_to?: number;
}

interface SourcePanelProps {
  sources: Source[];
  onSelectSource: (sourceId: string) => void;
  selectedSourceId?: string;
  selectedSourceForViewing?: Source | null;
  onSourceViewerChange?: (source: Source | null) => void;
  projectId: string;
  notebookId?: string;
  onSourceAdded?: () => void;
  onAddSourceClick?: () => void;
  highlightedCitation?: Citation | null;
}

function getSourceIcon(type: Source["type"]) {
  const icons = {
    pdf: <File className="h-4 w-4" />,
    text: <FileText className="h-4 w-4" />,
    youtube: <Youtube className="h-4 w-4" />,
    website: <Globe className="h-4 w-4" />,
    audio: <FileAudio className="h-4 w-4" />,
    image: <Image className="h-4 w-4" />,
  };
  return icons[type];
}

function renderProcessingStatus(status?: string) {
  switch (status) {
    case "uploading":
      return <Upload className="h-4 w-4 animate-pulse text-blue-500" />;
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "pending":
      return <Loader2 className="h-4 w-4 animate-pulse text-gray-500" />;
    default:
      return null;
  }
}

export function SourcePanel({
  sources,
  onSelectSource,
  selectedSourceId,
  selectedSourceForViewing: propSelectedSourceForViewing,
  onSourceViewerChange,
  projectId,
  notebookId,
  onSourceAdded,
  onAddSourceClick,
  highlightedCitation,
}: SourcePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
  const [selectedSourceForViewing, setSelectedSourceForViewing] =
    useState<Source | null>(propSelectedSourceForViewing || null);
  const [renameSource, setRenameSource] = useState<Source | null>(null);

  const { deleteSource, isDeleting } = useSourceDelete();

  // Sync with parent prop
  const activeSourceForViewing =
    propSelectedSourceForViewing !== undefined
      ? propSelectedSourceForViewing
      : selectedSourceForViewing;

  const handleSourceClick = (source: Source) => {
    onSelectSource(source.id);
    setSelectedSourceForViewing(source);
    onSourceViewerChange?.(source);
  };

  const handleRemoveSource = (sourceId: string) => {
    setDeleteSourceId(sourceId);
  };

  const confirmDelete = async () => {
    if (deleteSourceId) {
      await deleteSource(deleteSourceId);
      setDeleteSourceId(null);
    }
  };

  const handleBackToSources = () => {
    setSelectedSourceForViewing(null);
    onSourceViewerChange?.(null);
  };

  useEffect(() => {
    const handleWindowResize = () => {
      setPanelWidth((current) => {
        const minWidth = 240;
        const maxWidth = Math.max(minWidth, window.innerWidth * 0.6);
        return Math.min(current, maxWidth);
      });
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isCollapsed) return;
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = panelWidth;
      const minWidth = 240;
      const viewportWidth =
        typeof window !== "undefined" ? window.innerWidth : 0;
      const maxWidth = Math.max(minWidth, viewportWidth * 0.6);
      setIsResizing(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const nextWidth = Math.min(
          maxWidth,
          Math.max(minWidth, startWidth + deltaX)
        );
        setPanelWidth(nextWidth);
      };

      const handlePointerUp = () => {
        setIsResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [isCollapsed, panelWidth]
  );

  return (
    <>
      <motion.div
        initial={false}
        animate={{
          width: isCollapsed ? "60px" : `${panelWidth}px`,
        }}
        transition={
          isResizing ? { duration: 0 } : { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
        }
        className="relative z-10 shrink-0 bg-background border-r border-border/60 dark:border-border/40 flex flex-col h-full overflow-hidden"
      >
        {!isCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sources panel"
            onPointerDown={handleResizeStart}
            className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize bg-transparent transition-colors hover:bg-primary/30"
          />
        )}

        {/* Show source content viewer if a source is selected for viewing */}
        {activeSourceForViewing ? (
          <SourceContentViewer
            sourceContent={activeSourceForViewing.content || "No content available for this source yet. The content will appear here once the source has been processed."}
            sourceTitle={activeSourceForViewing.title}
            sourceSummary={activeSourceForViewing.summary}
            sourceUrl={activeSourceForViewing.url}
            sourceType={activeSourceForViewing.type}
            highlightedCitation={highlightedCitation || undefined}
            onClose={handleBackToSources}
          />
        ) : (
          <>
            {/* Header with Collapse Button */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border/50">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Folder className="h-4 w-4" />
                  <span className="text-sm font-medium">Sources</span>
                </motion.div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Content */}
            {!isCollapsed ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                <div className="p-4 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {sources.map((source) => (
                      <motion.div
                        key={source.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div
                          onClick={() => handleSourceClick(source)}
                          className={cn(
                            "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                            "hover:bg-muted/50 hover:shadow-sm",
                            selectedSourceId === source.id
                              ? "bg-primary/10 border border-primary/20 shadow-sm"
                              : "bg-background border border-border/40"
                          )}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                              selectedSourceId === source.id
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                            )}
                          >
                            {getSourceIcon(source.type)}
                          </div>

                          <span
                            className={cn(
                              "flex-1 text-sm font-medium truncate transition-colors",
                              selectedSourceId === source.id
                                ? "text-primary"
                                : "text-foreground"
                            )}
                          >
                            {source.title}
                          </span>

                          {/* Processing Status Icon */}
                          {source.processing_status && (
                            <div className="shrink-0">
                              {renderProcessingStatus(source.processing_status)}
                            </div>
                          )}

                          {/* More Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  "opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                                  "h-6 w-6 text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameSource(source);
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSource(source.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Add Source Button */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Button
                      variant="outline"
                      onClick={onAddSourceClick}
                      className="w-full h-12 rounded-xl border-dashed border-2 border-muted hover:border-primary/50 hover:bg-primary/5 transition-all gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm font-medium">Add source</span>
                    </Button>
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onAddSourceClick}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            )}
          </>
        )}
      </motion.div>

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

      {/* Rename Source Dialog */}
      <RenameSourceDialog
        source={
          renameSource
            ? {
                id: renameSource.id,
                title: renameSource.title,
              }
            : null
        }
        open={renameSource !== null}
        onOpenChange={(open) => !open && setRenameSource(null)}
      />
    </>
  );
}
