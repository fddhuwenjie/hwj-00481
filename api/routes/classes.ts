import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const classes = db.prepare('SELECT * FROM class').all()
  res.json({ success: true, data: classes })
})

export default router
