import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import twilioRoutes from "./routes/twilio.routes";
import labAssistantRoutes from "./routes/lab_assistant.routes";
import labRoutes from "./routes/labs.routes";
import userRoutes from "./routes/user.routes";
import patientRoutes from "./routes/patient.routes";

// Existing routes...


dotenv.config(); // Load environment variables

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
app.use("/api/patient", patientRoutes); // ⬅️ Add this
app.use("/api/auth", authRoutes);
app.use("/api/twilio", twilioRoutes);
app.use("/api/lab-assistant", labAssistantRoutes);
app.use("/api/appointments", labRoutes);
app.use("/api/user", userRoutes);

export default app;
