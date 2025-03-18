export interface PatientSignUpRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  insuranceId?: string;
}

export interface LabRegistrationRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  labName: string;
  labAddress: string;
  testTypes?: string[]; // Added field for test types
}

export enum TestType {
  BLOOD_TEST = "BLOOD_TEST",
  X_RAY = "X_RAY",
  MRI = "MRI",
  CT_SCAN = "CT_SCAN",
  URINE_TEST = "URINE_TEST",
  ECG = "ECG",
}
