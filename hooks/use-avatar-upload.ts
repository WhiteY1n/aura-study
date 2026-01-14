"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAvatarUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const uploadAvatar = async (
    file: File,
    userId: string
  ): Promise<string | null> => {
    try {
      setIsUploading(true);

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file");
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB");
      }

      // Get file extension
      const fileExtension = file.name.split(".").pop() || "jpg";

      // Create file path: avatars/{user_id}.{extension}
      const filePath = `avatars/${userId}.${fileExtension}`;

      console.log("Uploading avatar to:", filePath);

      // First, try to delete old avatar files for this user
      try {
        const { data: files } = await supabase.storage
          .from("profiles")
          .list("avatars", {
            limit: 100,
            offset: 0,
          });

        // Delete all old avatar files for this user
        if (files) {
          const oldFiles = files.filter(
            (f) =>
              f.name.startsWith(userId) &&
              f.name !== `${userId}.${fileExtension}`
          );
          if (oldFiles.length > 0) {
            const oldFilePaths = oldFiles.map((f) => `avatars/${f.name}`);
            await supabase.storage.from("profiles").remove(oldFilePaths);
            console.log("Deleted old avatar files:", oldFilePaths);
          }
        }
      } catch (deleteError) {
        console.warn("Could not delete old avatar:", deleteError);
        // Don't throw, continue with upload
      }

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from("profiles")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      console.log("Avatar uploaded successfully:", data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      // Add cache busting with timestamp
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update user profile in database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        throw updateError;
      }

      toast({
        title: "Avatar uploaded",
        description: "Your avatar has been updated successfully",
      });

      return avatarUrl;
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast({
        title: "Upload Error",
        description:
          error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAvatar, isUploading };
};
