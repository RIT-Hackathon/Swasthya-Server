import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../config/supabase.config";
import { ApiResponse, ApiError } from "../config/api.config";
import {
  AddLabAssistantRequest,
  DeleteLabAssistantRequest,
  GetLabAssistantsRequest,
} from "../types/labs.types";

// 🟢 Add Lab Assistant
export const addLabAssistant = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { labHeadId, labId, name, email, phone }: AddLabAssistantRequest =
      req.body;

    // Validate Lab Head
    const { data: labHead, error: headError } = await supabase
      .from("LabHead")
      .select("labId")
      .eq("userId", labHeadId)
      .single();

    if (headError || !labHead || labHead.labId !== labId) {
      throw new ApiError(
        403,
        "Unauthorized: You cannot add an assistant to this lab"
      );
    }

    // Create Assistant in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: String(phone),
    });
    if (error) throw new ApiError(400, error.message);
    if (!data.user) throw new ApiError(500, "User registration failed");

    const userId = data.user.id;

    // Force Email Confirmation (Requires Service Role Key)
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    // Insert into `User` table
    const { error: userError } = await supabase
      .from("User")
      .insert([{ id: userId, name, email, phone, role: "LAB_ASSISTANT" }]);
    if (userError) throw new ApiError(400, userError.message);

    // Insert into `LabAssistant` table
    const { error: assistantError } = await supabase
      .from("LabAssistant")
      .insert([{ userId, labId }]);
    if (assistantError) throw new ApiError(400, assistantError.message);

    return res.status(201).json(
      new ApiResponse(201, {
        message: "Lab Assistant added successfully",
        userId,
      })
    );
  } catch (err) {
    console.error("❌ Error adding lab assistant:", err);
    return res
      .status((err instanceof ApiError ? err.statusCode : 500) || 500)
      .json(
        new ApiError(
          err instanceof ApiError ? err.statusCode : 500,
          err instanceof ApiError ? err.message : "An unexpected error occurred"
        )
      );
  }
};

// 🔴 Delete Lab Assistant
export const deleteLabAssistant = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { labHeadId, assistantId }: DeleteLabAssistantRequest = req.body;

    // Validate Lab Head
    const { data: labHead, error: headError } = await supabase
      .from("LabHead")
      .select("labId")
      .eq("userId", labHeadId)
      .single();

    const { data: assistant, error: assistantError } = await supabase
      .from("LabAssistant")
      .select("labId")
      .eq("userId", assistantId)
      .single();

    if (
      headError ||
      assistantError ||
      !labHead ||
      !assistant ||
      labHead.labId !== assistant.labId
    ) {
      throw new ApiError(403, "Unauthorized: You cannot delete this assistant");
    }

    // Delete Assistant from `LabAssistant` table
    const { error: deleteError } = await supabase
      .from("LabAssistant")
      .delete()
      .eq("userId", assistantId);
    if (deleteError) throw new ApiError(400, deleteError.message);

    // Delete from `User` table
    const { error: userDeleteError } = await supabase
      .from("User")
      .delete()
      .eq("id", assistantId);
    if (userDeleteError) throw new ApiError(400, userDeleteError.message);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { message: "Lab Assistant deleted successfully" })
      );
  } catch (err) {
    console.error("❌ Error deleting lab assistant:", err);
    return res
      .status((err instanceof ApiError ? err.statusCode : 500) || 500)
      .json(
        new ApiError(
          err instanceof ApiError ? err.statusCode : 500,
          err instanceof ApiError ? err.message : "An unexpected error occurred"
        )
      );
  }
};

export const getLabAssistants = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { labId, headId }: GetLabAssistantsRequest = req.body;

    // Verify if headId belongs to the given lab
    const { data: labHead, error: headError } = await supabase
      .from("LabHead")
      .select("userId")
      .eq("labId", labId)
      .single();

    if (headError || !labHead || labHead.userId !== headId) {
      throw new ApiError(403, "Unauthorized: You are not the head of this lab");
    }

    // Fetch all assistants for the given lab
    const { data: assistants, error: assistantsError } = await supabase
      .from("LabAssistant")
      .select("userId")
      .eq("labId", labId);

    if (assistantsError) throw new ApiError(400, assistantsError.message);
    if (!assistants || assistants.length === 0) {
      return res.status(200).json(new ApiResponse(200, []));
    }

    // Extract userIds
    const userIds = assistants.map((assistant) => assistant.userId);

    // Fetch user details separately
    const { data: users, error: usersError } = await supabase
      .from("User")
      .select("id, name, email, phone")
      .in("id", userIds);

    if (usersError) throw new ApiError(400, usersError.message);

    return res.status(200).json(new ApiResponse(200, users));
  } catch (err) {
    console.error("❌ Error fetching lab assistants:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// 🟡 Get Lab Assistant's Appointments by Status
export const getAssignedAppointmentsByStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { assistantId, status } = req.query; // ✅ Read from query params

    if (!assistantId || !status) {
      return res.status(400).json(new ApiError(400, "Missing parameters"));
    }

    const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED"];
    if (!validStatuses.includes(status as string)) {
      return res.status(400).json(new ApiError(400, "Invalid status"));
    }

    // Fetch assistant's assigned appointments
    const { data: appointments, error: appointmentError } = await supabase
      .from("AssistantSchedule")
      .select("appointmentId")
      .eq("assistantId", assistantId);

    if (appointmentError) throw new ApiError(400, appointmentError.message);
    if (!appointments || appointments.length === 0)
      return res.status(200).json(new ApiResponse(200, []));

    const appointmentIds = appointments.map((a) => a.appointmentId);

    // Fetch appointment details along with patientId
    const { data: appointmentDetails, error: detailsError } = await supabase
      .from("Appointment")
      .select("id, scheduledAt, status, testType, homeAppointment, patientId")
      .in("id", appointmentIds)
      .eq("status", status);

    if (detailsError) throw new ApiError(400, detailsError.message);
    if (!appointmentDetails || appointmentDetails.length === 0)
      return res.status(200).json(new ApiResponse(200, []));

    const patientIds = [...new Set(appointmentDetails.map((a) => a.patientId))];

    // Fetch patient user details
    const { data: patients, error: patientError } = await supabase
      .from("User")
      .select("id, name, email, phone")
      .in("id", patientIds);

    if (patientError) throw new ApiError(400, patientError.message);

    // Map patient details to their IDs
    const patientMap = patients.reduce((acc, p) => {
      acc[p.id] = { name: p.name, email: p.email, phone: p.phone };
      return acc;
    }, {} as Record<string, { name: string; email: string; phone: string }>);

    // Attach patient info to appointments
    const enrichedAppointments = appointmentDetails.map((a) => ({
      ...a,
      patient: patientMap[a.patientId] || null,
    }));

    return res.status(200).json(new ApiResponse(200, enrichedAppointments));
  } catch (err) {
    console.error("❌ Error fetching assistant appointments:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
