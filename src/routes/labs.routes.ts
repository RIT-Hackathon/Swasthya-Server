import express from "express";
import {
  getAppointmentsByStatus,
  updateAppointmentStatusToReportGenerated,
  confirmAppointment,
} from "../controllers/labs.controller";

const router = express.Router();

// Route for fetching appointments by status
router.get("/status", async (req, res, next) => {
  try {
    console.log("📨 Received request at /status:", req.body);
    await getAppointmentsByStatus(req, res);
  } catch (error) {
    console.error("❌ Error in /status route:", error);
    next(error);
  }
});

// Route for updating appointment status to "REPORT_GENERATED"
router.post("/report-generated", async (req, res, next) => {
  try {
    console.log("📨 Received request at /report-generated:", req.body);
    await updateAppointmentStatusToReportGenerated(req, res);
  } catch (error) {
    console.error("❌ Error in /report-generated route:", error);
    next(error);
  }
});

// Route for confirming an appointment
router.patch("/confirm", async (req, res, next) => {
  try {
    console.log("📨 Received request at /confirm:", req.body);
    await confirmAppointment(req, res);
  } catch (error) {
    console.error("❌ Error in /confirm route:", error);
    next(error);
  }
});

export default router;
