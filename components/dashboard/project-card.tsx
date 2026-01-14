"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Project {
  id: string;
  title: string;
  lastUpdated: string;
  sourcesCount: number;
  icon?: string;
  thumbnail?: string;
}

interface ProjectCardProps {
  project: Project;
  layout: "grid" | "list";
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({
  project,
  layout,
  onRename,
  onDelete,
}: ProjectCardProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(project.title);

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== project.title) {
      onRename(project.id, newTitle.trim());
    }
    setRenameDialogOpen(false);
  };

  const handleDelete = () => {
    onDelete(project.id);
    setDeleteDialogOpen(false);
  };

  const MenuButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "flex-shrink-0",
            layout === "grid" &&
              "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm"
          )}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            setRenameDialogOpen(true);
          }}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            setDeleteDialogOpen(true);
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const Dialogs = (
    <>
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename notebook</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new name"
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete notebook?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{project.title}&quot; and all
              its contents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (layout === "list") {
    return (
      <>
        <Link href={`/project/${project.id}`}>
          <motion.div
            whileHover={{ y: -2, scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Card className="flex items-center gap-4 p-4 select-none hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="h-12 w-12 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl leading-none">
                  {project.icon || "📝"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-normal text-foreground truncate">
                  {project.title}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {project.lastUpdated}
                  </span>
                  <span>
                    {project.sourcesCount} source
                    {project.sourcesCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {MenuButton}
            </Card>
          </motion.div>
        </Link>
        {Dialogs}
      </>
    );
  }

  return (
    <>
      <Link href={`/project/${project.id}`}>
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Card className="group relative overflow-hidden h-48 select-none hover:bg-muted/50 transition-colors cursor-pointer">
            {/* Content */}
            <div className="p-4 h-full flex flex-col">
              {/* Icon */}
              <div className="mb-4">
                <span className="text-3xl leading-none">
                  {project.icon || "📝"}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-normal text-foreground line-clamp-2 flex-grow mb-2">
                {project.title}
              </h3>

              {/* Footer */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-auto">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {project.lastUpdated}
                </span>
                <span>
                  {project.sourcesCount} source
                  {project.sourcesCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {MenuButton}
          </Card>
        </motion.div>
      </Link>
      {Dialogs}
    </>
  );
}
