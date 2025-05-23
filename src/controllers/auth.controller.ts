import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../config/supabase.config";
import {
  PatientSignUpRequest,
  LabRegistrationRequest,
  TestType,
} from "../types/user.types";
import { ApiError, ApiResponse } from "../config/api.config";

export const signUpPatient = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      email,
      password,
      name,
      phone,
      dateOfBirth,
      gender,
      address,
      insuranceId,
    }: PatientSignUpRequest = req.body;

    // Sign up user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone,
    });
    console.log("🔹 Supabase signUp response:", { data, error });

    if (error) {
      console.error("❌ Supabase signUp error:", error.message);
      const apiError = new ApiError(400, "Sign-up failed", [error.message]);
      console.log("🚀 ~ apiError:", apiError);
      return res.status(apiError.statusCode).json({
        success: false,
        data: apiError,
      });
    }

    if (!data.user) {
      console.error("⚠️ No user returned from Supabase Auth");
      const apiError = new ApiError(500, "User registration failed");
      return res.status(apiError.statusCode).json({
        success: false,
        data: apiError,
      });
    }

    const userId = data.user.id; // Use the same ID for User & Patient

    // **Step 2: Force Email Confirmation (Requires Service Role Key)**
    const { error: confirmError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });

    console.log("✅ Email confirmed successfully:", data);

    // Insert user details into 'User' table
    const { error: dbError1 } = await supabase
      .from("User")
      .insert([{ id: userId, email, name, phone, role: "PATIENT" }]);

    if (dbError1) {
      console.error("❌ User table insert error:", dbError1.message);
      const apiError = new ApiError(400, dbError1.message);
      return res.status(apiError.statusCode).json({
        success: false,
        data: apiError,
      });
    }

    // Insert patient details into 'Patient' table
    const { data: patientData, error: dbError2 } = await supabase
      .from("Patient")
      .insert([{ userId, dateOfBirth, gender, address, insuranceId }])
      .select(); // Fetch inserted row for confirmation

    console.log("🛢️ Patient table insert response:", { patientData, dbError2 });

    if (dbError2) {
      console.error("❌ Patient table insert error:", dbError2.message);
      const apiError = new ApiError(400, dbError2.message);
      return res.status(apiError.statusCode).json({
        success: false,
        data: apiError,
      });
    }

    console.log("✅ Patient registered successfully:", patientData);
    const apiResponse = new ApiResponse(201, {
      message: "Patient registered successfully",
      user: { id: userId, email, name, phone },
      patient: patientData,
    });
    return res.status(apiResponse.statuscode).json(apiResponse);
  } catch (err) {
    console.error("❌ Internal Server Error:", err);
    const apiError = new ApiError(500, "Internal Server Error");
    return res.status(apiError.statusCode).json(apiError);
  }
};

export const registerLab = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      email,
      password,
      name,
      phone,
      labName,
      labAddress,
      testTypes,
    }: LabRegistrationRequest = req.body;

    // Validate test types
    if (!Array.isArray(testTypes) || testTypes.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid test types provided"));
    }

    const validTestTypes = Object.values(TestType);
    const invalidTests = testTypes.filter(
      (test) => !validTestTypes.includes(test as TestType)
    );

    if (invalidTests.length > 0) {
      return res
        .status(400)
        .json(
          new ApiError(400, `Invalid test types: ${invalidTests.join(", ")}`)
        );
    }

    // Step 1: Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json(new ApiError(400, error.message));

    if (!data.user)
      return res
        .status(500)
        .json(new ApiError(500, "User registration failed"));

    const userId = data.user.id;

    // **Step 2: Force Email Confirmation (Requires Service Role Key)**
    const { error: confirmError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });

    console.log("✅ Email confirmed successfully:", data);

    // Step 2: Insert user into `users` table
    const { error: userError } = await supabase
      .from("User")
      .insert([{ id: userId, email, name, phone, role: "LAB_HEAD" }]);
    if (userError)
      return res.status(400).json(new ApiError(400, userError.message));

    // Step 3: Insert lab into `labs` table
    const { data: labData, error: labError } = await supabase
      .from("Lab")
      .insert([
        {
          name: labName,
          address: labAddress,
          phone,
          email,
          autoAppointment: false,
        },
      ])
      .select();

    if (labError)
      return res.status(400).json(new ApiError(400, labError.message));

    const labId = labData[0].id;

    // Step 4: Assign user as lab head
    const { error: headError } = await supabase
      .from("LabHead")
      .insert([{ userId, labId }]);
    if (headError)
      return res.status(400).json(new ApiError(400, headError.message));

    // Step 5: Insert tests into `LabTest` table
    const testInsertData = testTypes.map((test) => ({
      labId,
      testType: test,
    }));

    const { error: testError } = await supabase
      .from("LabTest")
      .insert(testInsertData);
    if (testError)
      return res.status(400).json(new ApiError(400, testError.message));

    // If everything is successful
    const apiResponse = new ApiResponse(201, {
      message: "Lab registered successfully",
      labId,
      userId,
    });

    return res.status(201).json(apiResponse);
  } catch (err) {
    console.error("❌ Internal Server Error:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

export const signInUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { email, password } = req.body;

    // Step 1: Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json(new ApiError(400, error.message));
    }

    // Step 2: Fetch user details
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id, name, email, phone, role")
      .eq("id", data.user.id)
      .single();

    if (userError) {
      return res.status(400).json(new ApiError(400, userError.message));
    }

    // Successful sign-in
    const apiResponse = new ApiResponse(200, {
      message: "User signed in successfully",
      user: userData,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });

    return res.status(200).json(apiResponse);
  } catch (err) {
    console.error("❌ Internal Server Error:", err);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};
