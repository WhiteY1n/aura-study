"use client";

import { toast } from "sonner";

// Re-export toast của sonner để dễ chuyển đổi từ shadcn toast
export function useToast() {
  return {
    toast: (props: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
      duration?: number;
    }) => {
      const duration = props.duration ?? 2000; // Mặc định 2 giây (nhanh hơn)
      
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
