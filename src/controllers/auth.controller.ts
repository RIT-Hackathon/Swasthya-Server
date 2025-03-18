import { Request, Response } from 'express'
import { supabase } from '../config/supabase.config'
import {
  PatientSignUpRequest,
  LabRegistrationRequest,
  TestType
} from '../types/user.types'

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone
    })
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

const registerLab = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      email,
      password,
      name,
      phone,
      labName,
      labAddress,
      testTypes
    }: LabRegistrationRequest = req.body
    console.log('📨 Request body:', req.body)

    // Validate test types
    if (!Array.isArray(testTypes) || testTypes.length === 0) {
      return res.status(400).json({ error: 'Invalid test types provided' })
    }

    const validTestTypes = Object.values(TestType)
    const invalidTests = testTypes.filter(
      test => !validTestTypes.includes(test as TestType)
    )

    if (invalidTests.length > 0) {
      return res.status(400).json({
        error: `Invalid test types: ${invalidTests.join(', ')}`
      })
    }

    // Step 1: Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return res.status(400).json({ error: error.message })
    if (!data.user)
      return res.status(500).json({ error: 'User registration failed' })

    const userId = data.user.id

    // Step 2: Insert user into `users` table
    const { error: userError } = await supabase
      .from('User')
      .insert([{ id: userId, email, name, phone, role: 'LAB_HEAD' }])
    if (userError) return res.status(400).json({ error: userError.message })

    // Step 3: Insert lab into `labs` table
    const { data: labData, error: labError } = await supabase
      .from('Lab')
      .insert([
        {
          name: labName,
          address: labAddress,
          phone,
          email,
          autoAppointment: false
        }
      ])
      .select()

    if (labError) return res.status(400).json({ error: labError.message })
    const labId = labData[0].id

    // Step 4: Assign user as lab head
    const { error: headError } = await supabase
      .from('LabHead')
      .insert([{ userId, labId }])
    if (headError) return res.status(400).json({ error: headError.message })

    // Step 5: Insert tests into `LabTest` table
    const testInsertData = testTypes.map(test => ({
      labId,
      testType: test
    }))

    const { error: testError } = await supabase
      .from('LabTest')
      .insert(testInsertData)
    if (testError) return res.status(400).json({ error: testError.message })

    return res.status(201).json({
      message: 'Lab registered successfully',
      labId,
      userId
    })
  } catch (err) {
    console.error('❌ Internal Server Error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

export { signUpPatient, registerLab }
