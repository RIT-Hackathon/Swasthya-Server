import { supabase } from "../config/supabase.config";
import { findUserIdByPhone } from "./user.utils";

export const getLatestIncompleteIntent = async (phone: string) => {
  try {
    const { data, error } = await supabase
      .from("UserIntentTracking")
      .select("id, userId, intent, updatedAt, isCompleted")
      .eq("phone", phone)
      .eq("isCompleted", false)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(
        "❌ Error fetching latest incomplete intent:",
        error.message
      );
      return null;
    }

    return data;
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return null;
  }
};

export const createNewIntent = async (phone: string, intent: string) => {
  try {
    // 🔍 Fetch userId based on phone
    const userId = await findUserIdByPhone(phone);
    if (!userId) {
      console.error("❌ No user found with phone:", phone);
      return null;
    }

    // 📌 Insert new intent entry
    const { data, error } = await supabase
      .from("UserIntentTracking")
      .insert([{ phone, userId, intent, isCompleted: false }])
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating new intent:", error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error("❌ Unexpected error creating intent:", error);
    return null;
  }
};
