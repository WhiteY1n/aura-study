"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MarkdownRenderer, type Citation } from "@/components/chat/markdown-renderer";
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

interface Note {
  id: string;
  title: string;
  content: string;
  source_type?: string;
  extracted_text?: string;
  created_at: string;
  updated_at?: string;
}

interface NoteViewerProps {
  note: Note;
  onBack: () => void;
  onDelete?: () => void;
  onCitationClick?: (citation: Citation) => void;
}

export function NoteViewer({
  note,
  onBack,
  onDelete,
  onCitationClick,
}: NoteViewerProps) {
  const createdTime = formatDistanceToNow(new Date(note.created_at), {
    addSuffix: true,
  });

  const getSourceTypeLabel = () => {
    if (note.source_type === "ai_response") return "AI Response";
    if (note.source_type === "user") return "User Note";
    if (note.source_type === "manual") return "Manual Note";
    return "Note";
  };

  // Parse nội dung cho câu trả lời AI
  const parseContent = (contentStr: string) => {
    try {
      const parsed = JSON.parse(contentStr);
      if (parsed.segments && parsed.citations) {
        return parsed;
      }
    } catch {
      // Không phải JSON thì trả về chuỗi
    }
    return contentStr;
  };

  const isAIResponse = note.source_type === "ai_response";
  const parsedContent = isAIResponse ? parseContent(note.content) : note.content;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground">Note Details</h2>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground break-words">
            {note.title}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {getSourceTypeLabel()}
            </Badge>
            <span className="text-xs text-muted-foreground">{createdTime}</span>
          </div>
        </div>
      </div>

      {/* Nội dung */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {isAIResponse && typeof parsedContent === "object" ? (
            <MarkdownRenderer
              content={parsedContent}
              isUserMessage={false}
              onCitationClick={onCitationClick}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {typeof parsedContent === "string" ? parsedContent : note.content}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Chân trang */}
      {onDelete && (
        <div className="flex-shrink-0 p-4 border-t border-border/50">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Note
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete note?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this
                  note.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
