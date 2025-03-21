import { Router } from "express";
import {
  addLabAssistant,
  deleteLabAssistant,
  getLabAssistants,
  getAssignedAppointmentsByStatus,
} from "../controllers/lab_assistant.controller";

const router = Router();

// Add Lab Assistant ✅
router.post("/add", addLabAssistant);

// Delete Lab Assistant ✅
router.post("/delete", deleteLabAssistant);

// Get Assistants (Changed to POST) ✅
router.post("/assistants", getLabAssistants);

// Get Appointments by Status ✅
router.post("/assigned-appointments", getAssignedAppointmentsByStatus);

export default router;
