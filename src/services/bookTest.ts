import { Response } from "express";
import { supabase } from "../config/supabase.config";
import {
  findUserIdByPhone,
  checkIfPatientAddressExists,
} from "../utils/user.utils";
import moment from "moment";

export const handleBooktest = async (
  from: string,
  message: string,
  res: Response
) => {
  console.log(`Inside Book Test: ${from}, ${message}`);

  if (message.trim().toUpperCase() === "STOP BOOKING") {
    console.log("🛑 User requested to cancel booking.");
    await supabase.from("CacheUploads").delete().eq("phone", from);
    await supabase
      .from("UserIntentTracking")
      .update({ isCompleted: true })
      .eq("phone", from);
    return res.send(
      `<Response><Message>✅ Booking operation canceled.</Message></Response>`
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

  const addressExists = await checkIfPatientAddressExists(userId);
  if (!addressExists) {
    return res.send(
      `<Response><Message>⚠️ Error: Please update your address on portal first.</Message></Response>`
    );
  }

  const { data: existingEntry } = await supabase
    .from("CacheBooking")
    .select()
    .eq("userId", userId)
    .single();

  let reportType = null;

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

  let dateOfTest: string | null = null;
  let timeOfTest: string | null = null;

  const dateKeywords: { [key: string]: number } = {
    today: 0,
    tomorrow: 1,
    "day after tomorrow": 2,
  };

  const timeKeywords: { [key: string]: string } = {
    morning: "09:00:00",
    afternoon: "14:00:00",
    evening: "18:00:00",
    night: "20:00:00",
  };

  // Check for relative dates
  for (const word of words) {
    if (dateKeywords[word] !== undefined) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dateKeywords[word]);
      dateOfTest = targetDate.toISOString().split("T")[0];
      break;
    }
  }

  // Check for approximate time keywords
  for (const word of words) {
    if (timeKeywords[word]) {
      timeOfTest = timeKeywords[word];
      break;
    }
  }

  // Check for specific times (e.g., 9AM, 14:30)
  const timeMatch = message.match(/(\d{1,2}(:\d{2})?\s?(AM|PM|am|pm)?)/);
  if (timeMatch) {
    let extractedTime = timeMatch[0].toUpperCase();
    extractedTime = extractedTime.replace(/\s+/g, ""); // Remove spaces

    // Convert 12-hour format (e.g., 9AM, 10:30 PM) to 24-hour
    if (extractedTime.includes("AM") || extractedTime.includes("PM")) {
      timeOfTest = moment(extractedTime, ["hA", "h:mmA"]).format("HH:mm:ss");
    } else if (extractedTime.includes(":")) {
      timeOfTest = moment(extractedTime, "HH:mm").format("HH:mm:ss");
    } else {
      timeOfTest = moment(extractedTime, "H").format("HH:mm:ss");
    }
  }

  // Check for specific dates (e.g., 10/11, March 20, 20-03-2025)
  const dateMatch = message.match(
    /\b(\d{1,2}[\/-]\d{1,2}[\/-]?\d{0,4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s\d{1,2}(?:,\s\d{4})?)\b/gi
  );
  if (dateMatch) {
    const extractedDate = dateMatch[0];

    // Try parsing different date formats
    const parsedDate = moment(
      extractedDate,
      ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMM YYYY", "MMM D, YYYY"],
      true
    );
    if (parsedDate.isValid()) {
      dateOfTest = parsedDate.format("YYYY-MM-DD");
    }
  }

  console.log("📅 Extracted Date:", dateOfTest);
  console.log("⏰ Extracted Time:", timeOfTest);

  if (!existingEntry) {
    console.log("🆕 No existing cache, creating new entary...");
    const cacheEntry: any = { userId, phone: from, ifaddress: true };

    if (reportType) cacheEntry.reportType = reportType;
    if (dateOfTest) cacheEntry.dateOfTest = dateOfTest;
    if (timeOfTest) cacheEntry.timeOfTest = timeOfTest;

    const { error } = await supabase.from("CacheBooking").insert([cacheEntry]);
    if (error) {
      console.error("❌ Error inserting into CacheBooking:", error);
      return res.send(
        `<Response><Message>⚠️ Error saving booking. Please try again.</Message></Response>`
      );
    }

    if (reportType === null) {
      return res.send(
        `<Response><Message>📄 Please specify the type of test (e.g., BLOOD, XRAY).</Message></Response>`
      );
    }

    if (dateOfTest === null) {
      return res.send(
        `<Response><Message>📅 Please specify a date for the test.</Message></Response>`
      );
    }

    if (timeOfTest === null) {
      return res.send(
        `<Response><Message>⏰ Please specify a time for the test.</Message></Response>`
      );
    }
  } else {
    console.log("🛠 Updating existing cache entry...");
    let updates: any = {};

    if (!existingEntry.reportType && reportType)
      updates.reportType = reportType;
    if (!existingEntry.dateOfTest && dateOfTest)
      updates.dateOfTest = dateOfTest;
    if (!existingEntry.timeOfTest && timeOfTest)
      updates.timeOfTest = timeOfTest;

    console.log("🔄 Updates:", updates);

    if (
      (!existingEntry.ifhome && reportType === "BLOOD_TEST") ||
      reportType === "URINE_TEST"
    ) {
      return res.send(
        `<Response><Message>🏠 Do you want a home appointment? (YES/NO)</Message></Response>`
      );
    }

    console.log(existingEntry);

    if (
      !existingEntry.ifhome &&
      (message.trim().toUpperCase() === "YES" ||
        message.trim().toUpperCase() === "NO")
    ) {
      updates.ifhome = message.trim().toUpperCase() === "YES";
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("CacheBooking")
        .update(updates)
        .eq("userId", userId);
      if (error) {
        console.error("❌ Error updating CacheBooking:", error);
        return res.send(
          `<Response><Message>⚠️ Error updating booking details.</Message></Response>`
        );
      }
    }

    console.log(existingEntry);

    if (existingEntry.reportType === null && reportType === null) {
      return res.send(
        `<Response><Message>📄 Please specify the type of test (e.g., BLOOD, XRAY).</Message></Response>`
      );
    }

    if (existingEntry.dateOfTest === null && dateOfTest === null) {
      return res.send(
        `<Response><Message>📅 Please specify a date for the test.</Message></Response>`
      );
    }

    if (existingEntry.timeOfTest === null && timeOfTest === null) {
      return res.send(
        `<Response><Message>⏰ Please specify a time for the test.</Message></Response>`
      );
    }

    console.log("✅ Booking ready to save!");
    await supabase.from("Bookings").insert([existingEntry]);
    await supabase.from("CacheBooking").delete().eq("userId", userId);

    return res.send(
      `<Response><Message>✅ Your test has been booked successfully!</Message></Response>`
    );
  }
};
