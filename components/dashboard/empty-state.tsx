"use client";

import { Plus, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className="max-w-md w-full p-8 text-center">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center mb-6"
        >
          <div className="relative">
            <FileText className="h-10 w-10 text-primary" />
            <Sparkles className="h-4 w-4 text-accent absolute -top-1 -right-1" />
          </div>
        </motion.div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Create your first notebook
        </h2>
        <p className="text-muted-foreground mb-6">
          Upload documents, add sources, and let AI help you learn and
          understand your content.
        </p>

        <Button onClick={onCreateProject} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Create notebook
        </Button>
      </Card>
    </motion.div>
  );
}
