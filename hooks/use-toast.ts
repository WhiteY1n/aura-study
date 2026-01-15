"use client";

import { toast } from "sonner";

// Re-export sonner's toast for easier migration from shadcn toast
export function useToast() {
  return {
    toast: (props: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
      duration?: number;
    }) => {
      const duration = props.duration ?? 2000; // Default 2 seconds (faster)
      
      if (props.variant === "destructive") {
        toast.error(props.title, {
          description: props.description,
          duration,
        });
      } else {
        toast.success(props.title, {
          description: props.description,
          duration,
        });
      }
    },
    dismiss: toast.dismiss,
  };
}

export { toast };
