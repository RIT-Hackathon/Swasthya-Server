import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

export const sendWhatsAppMessage = async (to: string, message: string) => {
  try {
    const response = await client.messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:${to}`,
      body: message,
    });

    console.log(`📩 Message sent to ${to}: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error("❌ Error sending message:", error);
    return { success: false, error: error.message };
  }
};
