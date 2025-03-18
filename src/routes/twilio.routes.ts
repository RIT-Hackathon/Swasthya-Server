import express from "express";
import { respondToQuery } from "../controllers/twilio.controller";

const router = express.Router();

router.post("/respond-to-query", async (req, res, next) => {
  try {
    console.log("📨 Received request at /respond-to-query:", req.body);
    respondToQuery(req, res);
  } catch (error) {
    console.error("❌ Error in /respond-to-query route:", error);
    next(error);
  }
});

export default router;
