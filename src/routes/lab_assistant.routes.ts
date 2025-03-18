import { Router } from "express";
import {
  addLabAssistant,
  deleteLabAssistant,
  getLabAssistants,
} from "../controllers/lab_assistant.controller";

const router = Router();

router.post("/add", addLabAssistant);
router.delete("/delete", deleteLabAssistant);
router.get("/assistants", getLabAssistants);

export default router;
