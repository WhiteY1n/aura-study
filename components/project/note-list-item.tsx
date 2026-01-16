"use client";

import { MoreVertical, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string;
  source_type?: string;
  extracted_text?: string;
  created_at: string;
  updated_at?: string;
}

interface NoteListItemProps {
  note: Note;
  onClick?: () => void;
  onDelete?: () => void;
}

export function NoteListItem({ note, onClick, onDelete }: NoteListItemProps) {
  const createdTime = formatDistanceToNow(new Date(note.created_at), {
    addSuffix: true,
  });

  // Lấy đoạn preview hiển thị
  const getPreviewText = () => {
    if (note.source_type === "ai_response") {
      // Ưu tiên extracted_text nếu có
      if (note.extracted_text) {
        return note.extracted_text;
      }
      // Thử parse nội dung JSON
      try {
        const parsed = JSON.parse(note.content);
        if (parsed.segments && parsed.segments[0]) {
          return parsed.segments
            .slice(0, 3)
            .map((s: { text: string }) => s.text)
            .join(" ");
        }
      } catch {
        // Nếu parse lỗi thì dùng nguyên bản
      }
    }
    // Note do người dùng nhập hoặc mặc định
    return note.content.length > 100
      ? note.content.substring(0, 100) + "..."
      : note.content;
  };

  const previewText = getPreviewText();

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <FileText className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {note.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {previewText}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{createdTime}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {onDelete && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              <span className="text-xs">Delete</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
