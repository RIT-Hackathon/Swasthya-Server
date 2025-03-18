import express from 'express'
import { signUp } from '../controllers/auth.controller'

const router = express.Router()

router.post('/register', async (req, res, next) => {
  try {
    console.log('📨 Received request at /register:', req.body)
    await signUp(req, res)
  } catch (error) {
    console.error('❌ Error in /register route:', error)
    next(error)
  }
})

export default router
