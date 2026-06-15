import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const teachers = db.prepare('SELECT * FROM teacher').all()
  res.json({ success: true, data: teachers })
})

export default router
