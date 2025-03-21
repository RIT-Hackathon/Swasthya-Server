import { Response } from "express";
import { supabase } from "../config/supabase.config";
import { findUserIdByPhone } from "../utils/user.utils";
import moment from "moment";

export const handleRetrieveDocument = async (
  from: string,
  message: string,
  res: Response
) => {
  console.log(`Inside Retrieve Document: ${from}, ${message}`);

  if (message.trim().toUpperCase() === "STOP RETRIEVAL") {
    console.log("🛑 User requested to cancel retrieval.");
    await supabase.from("CacheRetrievals").delete().eq("phone", from);
    await supabase
      .from("UserIntentTracking")
      .update({ isCompleted: true })
      .eq("phone", from)
      .eq("intent", "RETRIEVE_DOCUMENT");
    return res.send(
      `<Response><Message>✅ Retrieval operation canceled.</Message></Response>`
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

  const { data: existingEntry } = await supabase
    .from("CacheRetrievals")
    .select()
    .eq("userId", userId)
    .single();

  let reportType = null;

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

  // Detect report type
  const words = message.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (reportTypeMap[word]) {
      reportType = reportTypeMap[word];
      break;
    }
  }

  let dataOfReport: string | null = null;

  // Improved date extraction (ensures YYYY-MM-DD format)
  const dateMatch = message.match(
    /\b(\d{1,2}[\/-]\d{1,2}[\/-]?\d{2,4}|\d{4}-\d{2}-\d{2}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s\d{1,2}(?:,\s\d{4})?)\b/gi
  );

  if (dateMatch) {
    const extractedDate = dateMatch[0];
    console.log("📅 Extracted Raw Date:", extractedDate);

    // Parse using multiple formats
    const parsedDate = moment(
      extractedDate,
      ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMM YYYY", "MMM D, YYYY", "DD-MM-YYYY"],
      true
    );

    if (parsedDate.isValid()) {
      dataOfReport = parsedDate.format("YYYY-MM-DD"); // Convert to YYYY-MM-DD
      console.log("✅ Parsed Date:", dataOfReport);
    }
  }

  if (!existingEntry) {
    console.log("🆕 No existing cache, creating new entry...");
    const cacheEntry: any = { userId, phone: from };

    if (reportType) cacheEntry.typeoftest = reportType;
    if (dataOfReport) cacheEntry.dataOfReport = dataOfReport;

    const { error } = await supabase.from("CacheRetrievals").insert([cacheEntry]);

    if (error) {
      console.error("❌ Error inserting into CacheBooking:", error);
      return res.send(
        `<Response><Message>⚠️ Error saving booking. Please try again.</Message></Response>`
      );
    }

    if (!reportType) {
      return res.send(
        `<Response><Message>📄 Please specify the type of report (e.g., BLOOD_TEST).</Message></Response>`
      );
    }

    if (!dataOfReport) {
      return res.send(
        `<Response><Message>📅 Please specify a date for the report.</Message></Response>`
      );
    }
  } else {
    console.log("🔄 Updating existing cache entry...");

    const updatedReportType = reportType || existingEntry.reportType;
    const updateddataOfReport = dataOfReport || existingEntry.dataOfReport;

    console.log("📄 Updated Report Type:", updatedReportType);
    console.log("📅 Updated Date:", updateddataOfReport);

    const { error: updateError } = await supabase
      .from("CacheRetrievals")
      .update({ reportType: updatedReportType, dataOfReport: updateddataOfReport })
      .eq("userId", userId);

    if (updateError) {
      console.error("❌ Error updating CacheRetrievals:", updateError);
    }

    if (updatedReportType && updateddataOfReport) {
      console.log("✅ Retrieval complete, moving to UserReports...");

      // Find the latest report before the given date
  const { data: latestReport, error: findError } = await supabase
  .from("UserReports")
  .select("*")
  .eq("userId", userId)
  .eq("reportType", updatedReportType)
  .lt("uploadedAt", new Date().toISOString()) // Finds reports before today
  .order("uploadedAt", { ascending: false }) // Get latest first
  .limit(1)
  .single();

  if (findError) {
    console.error("❌ Error fetching latest report:", findError);
  }

  if (!latestReport) {
    return res.send(
      `<Response><Message>⚠️ No previous ${updatedReportType} reports found.</Message></Response>`
    );
  }

      const { error: deleteError } = await supabase
        .from("CacheRetrievals")
        .delete()
        .eq("userId", userId);

      const { error: intentUpdateError } = await supabase
        .from("UserIntentTracking")
        .update({ isCompleted: true })
        .eq("phone", from)
        .eq("intent", "RETRIEVE_DOCUMENT");

      if (deleteError || intentUpdateError) {
        console.error("🚀 ~ MigrationError:", deleteError, intentUpdateError);
      }

      return res.send(
        `<Response><Message>✅ Document retrieved successfully. Link: ${latestReport.mediaId}</Message></Response>`
      );
    }

    if (!reportType) {
      return res.send(
        `<Response><Message>📄 Please specify the type of report (e.g., BLOOD_TEST).</Message></Response>`
      );
    }

    if (!dataOfReport) {
      return res.send(
        `<Response><Message>📅 Please specify a date for the report.</Message></Response>`
      );
    }
  }

  return res.send(
    `<Response><Message>📄 Please specify the type of report (e.g., BLOOD_TEST).</Message></Response>`
  );
};
