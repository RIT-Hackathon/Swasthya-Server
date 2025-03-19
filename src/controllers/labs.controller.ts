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
          testType, 
          homeAppointment
        `
      )
      .eq("labId", labId)
      .eq("status", status);
    console.log(appointments);

    if (error) throw new ApiError(400, error.message);

    // Fetch patient names from User table
    const patientIds = appointments.map((appt: any) => appt.patientId);
    const { data: users, error: userError } = await supabase
      .from("User")
      .select("id, name")
      .in("id", patientIds);

    if (userError) throw new ApiError(400, userError.message);

    // Fetch assigned assistant IDs if status is CONFIRMED or COMPLETED and is homeAppointment
    let assistantAssignments: any[] = [];
    if (["CONFIRMED", "COMPLETED"].includes(status)) {
      const homeAppointmentIds = appointments
        .filter((appt: any) => appt.homeAppointment)
        .map((appt: any) => appt.id);

      if (homeAppointmentIds.length > 0) {
        const { data: assistants, error: assistantError } = await supabase
          .from("AssistantSchedule")
          .select("appointmentId, assistantId")
          .in("appointmentId", homeAppointmentIds);

        if (assistantError) throw new ApiError(400, assistantError.message);
        assistantAssignments = assistants;

        // Extract assistant IDs
        const assistantIds = assistants.map((asst: any) => asst.assistantId);

        // Fetch assistant names from User table
        const { data: assistantUsers, error: assistantUserError } =
          await supabase.from("User").select("id, name").in("id", assistantIds);

        if (assistantUserError)
          throw new ApiError(400, assistantUserError.message);

        // Map assistant IDs to names
        assistantAssignments = assistantAssignments.map((asst: any) => ({
          ...asst,
          assistantName:
            assistantUsers.find((user: any) => user.id === asst.assistantId)
              ?.name || "Unknown",
        }));
      }
    }

    // Map patient names and assigned assistants
    const appointmentsWithDetails = appointments.map((appointment: any) => {
      const patient = users.find(
        (user: any) => user.id === appointment.patientId
      );
      const assistant = assistantAssignments.find(
        (asst: any) => asst.appointmentId === appointment.id
      );

      return {
        ...appointment,
        patientName: patient ? patient.name : "Unknown",
        assistantName: assistant ? assistant.assistantName : null,
      };
    });

    return res.status(200).json(new ApiResponse(200, appointmentsWithDetails));
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

// 🟡 Assign Home Appointment to an Assistant
export const assignHomeAppointment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { appointmentId, assistantId } = req.body as {
      appointmentId: string;
      assistantId: string;
    };

    // Check if the appointment exists and is a home appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from("Appointment")
      .select("id, status, homeAppointment")
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment)
      return res.status(404).json(new ApiError(404, "Appointment not found"));
    if (!appointment.homeAppointment)
      return res.status(400).json(new ApiError(400, "Not a home appointment"));
    if (appointment.status !== "HOME")
      return res
        .status(400)
        .json(new ApiError(400, "Appointment is already assigned"));

    // Assign assistant and set status to PENDING
    const { error: assignError } = await supabase
      .from("AssistantSchedule")
      .insert({
        assistantId,
        appointmentId,
        startTime: new Date().toISOString(),
        endTime: new Date(new Date().getTime() + 3600000).toISOString(), // +1 hour default time
      });

    if (assignError) throw new ApiError(400, assignError.message);

    // Update appointment status
    const { error: updateError } = await supabase
      .from("Appointment")
      .update({ status: "PENDING" })
      .eq("id", appointmentId);

    if (updateError) throw new ApiError(400, updateError.message);

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Appointment assigned to assistant successfully")
      );
  } catch (err) {
    console.error("❌ Error assigning home appointment:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// 🟡 Confirm Home Appointment and Send WhatsApp Notification
export const confirmHomeAppointment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { appointmentId } = req.body as { appointmentId: string };

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from("Appointment")
      .select(
        "id, patientId, labId, testType, scheduledAt, homeAppointment, status"
      )
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment)
      return res.status(404).json(new ApiError(404, "Appointment not found"));
    if (!appointment.homeAppointment)
      return res.status(400).json(new ApiError(400, "Not a home appointment"));
    if (appointment.status !== "PENDING")
      return res
        .status(400)
        .json(new ApiError(400, "Appointment not in pending state"));

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from("User")
      .select("name, phone")
      .eq("id", appointment.patientId)
      .single();

    if (patientError || !patient)
      return res.status(404).json(new ApiError(404, "Patient not found"));

    // Get lab details
    const { data: lab, error: labError } = await supabase
      .from("Lab")
      .select("name")
      .eq("id", appointment.labId)
      .single();

    if (labError || !lab)
      return res.status(404).json(new ApiError(404, "Lab not found"));

    // Update appointment status to CONFIRMED
    const { error: updateError } = await supabase
      .from("Appointment")
      .update({ status: "CONFIRMED" })
      .eq("id", appointmentId);

    if (updateError) throw new ApiError(400, updateError.message);

    // Send WhatsApp Notification
    const message = `Hello ${patient.name},\n\nYour home appointment for *${appointment.testType}* at *${lab.name}* on *${appointment.scheduledAt}* has been confirmed.\n\nThank you!`;

    await sendWhatsAppMessage(patient.phone, message);

    return res
      .status(200)
      .json(new ApiResponse(200, "Appointment confirmed and message sent"));
  } catch (err) {
    console.error("❌ Error confirming home appointment:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// ❌ Reject Home Appointment (Unassign Assistant & Revert Status to HOME)
export const rejectHomeAppointment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { appointmentId, assistantId } = req.body as {
      appointmentId: string;
      assistantId: string;
    };

    // Check if the appointment exists and is currently assigned
    const { data: appointment, error: appointmentError } = await supabase
      .from("Appointment")
      .select("id, status, homeAppointment")
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment)
      return res.status(404).json(new ApiError(404, "Appointment not found"));
    if (!appointment.homeAppointment)
      return res.status(400).json(new ApiError(400, "Not a home appointment"));
    if (appointment.status !== "PENDING")
      return res
        .status(400)
        .json(new ApiError(400, "Appointment is not currently assigned"));

    // Remove assistant from schedule
    const { error: deleteError } = await supabase
      .from("AssistantSchedule")
      .delete()
      .eq("appointmentId", appointmentId)
      .eq("assistantId", assistantId);

    if (deleteError) throw new ApiError(400, deleteError.message);

    // Update appointment status back to HOME
    const { error: updateError } = await supabase
      .from("Appointment")
      .update({ status: "HOME" })
      .eq("id", appointmentId);

    if (updateError) throw new ApiError(400, updateError.message);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Appointment unassigned and reverted to HOME status"
        )
      );
  } catch (err) {
    console.error("❌ Error rejecting home appointment:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

export const toggleAutoAppointment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { labId, headId } = req.body;

    // Validate input
    if (!labId || !headId) {
      return res
        .status(400)
        .json(new ApiError(400, "Lab ID and Head ID are required"));
    }

    // Verify if headId belongs to the given labId
    const { data: labHead, error: headError } = await supabase
      .from("LabHead")
      .select("userId")
      .eq("userId", headId)
      .eq("labId", labId)
      .single();

    if (headError || !labHead) {
      return res
        .status(403)
        .json(
          new ApiError(403, "Unauthorized: Head ID does not belong to this lab")
        );
    }

    // Get current auto appointment status
    const { data: lab, error: labError } = await supabase
      .from("Lab")
      .select("autoAppointment")
      .eq("id", labId)
      .single();

    if (labError || !lab) {
      return res.status(404).json(new ApiError(404, "Lab not found"));
    }

    // Toggle auto appointment status
    const newStatus = !lab.autoAppointment;
    const { error: updateError } = await supabase
      .from("Lab")
      .update({ autoAppointment: newStatus })
      .eq("id", labId);

    if (updateError) throw new ApiError(500, updateError.message);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { autoAppointment: newStatus },
          "Auto appointment status updated successfully"
        )
      );
  } catch (err) {
    console.error("❌ Error toggling auto appointment status:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
