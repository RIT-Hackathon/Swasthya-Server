import express from "express";
import { getUserAppointments } from "../controllers/user.controller";

const router = express.Router();

router.get("/appointments", async (req, res, next) => {
  try {
    console.log("📨 Received request at /appointments:", req.body);
    await getUserAppointments(req, res);
  } catch (error) {
    console.error("❌ Error in /appointments route:", error);
    next(error);
  }
});

export default router;
