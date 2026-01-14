"use client";

import { useState } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

interface ManualNoteEditorProps {
  notebookId?: string;
  onBack: () => void;
  onSave?: () => void;
}

export function ManualNoteEditor({
  notebookId,
  onBack,
  onSave,
}: ManualNoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleSave = async () => {
    if (!notebookId) {
      toast({
        title: "Error",
        description: "Notebook ID is required",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your note",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your note",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("notes").insert({
        notebook_id: notebookId,
        title: title.trim(),
        content: content.trim(),
        source_type: "manual",
      });

      if (error) throw error;

      toast({
        title: "Note created",
        description: "Your note has been saved successfully",
      });

      // Reset form
      setTitle("");
      setContent("");

      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }

      // Go back to list
      onBack();
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Failed to save note",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-foreground">New Note</h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !title.trim() || !content.trim()}
          size="sm"
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="note-title">Title</Label>
          <Input
            id="note-title"
            placeholder="Enter note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background border-border"
            disabled={isSaving}
          />
        </div>

        <div className="space-y-2 flex-1">
          <Label htmlFor="note-content">Content</Label>
          <Textarea
            id="note-content"
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[400px] bg-background border-border resize-none"
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );
}
