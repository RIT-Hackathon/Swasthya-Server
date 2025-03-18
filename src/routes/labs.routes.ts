import express from "express";
import { getAppointmentsByStatus } from "../controllers/labs.controller";

const router = express.Router();

// Route for fetching appointments by status
router.get("/status", getAppointmentsByStatus);

export default router;
