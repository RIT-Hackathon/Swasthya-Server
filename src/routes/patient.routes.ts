import express from "express";
import {
  getPatientAppointments,
  getDocumentSignedUrl,
} from "../controllers/patient.controller";

const router = express.Router();

// GET - Fetch patient appointment history via query param
router.get("/appointments", async (req, res, next) => {
  try {
    console.log("📨 GET /appointments:", req.query);
    await getPatientAppointments(req, res);
  } catch (error) {
    console.error("❌ Error in /appointments route:", error);
    next(error);
  }
});

// GET - Fetch signed document URL via query param
router.get("/document", async (req, res, next) => {
  try {
    console.log("📨 GET /document:", req.query);
    await getDocumentSignedUrl(req, res);
  } catch (error) {
    console.error("❌ Error in /document route:", error);
    next(error);
  }
});

export default router;
