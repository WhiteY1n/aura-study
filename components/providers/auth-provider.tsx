"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const updateAuthState = useCallback(
    (newSession: Session | null) => {
      console.log(
        "AuthContext: Updating auth state:",
        newSession?.user?.email || "No session"
      );
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Xóa lỗi cũ khi xác thực thành công
      if (newSession && error) {
        setError(null);
      }
    },
    [error]
  );

  const clearAuthState = useCallback(() => {
    console.log("AuthContext: Clearing auth state");
    setSession(null);
    setUser(null);
    setError(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log("AuthContext: Starting logout process...");

      // Xóa trạng thái cục bộ ngay để phản hồi tức thì
      clearAuthState();

      // Thử đăng xuất khỏi server
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.log("AuthContext: Logout error:", error);

        // Nếu session trên server không hợp lệ thì trạng thái cục bộ đã được xóa rồi
        if (
          error.message.includes("session_not_found") ||
          error.message.includes("Session not found") ||
          error.status === 403
        ) {
          console.log("AuthContext: Session already invalid on server");
          return;
        }

        // Với lỗi khác vẫn đảm bảo xóa session cục bộ
        await supabase.auth.signOut({ scope: "local" });
        return;
      }

      console.log("AuthContext: Logout successful");
    } catch (err) {
      console.error("AuthContext: Unexpected logout error:", err);

      // Dù lỗi gì cũng cố gắng xóa session cục bộ
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (localError) {
        console.error("AuthContext: Failed to clear local session:", localError);
      }
    }
  }, [supabase.auth, clearAuthState]);

  useEffect(() => {
    let mounted = true;

    // Đăng ký listener trạng thái auth NGAY TỪ ĐẦU
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      console.log(
        "AuthContext: Auth state changed:",
        event,
        newSession?.user?.email || "No session"
      );

      // Xử lý sự kiện đăng xuất
      if (event === "SIGNED_OUT") {
        clearAuthState();
        setLoading(false);
        return;
      }

      // Xử lý sự kiện đăng nhập / làm mới token
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        updateAuthState(newSession);
        setLoading(false);
        return;
      }

      // Với sự kiện khác, chỉ cập nhật khi token thay đổi thật
      if (session?.access_token !== newSession?.access_token) {
        updateAuthState(newSession);
        if (loading) setLoading(false);
      }
    });

    const initializeAuth = async () => {
      try {
        console.log("AuthContext: Initializing auth...");

        // Lấy session ban đầu
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "AuthContext: Error getting initial session:",
            sessionError
          );

          // Nếu session không hợp lệ thì xóa trạng thái cục bộ
          if (
            sessionError.message.includes("session_not_found") ||
            sessionError.message.includes("Session not found")
          ) {
            console.log(
              "AuthContext: Session not found on server, clearing local session"
            );
            await supabase.auth.signOut({ scope: "local" });
            if (mounted) {
              clearAuthState();
              setLoading(false);
            }
            return;
          }

          if (mounted) {
            setError(sessionError.message);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          console.log(
            "AuthContext: Initial session:",
            initialSession?.user?.email || "No session"
          );
          updateAuthState(initialSession);
          setLoading(false);
        }
      } catch (err) {
        console.error("AuthContext: Error during initialization:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth, clearAuthState, updateAuthState, session?.access_token, loading]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
