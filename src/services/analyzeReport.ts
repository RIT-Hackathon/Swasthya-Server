import { Response } from "express";
import { supabase } from "../config/supabase.config";
import { findUserIdByPhone } from "../utils/user.utils";
import axios from "axios";

export const handleAnalyzeReport = async (
  from: string,
  message: string,
  res: Response
) => {
  console.log("Inside Analyze Report: ", from, message);

  // Get user ID
  const userId = await findUserIdByPhone(from);
  if (!userId) {
    console.error("❌ User not found for phone:", from);
    return res.send(
      `<Response><Message>⚠️ Error: User not found.</Message></Response>`
    );
  }

  try {
    const response = await axios.post("http://localhost:8000/suggest", {
      user_id: userId,
      user_query: message,
    });

    console.log("🔍 Suggested report:", response.data);

    return res.send(
      `<Response><Message>${response.data.suggestions}</Message></Response>`
    );
  } catch (error) {
    console.error("❌ Error in handleAnalyzeReport:", error);
  }
};
