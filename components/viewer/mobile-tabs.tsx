"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Folder, Trash2, MessageSquare, Sparkles, FileText, Link, Type } from "lucide-react";
import { AddSourceDialog } from "@/components/sources/add-source-dialog";
import { SourceContentViewer } from "@/components/sources/source-content-viewer";
import { cn } from "@/lib/utils";
import type { Source } from "@/components/viewer/source-panel";
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

interface Citation {
  citation_id: number;
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_index?: number;
  excerpt?: string;
  chunk_lines_from?: number;
  chunk_lines_to?: number;
  clickedAt?: number; // Timestamp to force re-trigger
}

interface MobileTabsProps {
  sources: Source[];
  onRemoveSource: (sourceId: string) => void;
  onSelectSource: (sourceId: string) => void;
  selectedSourceId?: string;
  projectId: string;
  onSourceAdded?: () => void;
  highlightedCitation?: Citation | null;
  activeTab: "sources" | "chat" | "studio";
  onTabChange: (tab: "sources" | "chat" | "studio") => void;
  chatContent: React.ReactNode;
  studioContent: React.ReactNode;
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

export function MobileTabs({
  sources,
  onRemoveSource,
  onSelectSource,
  selectedSourceId,
  projectId,
  onSourceAdded,
  highlightedCitation,
  activeTab,
  onTabChange,
  chatContent,
  studioContent,
}: MobileTabsProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedForViewing, setSelectedForViewing] = useState<Source | null>(null);
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);

  // Tự mở phần xem nguồn khi người dùng bấm vào trích dẫn
  useEffect(() => {
    if (highlightedCitation && activeTab !== "sources") {
      const source = sources.find(s => s.id === highlightedCitation.source_id);
      if (source) {
        setSelectedForViewing(source);
        onTabChange("sources");
      }
    }
  }, [highlightedCitation?.clickedAt]);

  // Cập nhật nguồn đang xem khi highlightedCitation đổi và đang ở tab nguồn
  useEffect(() => {
    if (highlightedCitation && activeTab === "sources") {
      const source = sources.find(s => s.id === highlightedCitation.source_id);
      if (source) {
        setSelectedForViewing(source);
      }
    }
  }, [highlightedCitation, activeTab, sources]);

  const handleDeleteSource = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    setDeleteSourceId(sourceId);
  };

  const confirmDelete = async () => {
    if (deleteSourceId) {
      onRemoveSource(deleteSourceId);
      setDeleteSourceId(null);
    }
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as "sources" | "chat" | "studio")} className="flex flex-col h-full">
        {/* Thanh tab phía trên */}
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b bg-background h-12 p-0 shrink-0">
          <TabsTrigger 
            value="sources" 
            className="flex items-center justify-center gap-2 rounded-none data-[state=active]:bg-primary/10 h-full"
          >
            <Folder className="h-4 w-4" />
            Sources
          </TabsTrigger>
          <TabsTrigger 
            value="chat" 
            className="flex items-center justify-center gap-2 rounded-none data-[state=active]:bg-primary/10 h-full"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger 
            value="studio" 
            className="flex items-center justify-center gap-2 rounded-none data-[state=active]:bg-primary/10 h-full"
          >
            <Sparkles className="h-4 w-4" />
            Studio
          </TabsTrigger>
        </TabsList>

        {/* Tab Nguồn */}
        <TabsContent value="sources" className="flex-1 m-0 overflow-hidden">
          {selectedForViewing ? (
            <SourceContentViewer
              sourceTitle={selectedForViewing.title}
              sourceContent={selectedForViewing.content || "No content available"}
              sourceSummary={selectedForViewing.summary ?? undefined}
              sourceUrl={selectedForViewing.url ?? undefined}
              sourceType={selectedForViewing.type}
              onClose={() => setSelectedForViewing(null)}
              highlightedCitation={highlightedCitation || undefined}
            />
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                <AnimatePresence mode="popLayout">
                  {sources.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground">No sources yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add sources to give your AI context
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddDialogOpen(true)}
                        className="mt-4 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add your first source
                      </Button>
                    </div>
                  ) : (
                    sources.map((source) => (
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
                            selectedSourceId === source.id
                              ? "bg-primary/10 border-primary/20"
                              : "bg-background border-border/40"
                          )}
                          onClick={() => {
                            setSelectedForViewing(source);
                            onSelectSource(source.id);
                          }}
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

                {sources.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setAddDialogOpen(true)}
                    className="w-full h-12 rounded-xl border-dashed border-2 border-muted hover:border-primary/50 hover:bg-primary/5 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add source</span>
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Tab Chat */}
        <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
          {chatContent}
        </TabsContent>

        {/* Tab Studio */}
        <TabsContent value="studio" className="flex-1 m-0 overflow-hidden">
          {studioContent}
        </TabsContent>
      </Tabs>

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        onSourceAdded={onSourceAdded}
      />

      {/* Hộp thoại xác nhận xóa nguồn */}
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
            <AlertDialogAction onClick={confirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
