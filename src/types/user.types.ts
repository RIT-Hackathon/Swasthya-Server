export interface PatientSignUpRequest {
  email: string
  password: string
  name: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  insuranceId?: string
}

export interface LabRegistrationRequest {
  email: string
  password: string
  name: string
  phone?: string
  labName: string
  labAddress: string
}
