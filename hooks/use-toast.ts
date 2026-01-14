"use client";

import { toast } from "sonner";

// Re-export sonner's toast for easier migration from shadcn toast
export function useToast() {
  return {
    toast: (props: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
    }) => {
      if (props.variant === "destructive") {
        toast.error(props.title, {
          description: props.description,
        });
      } else {
        toast.success(props.title, {
          description: props.description,
        });
      }
    },
    dismiss: toast.dismiss,
  };
}

export { toast };
