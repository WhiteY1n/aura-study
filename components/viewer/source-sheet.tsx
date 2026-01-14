"use client";

import { useState } from "react";
import { ChevronUp, FileText, Link, Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddSourceDialog } from "@/components/sources/add-source-dialog";
import { useSources, type Source } from "@/hooks/use-sources";

interface SourceSheetProps {
  projectId: string;
  notebookId?: string;
  onSourceClick?: (source: Source) => void;
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

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SourcesList({
  projectId,
  notebookId,
  onSourceClick,
  onClose,
}: SourceSheetProps & { onClose?: () => void }) {
  const { sources } = useSources(notebookId);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleSourceClick = (source: Source) => {
    onSourceClick?.(source);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <SheetTitle className="text-lg font-semibold">Sources</SheetTitle>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {sources?.length || 0} source{sources?.length !== 1 ? "s" : ""} in this notebook
        </p>
      </SheetHeader>

      <ScrollArea className="flex-1 px-4">
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
          <div className="space-y-2 pb-6">
            {sources?.map((source) => (
              <Card
                key={source.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleSourceClick(source)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSourceIcon(source.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {source.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {source.type || "file"}
                        </Badge>
                        {source.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(source.file_size)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <AddSourceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projectId={projectId}
      />
    </div>
  );
}

export function SourceSheet({ projectId, notebookId, onSourceClick }: SourceSheetProps) {
  const [open, setOpen] = useState(false);
  const { sources } = useSources(notebookId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="lg:hidden fixed bottom-4 right-4 z-50 shadow-lg rounded-full px-4 gap-2"
        >
          <FileText className="h-4 w-4" />
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
        className="h-[70vh] bg-background border-border p-0"
      >
        <SourcesList
          projectId={projectId}
          notebookId={notebookId}
          onSourceClick={onSourceClick}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
