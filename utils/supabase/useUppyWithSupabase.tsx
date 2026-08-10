"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { v4 as uuidv4 } from "uuid";
import { resizeImage } from "@/utils/images/resizeImage";

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const useUppyWithSupabase = ({ bucketName }: { bucketName: string }) => {
  const [uppy] = useState(() => new Uppy());
  const [supabase] = useState(createClient);
  useEffect(() => {
    const initializeUppy = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!uppy.getPlugin("Tus")) {
        uppy
          .use(Tus, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
              authorization: `Bearer ${session?.access_token}`,
              apikey: anonKey,
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            chunkSize: 6 * 1024 * 1024,
            allowedMetaFields: [
              "bucketName",
              "objectName",
              "contentType",
              "cacheControl",
              "metadata",
            ],
            onError: (error) => console.error("Upload error:", error),
          })
          .on("file-added", (file) => {
            file.meta = {
              ...file.meta,
              bucketName,
              objectName: `${uuidv4()}-${file.name}`,
              contentType: file.type,
              metadata: JSON.stringify({
                yourCustomMetadata: true,
              }),
            };
          })
          .on("progress", (progress) => {
            console.log("Uploading: ", progress);
          });
      }
    };

    // Initialize Uppy with Supabase settings
    initializeUppy();
  }, [bucketName, supabase.auth, uppy]);
  // Return the configured Uppy instance

  const startUpload = () => {
    return new Promise((resolve, reject) => {
      uppy.once("complete", (result) => {
        if (result.failed && result.failed.length > 0) {
          reject(result.failed);
        } else if (result.successful) {
          const uploaded = result.successful.map((file) => ({
            bucket: file.meta.bucketName,
            objectName: file.meta.objectName,
            url: `${supabaseUrl}/storage/v1/object/public/${file.meta.bucketName}/${file.meta.objectName}`,
          }));
          resolve(uploaded || []);
        } else {
          resolve([]);
        }
      });

      uppy.upload().catch(reject);
    });
  };

  // Safely clear any files queued in Uppy before a new upload
  const clearQueuedFiles = () => {
    try {
      const files = (uppy as any).getFiles ? (uppy as any).getFiles() : [];
      files.forEach((f: any) => uppy.removeFile(f.id));
    } catch (_) {
      // ignore
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    clearQueuedFiles();
    const resizedFiles = await Promise.all(
      files.map((file) => resizeImage(file, 1920, 1080, 0.8)),
    );
    resizedFiles.forEach((file) => uppy.addFile(file as any));
    const uploaded: any = await startUpload();
    return Array.isArray(uploaded) ? uploaded.map((f: any) => f.url) : [];
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    clearQueuedFiles();
    const resized = await resizeImage(file, 1920, 1080, 0.8);
    uppy.addFile(resized as any);
    const uploaded: any = await startUpload();
    if (Array.isArray(uploaded) && uploaded.length > 0) {
      return uploaded[0].url;
    }
    return null;
  };

  return { uppy, startUpload, uploadFile, uploadFiles };
};
