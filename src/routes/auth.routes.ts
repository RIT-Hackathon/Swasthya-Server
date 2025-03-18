import express from 'express'
import { signUpPatient, registerLab } from '../controllers/auth.controller'

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

router.post('/register-lab', async (req, res, next) => {
  try {
    console.log('📨 Received request at /register-lab:', req.body)
    await registerLab(req, res)
  } catch (error) {
    console.error('❌ Error in /register-lab route:', error)
    next(error)
  }
})

export default router
