import { Request, Response } from "express";
import { supabase } from "../config/supabase.config";
import { ApiResponse, ApiError } from "../config/api.config";

// GET - Fetch patient's appointments using query param
export const getPatientAppointments = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { patientId } = req.query as { patientId: string };

    if (!patientId) {
      return res.status(400).json(new ApiError(400, "Patient ID is required"));
    }

    const { data: appointments, error } = await supabase
      .from("Appointment")
      .select(`
        id,
        labId,
        scheduledAt,
        status,
        testType,
        homeAppointment
      `)
      .eq("patientId", patientId);

    console.log("📨 Appointments data:", appointments);

    if (error) throw new ApiError(400, error.message);

    const labIds = appointments.map((appt: any) => appt.labId);
    const { data: labs, error: labError } = await supabase
      .from("Lab")
      .select("id, name")
      .in("id", labIds);

    if (labError) throw new ApiError(400, labError.message);

    const appointmentsWithLabNames = appointments.map((appt: any) => {
      const lab = labs.find((l: any) => l.id === appt.labId);
      return {
        ...appt,
        labName: lab ? lab.name : "Unknown",
      };
    });

    return res.status(200).json(new ApiResponse(200, appointmentsWithLabNames));
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// GET - Generate signed URL for a document from query param
export const getDocumentSignedUrl = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { userId } = req.query as { userId: string };

    if (!userId) {
      return res.status(400).json(new ApiError(400, "User ID is required"));
    }

    const { data, error } = await supabase
      .from("UserReports")
      .select(
        `id, userId, mediaId, reportType, description, uploadedAt`)
      .eq("userId", userId);

    if (error) throw new ApiError(400, error.message);

    return res.status(200).json(new ApiResponse(200, { data }));
  } catch (err) {
    console.error("❌ Error generating signed URL:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
