import { Response } from "express";
import { downloadMedia } from "../utils/mediaDownload.utils";
import { uploadToSupabase } from "../utils/mediaUpload.utils";
import { supabase } from "../config/supabase.config";
import { findUserIdByPhone } from "../utils/user.utils";
import fs from "fs";
import axios from "axios";

export const handleUploadDocument = async (
  from: string,
  message: string,
  mediaUrl: string | undefined,
  mediaType: string | undefined,
  res: Response
) => {
  let supabaseUrl: string | null = null;
  console.log(`Inside Upload Document: ${from}, ${message}, ${mediaUrl}`);

  if (message.trim().toUpperCase() === "STOP UPLOAD") {
    console.log("🛑 User requested to cancel upload.");
    await supabase.from("CacheUploads").delete().eq("phone", from);
    await supabase
      .from("UserIntentTracking")
      .update({ isCompleted: true })
      .eq("phone", from);
    return res.send(
      `<Response><Message>✅ Upload operation canceled.</Message></Response>`
    );
  }

  // Get user ID
  const userId = await findUserIdByPhone(from);
  if (!userId) {
    console.error("❌ User not found for phone:", from);
    return res.send(
      `<Response><Message>⚠️ Error: User not found.</Message></Response>`
    );
  }

  // Check existing cache entry
  const { data: existingEntry } = await supabase
    .from("CacheUploads")
    .select()
    .eq("userId", userId)
    .single();

  let reportType = null;

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

  // Report type mapping
  const reportTypeMap: { [key: string]: string } = {
    blood: "BLOOD_TEST",
    xray: "X_RAY",
    "x-ray": "X_RAY",
    mri: "MRI",
    ct: "CT_SCAN",
    "ct scan": "CT_SCAN",
    urine: "URINE_TEST",
    ecg: "ECG",
  };

  // Convert message to lowercase and check for report keywords
  const words = message.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (reportTypeMap[word]) {
      reportType = reportTypeMap[word];
      break;
    }
  }

  // Case 1: No existing cache entry
  if (!existingEntry) {
    console.log("🆕 No existing cache, creating new entry...");

    // Prepare insert object dynamically (exclude null values)
    const cacheEntry: any = { userId, phone: from };
    if (supabaseUrl) cacheEntry.mediaId = supabaseUrl;
    if (reportType) cacheEntry.reportType = reportType;

    const { error: specialError } = await supabase
      .from("CacheUploads")
      .insert([cacheEntry]);

    if (specialError) {
      console.error(
        "❌ Error inserting into CacheUploads:",
        specialError.message
      );
    } else {
      console.log("✅ Cache entry created successfully!");
    }

    if (!supabaseUrl) {
      return res.send(
        `<Response><Message>📎 Please upload the document.</Message></Response>`
      );
    }
    if (!reportType) {
      return res.send(
        `<Response><Message>📄 Please specify the type of report (e.g., BLOOD_TEST).</Message></Response>`
      );
    }
  }

  // Case 2: Update existing entry
  else {
    console.log("🔄 Updating existing cache entry...");
    const updatedMediaId = supabaseUrl || existingEntry.mediaId;
    const updatedReportType = reportType || existingEntry.reportType;

    await supabase
      .from("CacheUploads")
      .update({ mediaId: updatedMediaId, reportType: updatedReportType })
      .eq("userId", userId);

    // If both media and report type are available, move to UserReports
    if (updatedMediaId && updatedReportType) {
      console.log("✅ Upload complete, moving to UserReports...");

      const { error: MigrationError } = await supabase
        .from("UserReports")
        .insert([
          {
            userId,
            phone: from,
            mediaId: updatedMediaId,
            reportType: updatedReportType,
          },
        ]);

      console.log("🚀 ~ MigrationError:", MigrationError);

      // Delete cache entry and mark intent completed
      await supabase.from("CacheUploads").delete().eq("userId", userId);
      await supabase
        .from("UserIntentTracking")
        .update({ isCompleted: true })
        .eq("phone", from);

      try {
        const response = await axios.post("http://127.0.0.1:8000/extract", {
          user_id: userId,
          file_url: updatedMediaId, // Assuming mediaId is the file URL
        });

        console.log("📝 Extraction response:", response.data);
      } catch (error) {
        console.error("❌ Error calling extraction API:", error);
      }

      return res.send(
        `<Response><Message>✅ Document uploaded successfully. You can retrieve it anytime.</Message></Response>`
      );
    }

    if (!updatedMediaId) {
      return res.send(
        `<Response><Message>📎 Please upload the document.</Message></Response>`
      );
    }
    if (!updatedReportType) {
      return res.send(
        `<Response><Message>📄 Please specify the type of report (e.g., BLOOD_TEST).</Message></Response>`
      );
    }
  }

  // Respond back to user
  res.send(
    `<Response><Message>✅ Document uploaded successfully. Link: ${supabaseUrl}</Message></Response>`
  );
};
