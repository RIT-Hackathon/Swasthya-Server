import { Request, Response } from "express";
import { supabase } from "../config/supabase.config";
import { ApiError, ApiResponse } from "../config/api.config";

export const getUserAppointments = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { patientId } = req.body as { patientId: string };

    if (!patientId) {
      return res.status(400).json(new ApiError(400, "Patient ID is required"));
    }

    // Fetch all appointments for the given user
    const { data: appointments, error } = await supabase
      .from("Appointment")
      .select(
        `
            id, 
            labId, 
            scheduledAt, 
            status, 
            testType, 
            homeAppointment
          `
      )
      .eq("patientId", patientId);

    if (error) throw new ApiError(400, error.message);

    // Fetch lab names from Lab table
    const labIds = appointments.map((appt: any) => appt.labId);
    const { data: labs, error: labError } = await supabase
      .from("Lab")
      .select("id, name")
      .in("id", labIds);

    if (labError) throw new ApiError(400, labError.message);

    // Map lab names to appointments
    const appointmentsWithLabNames = appointments.map((appointment: any) => {
      const lab = labs.find((l: any) => l.id === appointment.labId);
      return {
        ...appointment,
        labName: lab ? lab.name : "Unknown",
      };
    });

    return res.status(200).json(new ApiResponse(200, appointmentsWithLabNames));
  } catch (err) {
    console.error("❌ Error fetching user appointments:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
