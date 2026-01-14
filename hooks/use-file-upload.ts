"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const uploadFile = async (
    file: File,
    notebookId: string,
    sourceId: string
  ): Promise<string | null> => {
    try {
      setIsUploading(true);

      // Get file extension
      const fileExtension = file.name.split(".").pop() || "bin";

      // Create file path: {notebook_id}/{source_id}.{extension}
      const filePath = `${notebookId}/${sourceId}.${fileExtension}`;

      console.log("Uploading file to sources bucket:", filePath);
      console.log("File details:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Upload file to Supabase storage - bucket "sources"
      const { data, error } = await supabase.storage
        .from("sources")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Allow overwriting in case of retry
        });

      if (error) {
        console.error("Upload error details:", error);
        
        // Provide more specific error messages
        if (error.message?.includes("Bucket not found")) {
          throw new Error("Storage bucket 'sources' not found. Please contact support.");
        } else if (error.message?.includes("Policy")) {
          throw new Error("Permission denied. Please check storage policies.");
        }
        
        throw error;
      }

      console.log("File uploaded successfully:", data);
      return filePath;
    } catch (error) {
      console.error("File upload failed:", error);
      toast({
        title: "Upload Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const getFileUrl = (filePath: string): string => {
    const { data } = supabase.storage.from("sources").getPublicUrl(filePath);

    return data.publicUrl;
  };

  const getSignedUrl = async (
    filePath: string,
    expiresIn: number = 3600
  ): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("sources")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Failed to create signed URL:", error);
      return null;
    }

    return data.signedUrl;
  };

  return {
    uploadFile,
    getFileUrl,
    getSignedUrl,
    isUploading,
  };
};
