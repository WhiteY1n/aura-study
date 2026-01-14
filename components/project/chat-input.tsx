"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  exampleQuestions?: string[];
  pendingUserMessage?: string | null;
  showAiLoading?: boolean;
  onQuestionClick?: (question: string) => void;
}

const defaultSuggestions = [
  {
    icon: "📝",
    label: "Summarize",
    prompt: "Give me a comprehensive summary of this content",
  },
  {
    icon: "💡",
    label: "Key ideas",
    prompt: "What are the main key ideas and takeaways?",
  },
  {
    icon: "🧒",
    label: "Explain simply",
    prompt: "Explain this like I'm 12 years old",
  },
  {
    icon: "❓",
    label: "Questions",
    prompt: "Generate study questions based on this content",
  },
];

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask anything about your sources...",
  exampleQuestions = [],
  pendingUserMessage = null,
  showAiLoading = false,
  onQuestionClick,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuestionClick = (question: string) => {
    onQuestionClick?.(question);
    onSend(question);
  };

  const showDefaultSuggestions =
    !disabled && !pendingUserMessage && !showAiLoading && exampleQuestions.length === 0;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Input with arrow inside */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "relative flex items-center rounded-2xl bg-secondary/50 border transition-all duration-200",
            isFocused
              ? "border-primary/50 bg-card shadow-sm"
              : "border-border/50"
          )}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="pr-2"
          >
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || disabled}
              className={cn(
                "h-8 w-8 rounded-xl transition-all",
                input.trim()
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </form>

      {/* Example Questions or Static Suggestions */}
      {!disabled &&
        !pendingUserMessage &&
        !showAiLoading &&
        exampleQuestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {exampleQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="whitespace-nowrap h-auto py-2 px-3 text-sm hover:bg-secondary flex-shrink-0"
                onClick={() => handleQuestionClick(question)}
                disabled={disabled}
              >
                {question}
              </Button>
            ))}
          </div>
        )}

      {showDefaultSuggestions && (
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {defaultSuggestions.map((suggestion) => (
            <motion.button
              key={suggestion.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSend(suggestion.prompt)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <span>{suggestion.icon}</span>
              <span>{suggestion.label}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
