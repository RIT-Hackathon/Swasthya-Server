import express from "express";
import {
  getAppointmentsByStatus,
  updateAppointmentStatusToReportGenerated,
  confirmAppointment,
} from "../controllers/labs.controller";

const router = express.Router();

// Route for fetching appointments by status
router.get("/status", getAppointmentsByStatus);

// Route for updating appointment status to "REPORT_GENERATED"
router.post("/report-generated", updateAppointmentStatusToReportGenerated);

// Route for confirming an appointment
router.patch("/confirm", confirmAppointment);

export default router;
