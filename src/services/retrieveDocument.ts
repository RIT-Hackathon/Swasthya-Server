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
    await supabase.from("CacheUploads").delete().eq("phone", from);
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
};
