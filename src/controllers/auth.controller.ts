import { Request, Response } from 'express'
import { supabase } from '../config/supabase.config'
import { PatientSignUpRequest } from '../types/user.types'

const signUpPatient = async (
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
      insuranceId
    }: PatientSignUpRequest = req.body
    console.log('📨 Request body:', req.body)

    // Sign up user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password })
    console.log('🔹 Supabase signUp response:', { data, error })

    if (error) {
      console.error('❌ Supabase signUp error:', error.message)
      return res.status(400).json({ error: error.message })
    }

    if (!data.user) {
      console.error('⚠️ No user returned from Supabase Auth')
      return res.status(500).json({ error: 'User registration failed' })
    }

    const userId = data.user.id // Use the same ID for User & Patient

    // Insert user details into 'User' table
    const { error: dbError1 } = await supabase
      .from('User')
      .insert([{ id: userId, email, name, phone, role: 'PATIENT' }])

    if (dbError1) {
      console.error('❌ User table insert error:', dbError1.message)
      return res.status(400).json({ error: dbError1.message })
    }

    // Insert patient details into 'Patient' table
    const { data: patientData, error: dbError2 } = await supabase
      .from('Patient')
      .insert([{ userId, dateOfBirth, gender, address, insuranceId }])
      .select() // Fetch inserted row for confirmation

    console.log('🛢️ Patient table insert response:', { patientData, dbError2 })

    if (dbError2) {
      console.error('❌ Patient table insert error:', dbError2.message)
      return res.status(400).json({ error: dbError2.message })
    }

    console.log('✅ Patient registered successfully:', patientData)
    return res.status(201).json({
      message: 'Patient registered successfully',
      user: { id: userId, email, name, phone },
      patient: patientData
    })
  } catch (err) {
    console.error('❌ Internal Server Error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

export { signUpPatient }
