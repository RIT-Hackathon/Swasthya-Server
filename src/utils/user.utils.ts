import { supabase } from "../config/supabase.config";

export const findUserIdByPhone = async (
  phone: string
): Promise<string | null> => {
  try {
    console.log(`🔍 Searching for user with phone: ${phone}`);

    const { data, error } = await supabase
      .from("User")
      .select("id")
      .eq("phone", phone)
      .single();

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return null;
    }

    if (!data) {
      console.warn("⚠️ No user found for phone:", phone);
      return null;
    }

    console.log(`✅ User found: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error("❌ Unexpected error finding user by phone:", error);
    return null;
  }
};

export const checkIfPatientAddressExists = async (
  userId: string
): Promise<boolean> => {
  try {
    console.log(`🔍 Checking address for user: ${userId}`);

    const { data, error } = await supabase
      .from("Patient")
      .select("userId, address")
      .eq("userId", userId)
      .single();

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return false;
    }

    if (!data || !data.address) {
      console.warn(`⚠️ No address found for user: ${userId}`);
      return false;
    }

    console.log(`✅ Address exists for user: ${userId}`);
    return true;
  } catch (error) {
    console.error("❌ Unexpected error checking user address:", error);
    return false;
  }
};

