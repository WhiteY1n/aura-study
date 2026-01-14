"use client";

import { useState, useRef } from "react";
import { Upload, Link, Clipboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSources } from "@/hooks/use-sources";
import { useToast } from "@/hooks/use-toast";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSourceAdded?: () => void;
}

export function AddSourceDialog({
  open,
  onOpenChange,
  projectId,
  onSourceAdded,
}: AddSourceDialogProps) {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { addSourceAsync, updateSource } = useSources(projectId);

  const handleOptionClick = (optionId: string) => {
    if (optionId === "upload") {
      fileInputRef.current?.click();
    } else if (optionId === "website") {
      setActiveDialog("website");
      onOpenChange(false);
    } else if (optionId === "paste") {
      setActiveDialog("paste");
      onOpenChange(false);
    }
  };

  const handleSubDialogClose = () => {
    setActiveDialog(null);
  };

  const handleSourceAdded = () => {
    setActiveDialog(null);
    onSourceAdded?.();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create sources for all files
      const createdSources = await Promise.all(
        files.map(async (file) => {
          const fileType = file.type.includes("pdf")
            ? "pdf"
            : file.type.includes("audio")
              ? "audio"
              : "text";

          const sourceData = {
            notebookId: projectId,
            title: file.name,
            type: fileType as "pdf" | "text" | "website" | "youtube" | "audio",
            file_size: file.size,
            processing_status: "pending",
            metadata: {
              fileName: file.name,
              fileType: file.type,
            },
          };

          return await addSourceAsync(sourceData);
        })
      );

      // Close dialog
      setIsUploading(false);
      onOpenChange(false);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Trigger refetch
      onSourceAdded?.();

      toast({
        title: "Files Added",
        description: `${files.length} file${files.length > 1 ? "s" : ""} added successfully`,
      });

      // TODO: Process files in background (upload, document processing)
      // This would require additional hooks like useFileUpload, useDocumentProcessing
    } catch (error: unknown) {
      console.error("Error during file upload:", error);
      setIsUploading(false);

      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.doc,.docx,.mp3,.wav"
        onChange={handleFileChange}
        className="hidden"
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add sources</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Sources let the AI base its responses on the information that
              matters most to you.
            </p>
            <p className="text-xs text-muted-foreground">
              (Examples: marketing plans, course reading, research notes,
              meeting transcripts, sales documents, etc.)
            </p>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Upload Sources - Large top section */}
            <button
              onClick={() => handleOptionClick("upload")}
              disabled={isUploading}
              className={cn(
                "w-full flex flex-col items-center justify-center gap-3 p-8 rounded-xl",
                "border-2 border-dashed border-border/60",
                "bg-muted/30 hover:bg-muted/60 hover:border-primary/40",
                "transition-all duration-200 group",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="p-4 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <Upload className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-base text-foreground">
                  {isUploading ? "Uploading..." : "Upload sources"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isUploading
                    ? "Processing files, please wait..."
                    : "Click to choose files to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported file types: PDF, txt, Markdown, Audio (e.g. mp3)
                </p>
              </div>
            </button>

            {/* Bottom row - Link and Paste Text */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOptionClick("website")}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                  "border border-border/60",
                  "bg-background hover:bg-muted/40 hover:border-primary/40",
                  "transition-all duration-200 group",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Link className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm text-foreground">
                    Link - Website
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Multiple URLs at once
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleOptionClick("paste")}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                  "border border-border/60",
                  "bg-background hover:bg-muted/40 hover:border-primary/40",
                  "transition-all duration-200 group",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Clipboard className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm text-foreground">
                    Paste Text - Copied Text
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add copied content
                  </p>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub dialogs for website and paste */}
      <AddWebsiteDialog
        open={activeDialog === "website"}
        onOpenChange={(open) => !open && handleSubDialogClose()}
        projectId={projectId}
        onSourceAdded={handleSourceAdded}
      />

      <AddCopiedTextDialog
        open={activeDialog === "paste"}
        onOpenChange={(open) => !open && handleSubDialogClose()}
        projectId={projectId}
        onSourceAdded={handleSourceAdded}
      />
    </>
  );
}

// Website Dialog Component
function AddWebsiteDialog({
  open,
  onOpenChange,
  projectId,
  onSourceAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSourceAdded?: () => void;
}) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { addSourceAsync } = useSources(projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);

    try {
      // Extract domain as title
      const urlObj = new URL(url);
      const title = urlObj.hostname;

      await addSourceAsync({
        notebookId: projectId,
        title,
        type: "website",
        url: url.trim(),
        processing_status: "pending",
      });

      toast({
        title: "Website added",
        description: "The website is being processed",
      });

      setUrl("");
      onOpenChange(false);
      onSourceAdded?.();
    } catch (error: unknown) {
      toast({
        title: "Failed to add website",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Website URL</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Copied Text Dialog Component
function AddCopiedTextDialog({
  open,
  onOpenChange,
  projectId,
  onSourceAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSourceAdded?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { addSourceAsync } = useSources(projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      await addSourceAsync({
        notebookId: projectId,
        title: title.trim() || "Pasted Text",
        type: "text",
        content: content.trim(),
        processing_status: "pending",
      });

      toast({
        title: "Text added",
        description: "Your text is being processed",
      });

      setTitle("");
      setContent("");
      onOpenChange(false);
      onSourceAdded?.();
    } catch (error: unknown) {
      toast({
        title: "Failed to add text",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paste Text</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your text here..."
            rows={8}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
