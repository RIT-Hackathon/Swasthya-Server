import { Request, Response } from "express";
import { handleUploadDocument } from "../services/uploadDocument";
import { handleBooktest } from "../services/bookTest";
import { handleRetrieveDocument } from "../services/retrieveDocument";
import {
  getLatestIncompleteIntent,
  createNewIntent,
} from "../utils/intent.utils";

export const respondToQuery = async (req: Request, res: Response) => {
  const message: string = req.body.Body;
  let from: string = req.body.From;
  const mediaUrl: string | undefined = req.body.MediaUrl0;
  const mediaType: string | undefined = req.body.MediaContentType0;

  // Remove 'whatsapp+' from the beginning
  if (from.startsWith("whatsapp:")) {
    from = from.replace("whatsapp:", "").trim();
  }

  console.log("📨 Received message:", message, "from:", from);

  try {
    const existingIntent = await getLatestIncompleteIntent(from);

    if (existingIntent) {
      console.log("🔄 Resuming existing intent:", existingIntent.intent);

      // if (existingIntent.intent === "UPLOAD_DOCUMENT") {
      //   return handleUploadDocument(from, message, mediaUrl, mediaType, res);
      // }
      if (existingIntent.intent === "BOOK_TEST") {
        return handleBooktest(from, message, res);
      }
      // if(existingIntent.intent === "RETRIEVE_DOCUMENT") {
      //   return handleRetrieveDocument(from, message, res);
      // }
    } else {
      const IDENTIFIED_INTENT = "BOOK_TEST"; // Identify intent from message
      console.log("🔍 Identified intent:", IDENTIFIED_INTENT);

      const newIntent = await createNewIntent(from, IDENTIFIED_INTENT);

      if (!newIntent) {
        console.error("❌ Failed to create new intent.");
        return res.send(
          `<Response><Message>⚠️ Unable to process request. Please try again later.</Message></Response>`
        );
      }

      console.log("✨ Created new intent:", newIntent.intent);

      // if (IDENTIFIED_INTENT === "UPLOAD_DOCUMENT") {
      //   return handleUploadDocument(from, message, mediaUrl, mediaType, res);
      // }
      if (IDENTIFIED_INTENT === "BOOK_TEST") {
        return handleBooktest(from, message, res);
      }
      // if(IDENTIFIED_INTENT === "RETRIEVE_DOCUMENT") {
      //   return handleRetrieveDocument(from, message, res);
      // }
    }
  } catch (error) {
    console.error("❌ Error processing intent:", error);
    // Default response for now
    res.send(
      `<Response><Message>⚠️ Server error. Please try again later.</Message></Response>`
    );
  }
};
