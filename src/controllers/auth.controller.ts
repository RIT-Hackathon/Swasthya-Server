import { Request, Response } from 'express'
import { supabase } from '../config/supabase.config'
import { UserRequestBody } from '../types/user.types'

const signUp = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password, name, phone }: UserRequestBody = req.body
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

    // Insert user details into the 'users' table
    const { data: insertData, error: dbError } = await supabase
      .from('User')
      .insert([{ id: data.user.id, email, name, phone, role: 'PATIENT' }])
      .select() // Fetch inserted row for confirmation

    console.log('🛢️ Database insert response:', { insertData, dbError })

    if (dbError) {
      console.error('❌ Database insert error:', dbError.message)
      return res.status(400).json({ error: dbError.message })
    }

    console.log('✅ User registered successfully:', insertData)
    return res.status(201).json({
      message: 'User registered successfully',
      user: insertData
    })
  } catch (err) {
    console.error('❌ Internal Server Error:', err)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

export { signUp }
