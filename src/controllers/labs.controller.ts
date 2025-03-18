import { Request, Response } from "express";
import { supabase } from "../config/supabase.config";
import { ApiError, ApiResponse } from "../config/api.config";
import { GetAppointmentsRequest } from "../types/labs.types";
import { sendWhatsAppMessage } from "../utils/twilio.utils";

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
      "HOME",
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

export const updateAppointmentStatusToReportGenerated = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { appointmentId } = req.body;

    // Check if appointment exists and status is COMPLETED
    const { data: appointment, error: fetchError } = await supabase
      .from("Appointment")
      .select("id, status, patientId, labId, scheduledAt, testType")
      .eq("id", appointmentId)
      .single();

    if (fetchError) return res.status(400).json({ error: fetchError.message });

    if (appointment.status !== "COMPLETED") {
      return res
        .status(400)
        .json({ error: "Appointment is not in COMPLETED status" });
    }

    // Update status to 'REPORT_GENERATED'
    const { error: updateError } = await supabase
      .from("Appointment")
      .update({ status: "REPORT_GENERATED" })
      .eq("id", appointmentId);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Fetch lab name
    const { data: labData, error: labError } = await supabase
      .from("Lab")
      .select("name")
      .eq("id", appointment.labId)
      .single();

    if (labError) return res.status(400).json({ error: labError.message });

    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("phone")
      .eq("id", appointment.patientId)
      .single();

    if (userError) return res.status(400).json({ error: userError.message });

    // Format the message
    const message = `Your appointment report for the ${appointment.testType} test at ${labData.name} is ready!
  
  You can now view or download your report. The test was scheduled for ${appointment.scheduledAt}.
  
  Thank you for choosing ${labData.name}. If you have any questions, feel free to contact us.`;

    // Sending WhatsApp message with the phone number
    await sendWhatsAppMessage(userData.phone, message);

    // Return success
    return res.status(200).json({
      message:
        "Appointment status updated to REPORT_GENERATED and notification sent.",
    });
  } catch (err) {
    console.error("❌ Error updating appointment status:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🟡 Change Appointment Status from Pending to Confirmed and send notification
export const confirmAppointment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { appointmentId } = req.body; // Assuming appointmentId is passed in the request body

    // Fetch the appointment by ID
    const { data: appointment, error } = await supabase
      .from("Appointment")
      .select("id, patientId, labId, scheduledAt, testType")
      .eq("id", appointmentId)
      .eq("status", "PENDING")
      .single();

    if (error || !appointment) {
      return res
        .status(400)
        .json({ error: "Appointment not found or not pending" });
    }

    // Update the appointment status to 'CONFIRMED'
    const { error: updateError } = await supabase
      .from("Appointment")
      .update({ status: "CONFIRMED" })
      .eq("id", appointmentId);

    if (updateError) {
      return res
        .status(400)
        .json({ error: "Failed to update appointment status" });
    }

    // Fetch the patient's phone number
    const { data: user, error: userError } = await supabase
      .from("User")
      .select("phone")
      .eq("id", appointment.patientId)
      .single();

    if (userError || !user) {
      return res.status(400).json({ error: "Patient phone number not found" });
    }

    const patientPhoneNumber = user.phone!;

    // Fetch the lab's name
    const { data: lab, error: labError } = await supabase
      .from("Lab")
      .select("name")
      .eq("id", appointment.labId)
      .single();

    if (labError || !lab) {
      return res.status(400).json({ error: "Lab name not found" });
    }

    const labName = lab.name!;

    // Prepare the WhatsApp message
    const message = `Your appointment at ${labName} for a ${
      appointment.testType
    } on ${new Date(
      appointment.scheduledAt
    ).toLocaleString()} has been confirmed.`;

    // Send WhatsApp notification to the patient
    await sendWhatsAppMessage(patientPhoneNumber, message);

    return res
      .status(200)
      .json({ message: "Appointment confirmed and notification sent" });
  } catch (err) {
    console.error("❌ Error confirming appointment:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
