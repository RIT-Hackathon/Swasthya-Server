import { Request, Response } from "express";
import { downloadMedia } from "../utils/mediaDownload.utils";
import { uploadToSupabase } from "../utils/mediaUpload.utils";
import fs from "fs";

export const respondToQuery = async (req: Request, res: Response) => {
  const message: string = req.body.Body;
  const from: string = req.body.From;
  const mediaUrl: string | undefined = req.body.MediaUrl0;
  const mediaType: string | undefined = req.body.MediaContentType0;
  let supabaseUrl: string | null = null;

  console.log("📨 Received message:", message, "from:", from);

  if (mediaUrl && mediaType) {
    const fileExtension = mediaType.split("/")[1] || "bin";
    const filename = `whatsapp-media-${Date.now()}.${fileExtension}`;
    const savedFilePath = await downloadMedia(mediaUrl, filename);

    if (savedFilePath) {
      console.log("📂 Media saved locally at:", savedFilePath);

      // Upload to Supabase
      supabaseUrl = await uploadToSupabase(savedFilePath);

      // Delete the local file
      fs.unlinkSync(savedFilePath);
      console.log("🗑 Deleted local file:", savedFilePath);
    }
  }

  res.send(
    `<Response><Message>Thanks for your message: ${message}, Link: ${supabaseUrl}</Message></Response>`
  );
};
