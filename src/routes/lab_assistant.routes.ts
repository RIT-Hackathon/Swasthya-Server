import { Router } from "express";
import {
  addLabAssistant,
  deleteLabAssistant,
  getLabAssistants,
} from "../controllers/lab_assistant.controller";

const router = Router();

router.post("/add", async (req, res, next) => {
  try {
    console.log("📨 Received request at /add:", req.body);
    await addLabAssistant(req, res);
  } catch (error) {
    console.error("❌ Error in /add route:", error);
    next(error);
  }
});
router.delete("/delete", async (req, res, next) => {
  try {
    console.log("📨 Received request at /delete:", req.body);
    await deleteLabAssistant(req, res);
  } catch (error) {
    console.error("❌ Error in /delete route:", error);
    next(error);
  }
});
router.get("/assistants", async (req, res, next) => {
  try {
    console.log("📨 Received request at /assistants:", req.body);
    await getLabAssistants(req, res);
  } catch (error) {
    console.error("❌ Error in /assistants route:", error);
    next(error);
  }
});

export default router;
