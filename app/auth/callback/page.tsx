"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Lấy tham số hash từ URL
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        console.log("AuthCallback: Processing auth callback", { type });

        if (!accessToken) {
          throw new Error("No access token found in URL");
        }

        // Thiết lập session bằng token từ URL
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });

        if (error) throw error;

        setStatus("success");

        // Hiện thông báo thành công tùy loại
        if (type === "signup") {
          toast({
            title: "Email confirmed!",
            description: "Your account has been verified successfully",
          });
        } else if (type === "recovery") {
          toast({
            title: "Password reset link verified",
            description: "You can now set a new password",
          });
          setTimeout(() => router.replace("/settings"), 1500);
          return;
        }

        // Chuyển hướng sang dashboard
        setTimeout(() => router.replace("/dashboard"), 1500);
      } catch (error) {
        console.error("AuthCallback error:", error);
        setStatus("error");

        toast({
          title: "Authentication failed",
          description:
            error instanceof Error ? error.message : "Failed to confirm email",
          variant: "destructive",
        });

        // Chuyển về trang đăng nhập nếu lỗi
        setTimeout(() => router.replace("/auth"), 3000);
      }
    };

    handleAuthCallback();
  }, [router, toast, supabase.auth]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {status === "loading" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">
            Confirming your email...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please wait a moment
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium text-foreground">
            Email confirmed!
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Redirecting to dashboard...
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium text-foreground">
            Confirmation failed
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Redirecting to login...
          </p>
        </>
      )}
    </div>
  );
}
