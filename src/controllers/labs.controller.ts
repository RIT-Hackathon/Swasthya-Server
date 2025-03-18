import { Request, Response } from "express";
import { supabase } from "../config/supabase.config";
import { ApiError, ApiResponse } from "../config/api.config";
import { GetAppointmentsRequest } from "../types/labs.types";

// 🟡 Fetch Appointments by Status
export const getAppointmentsByStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { labId, status } = req.body as GetAppointmentsRequest;

    // Validate status
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "REPORT_GENERATED",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(new ApiError(400, "Invalid status"));
    }

    // Fetch appointments with the given status for the specified lab
    const { data: appointments, error } = await supabase
      .from("Appointment")
      .select(
        `
          id, 
          patientId, 
          labId, 
          scheduledAt, 
          status, 
          testType
        `
      )
      .eq("labId", labId)
      .eq("status", status);

    if (error) throw new ApiError(400, error.message);

    // Fetch patient names from User table based on patientId for each appointment
    const patientIds = appointments.map(
      (appointment: any) => appointment.patientId
    );
    const { data: users, error: userError } = await supabase
      .from("User")
      .select("id, name")
      .in("id", patientIds);

    if (userError) throw new ApiError(400, userError.message);

    // Map patient names to their respective appointments
    const appointmentsWithNames = appointments.map((appointment: any) => {
      const patient = users.find(
        (user: any) => user.id === appointment.patientId
      );
      return {
        ...appointment,
        patientName: patient ? patient.name : "Unknown",
      };
    });

    return res.status(200).json(new ApiResponse(200, appointmentsWithNames));
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
