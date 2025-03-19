import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { supabaseAdmin } from "../config/supabase.config";

dotenv.config();

interface UploadResponse {
  url: string | null;
  error: string | null;
}

/**
 * Uploads a file to Supabase storage.
 * @param filePath - The local file path to upload.
 * @returns The public URL of the uploaded file.
 */
export const uploadToSupabase = async (
  filePath: string
): Promise<string | null> => {
  try {
    console.log("Inside Upload", filePath);
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(filePath).substring(1);
    let contentType = "application/octet-stream";

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
    };

    if (mimeTypes[fileExt]) {
      contentType = mimeTypes[fileExt];
    }

    const { data, error } = await supabaseAdmin.storage
      .from(process.env.SUPABASE_BUCKET!)
      .upload(`uploads/${fileName}`, fileBuffer, {
        contentType: contentType,
        upsert: true,
      });

    console.log(data);

    if (error) throw error;

    return supabaseAdmin.storage
      .from(process.env.SUPABASE_BUCKET!)
      .getPublicUrl(data.path).data.publicUrl;
  } catch (error) {
    console.error("❌ Supabase Upload Error:", error);
    return null;
  }
};
