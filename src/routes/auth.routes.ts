import express from 'express'
import { signUpPatient } from '../controllers/auth.controller'

const router = express.Router()

router.post('/register-patient', async (req, res, next) => {
  try {
    console.log('📨 Received request at /register:', req.body)
    await signUpPatient(req, res)
  } catch (error) {
    console.error('❌ Error in /register route:', error)
    next(error)
  }
})

export default router
