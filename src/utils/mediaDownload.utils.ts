import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const uploadPath = path.join(process.cwd(), "public/uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/**
 * Downloads media from Twilio and saves it locally.
 * @param mediaUrl - The Twilio media URL.
 * @param filename - The name of the file to save.
 * @returns The file path if successful, otherwise null.
 */
export const downloadMedia = async (
  mediaUrl: string,
  filename: string
): Promise<string | null> => {
  try {
    const response = await axios({
      url: mediaUrl,
      method: "GET",
      responseType: "stream",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64")}`,
      },
    });

    const filePath = path.join(uploadPath, filename);
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(filePath));
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("❌ Error downloading media:", error);
    return null;
  }
};
