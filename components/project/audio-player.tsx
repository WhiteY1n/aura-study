"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Download,
  MoreVertical,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  notebookId?: string;
  expiresAt?: string | null;
  onError?: () => void;
  onDeleted?: () => void;
  onRetry?: () => void;
  onUrlRefresh?: (notebookId: string) => void;
}

export function AudioPlayer({
  audioUrl,
  title = "Deep Dive Conversation",
  notebookId,
  expiresAt,
  onError,
  onDeleted,
  onRetry,
  onUrlRefresh,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryInProgress, setAutoRetryInProgress] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Kiểm tra URL audio đã hết hạn chưa
  const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : false;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setLoading(false);
      setAudioError(null);
      setRetryCount(0);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = async () => {
      console.error("Audio error");
      setLoading(false);
      setIsPlaying(false);

      // Nếu URL hết hạn và có notebookId thì thử làm mới tự động
      if (
        (isExpired ||
          audioError?.includes("403") ||
          audioError?.includes("expired")) &&
        notebookId &&
        onUrlRefresh &&
        retryCount < 2 &&
        !autoRetryInProgress
      ) {
        console.log(
          "Audio URL expired or access denied, attempting automatic refresh..."
        );
        setAutoRetryInProgress(true);
        setRetryCount((prev) => prev + 1);
        onUrlRefresh(notebookId);
        return;
      }

      if (retryCount < 2 && !autoRetryInProgress) {
        // Tự retry tối đa 2 lần cho lỗi tạm thời
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          audio.load();
        }, 1000 * (retryCount + 1)); // Lùi thời gian theo cấp số nhân
      } else {
        setAudioError("Failed to load audio");
        setAutoRetryInProgress(false);
        onError?.();
      }
    };

    const handleCanPlay = () => {
      setLoading(false);
      setAudioError(null);
      setRetryCount(0);
      setAutoRetryInProgress(false);
    };

    const handleLoadStart = () => {
      if (autoRetryInProgress) {
        setLoading(true);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [
    onError,
    isExpired,
    retryCount,
    notebookId,
    onUrlRefresh,
    audioError,
    autoRetryInProgress,
  ]);

  // Tải lại audio khi URL đổi (phục vụ tự refresh)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && autoRetryInProgress) {
      console.log("Reloading audio with new URL...");
      audio.load();
    }
  }, [audioUrl, autoRetryInProgress]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;

    if (isPlaying) {
      audio.pause();
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Play failed:", error);
          setAudioError("Playback failed");
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || audioError) return;

    const time = value[0];
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const vol = value[0];
    audio.volume = vol;
    setVolume(vol);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;

    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const retryLoad = () => {
    const audio = audioRef.current;
    if (!audio) return;

    setLoading(true);
    setAudioError(null);
    setRetryCount(0);
    setAutoRetryInProgress(false);
    audio.load();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const downloadAudio = async () => {
    setIsDownloading(true);

    try {
      // Tải file audio
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch audio file");
      }

      // Tạo blob từ phản hồi
      const blob = await response.blob();

      // Tạo URL tạm cho blob
      const blobUrl = URL.createObjectURL(blob);

      // Tạo thẻ a tạm và kích hoạt tải về
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${title}.mp3`;
      document.body.appendChild(link);
      link.click();

      // Dọn dẹp
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "Download Started",
        description: "Your audio file is being downloaded.",
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download the audio file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteAudio = async () => {
    if (!notebookId) {
      toast({
        title: "Error",
        description: "Cannot delete audio - notebook ID not found",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Thử xóa toàn bộ file trong thư mục notebook ở storage
      try {
        console.log("Attempting to list files in folder:", notebookId);

        // Liệt kê file trong thư mục notebook
        const { data: files, error: listError } = await supabase.storage
          .from("audio")
          .list(notebookId);

        if (listError) {
          console.error("Error listing files:", listError);
        } else if (files && files.length > 0) {
          // Xóa tất cả file trong thư mục
          const filePaths = files.map((file) => `${notebookId}/${file.name}`);
          console.log("Deleting files:", filePaths);

          const { error: deleteError } = await supabase.storage
            .from("audio")
            .remove(filePaths);

          if (deleteError) {
            console.error("Error deleting files from storage:", deleteError);
          } else {
            console.log("Successfully deleted files from storage");
          }
        }
      } catch (storageError) {
        console.error("Storage operation failed:", storageError);
        // Vẫn cập nhật DB dù xóa file storage thất bại
      }

      // Cập nhật notebook để xóa thông tin audio overview
      const { error } = await supabase
        .from("notebooks")
        .update({
          audio_overview_url: null,
          audio_url_expires_at: null,
          audio_overview_generation_status: null,
        })
        .eq("id", notebookId);

      if (error) {
        console.error("Error updating notebook:", error);
        throw error;
      }

      toast({
        title: "Audio Deleted",
        description:
          "The audio overview and associated files have been successfully deleted.",
      });

      // Gọi callback onDeleted để cập nhật component cha
      onDeleted?.();
    } catch (error) {
      console.error("Failed to delete audio:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the audio overview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground">Two hosts</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={downloadAudio} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isDownloading ? "Downloading..." : "Download"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={deleteAudio}
              className="text-red-600 focus:text-red-600"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Trạng thái tự làm mới URL */}
      {autoRetryInProgress && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-600 dark:text-blue-400">
              Refreshing audio access...
            </span>
          </div>
        </div>
      )}

      {/* Trạng thái lỗi phát audio */}
      {audioError && !autoRetryInProgress && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {audioError}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry || retryLoad}
            className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Thanh tiến trình */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="w-full"
          disabled={loading || !!audioError}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Điều khiển phát */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={restart}
            disabled={loading || !!audioError}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={togglePlayPause}
            disabled={loading || !!audioError}
            className="w-12"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Điều chỉnh âm lượng */}
        <div className="flex items-center space-x-2 w-24">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>
      </div>
    </Card>
  );
}
