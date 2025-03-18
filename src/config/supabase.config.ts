import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE!

// Public client (for frontend-like operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client (for privileged operations like email verification)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole)
