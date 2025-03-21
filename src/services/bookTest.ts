import { Response } from "express";
import { supabase } from "../config/supabase.config";
import {
  findUserIdByPhone,
  checkIfPatientAddressExists,
} from "../utils/user.utils";
import moment from "moment";
import { sendWhatsAppMessage } from "../utils/twilio.utils";

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
      .eq("phone", from)
      .eq("intent", "BOOK_TEST");
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

  let typeoftest = null;

  const typeoftestMap: { [key: string]: string } = {
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
    if (typeoftestMap[word]) {
      typeoftest = typeoftestMap[word];
      break;
    }
  }

  let dateoftest: string | null = null;
  let timeoftest: string | null = null;

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
      dateoftest = targetDate.toISOString().split("T")[0];
      break;
    }
  }

  // Check for approximate time keywords
  for (const word of words) {
    if (timeKeywords[word]) {
      timeoftest = timeKeywords[word];
      break;
    }
  }

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
        dateoftest = parsedDate.format("YYYY-MM-DD"); // Convert to YYYY-MM-DD
        console.log("✅ Parsed Date:", dateoftest);
      }
    }

  // Check for specific times (e.g., 9AM, 14:30)
  const timeMatch = message.match(/(\d{1,2}(:\d{2})?\s?(AM|PM|am|pm)?)/);
  if (!dateMatch && timeMatch) {
    let extractedTime = timeMatch[0].toUpperCase();
    extractedTime = extractedTime.replace(/\s+/g, ""); // Remove spaces

    // Convert 12-hour format (e.g., 9AM, 10:30 PM) to 24-hour
    if (extractedTime.includes("AM") || extractedTime.includes("PM")) {
      timeoftest = moment(extractedTime, ["hA", "h:mmA"]).format("HH:mm:ss");
    } else if (extractedTime.includes(":")) {
      timeoftest = moment(extractedTime, "HH:mm").format("HH:mm:ss");
    } else {
      timeoftest = moment(extractedTime, "H").format("HH:mm:ss");
    }
  }

  // Check for specific dates (e.g., 10/11, March 20, 20-03-2025

  console.log("📅 Extracted Date:", dateoftest);
  console.log("⏰ Extracted Time:", timeoftest);

  if (!existingEntry) {
    console.log("🆕 No existing cache, creating new entry...");
    const cacheEntry: any = { userId, phone: from, ifaddress: true };

    if (typeoftest) cacheEntry.typeoftest = typeoftest;
    if (dateoftest) cacheEntry.dateoftest = dateoftest;
    if (timeoftest) cacheEntry.timeoftest = timeoftest;

    const { error } = await supabase.from("CacheBooking").insert([cacheEntry]);

    if (error) {
      console.error("❌ Error inserting into CacheBooking:", error);
      return res.send(
        `<Response><Message>⚠️ Error saving booking. Please try again.</Message></Response>`
      );
    }

    if (!typeoftest) {
      console.log("Here Type");
      return res.send(`<Response><Message>📄 Please specify the type of test (e.g., BLOOD, XRAY).</Message></Response>`);
    }

    if (!dateoftest) {
      console.log("Here Date");
      return res.send('<Response><Message>📅 Please specify a date for the test.</Message></Response>');
    }

    if (!timeoftest) {
      console.log("Here Time");
      return res.send(
        `<Response><Message>⏰ Please specify a time for the test.</Message></Response>`);
    }
  } else {
    console.log("🛠 Updating existing cache entry...");
    let updates: any = {};

    if (!existingEntry.typeoftest && typeoftest)
      updates.typeoftest = typeoftest;
    if (!existingEntry.dateoftest && dateoftest)
      updates.dateoftest = dateoftest;
    if (!existingEntry.timeoftest && timeoftest)
      updates.timeoftest = timeoftest;

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

    let { data: updatedEntry } = await supabase
    .from("CacheBooking")
    .select()
    .eq("userId", userId)
    .single();

    if (
      (!updatedEntry.ifhome && typeoftest === "BLOOD_TEST") ||
      typeoftest === "URINE_TEST"
    ) {
      console.log("Inside Home");
      return res.send(`<Response><Message>🏠 Do you want a home appointment? (YES/NO)</Message></Response>`);
    }

    if (
      !updatedEntry.ifhome &&
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

    if (!updatedEntry.typeoftest && !typeoftest) {
      console.log("Here test exists");
      return res.send(
        `<Response><Message>📄 Please specify the type of test (e.g., BLOOD, XRAY).</Message></Response>`
      );
    }

    if (!updatedEntry.dateoftest && !dateoftest) {
      console.log("Here date exists");
      return res.send(
        `<Response><Message>📅 Please specify a date for the test.</Message></Response>`
      );
    }
    if(!updatedEntry.dateoftest && dateoftest) {
      updates.dateoftest = dateoftest;
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

    if (!updatedEntry.timeoftest && !timeoftest) {
      console.log("Here time exist");
      return res.send(
        `<Response><Message>⏰ Please specify a time for the test.</Message></Response>`
      );
    }
    if(!updatedEntry.timeoftest && timeoftest) {
      updates.timeoftest = timeoftest;
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

    const {data : latestEntry} = await supabase.from("CacheBooking").select().eq("userId", userId).single();
    console.log("🚀 ~ latestEntry:", latestEntry);

    //TODO: Add autoAppointmentCheck
    console.log("✅ Booking ready to save!");
// Extract date and time
const datePart = moment(latestEntry.dateoftest, "YYYY-MM-DD").format("YYYY-MM-DD");
const timePart = moment(latestEntry.timeoftest, "HH:mm").format("HH:mm");

console.log("📅 Date Part:", latestEntry.dateoftest);
console.log("⏰ Time Part:", latestEntry.timeoftest);

// Combine them into scheduledAt
const scheduledAt = `${datePart} ${timePart}`;
console.log("📅 Scheduled At:", scheduledAt);

  // Insert into Bookings
  const { error: UploadError } = await supabase
    .from("Appointment")
    .insert([{ patientId: latestEntry.userId, labId: '007e5c76-f89d-4704-9c0f-6c3c1fb1a184', scheduledAt, status: latestEntry.ifhome ? 'HOME' : 'PENDING', testType: latestEntry.typeoftest, homeAppointment: latestEntry.ifhome }]);

// Delete from CacheBooking
const { error: cacheDeleteError } = await supabase
  .from("CacheBooking")
  .delete()
  .eq("userId", userId);


    console.log("🚀 ~ UploadError:", UploadError);
    console.log("🚀 ~ cacheDeleteError:", cacheDeleteError);

    return res.send(
      `<Response><Message>✅ Your test has been booked successfully!</Message></Response>`
    );
  }
};
