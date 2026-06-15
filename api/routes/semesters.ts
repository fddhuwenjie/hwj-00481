import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const semesters = db.prepare('SELECT * FROM semester').all()
  res.json({ success: true, data: semesters })
})

router.get('/current', (_req: Request, res: Response) => {
  const db = getDb()
  const semester = db.prepare('SELECT * FROM semester WHERE is_current = 1').get()
  res.json({ success: true, data: semester })
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { name, start_date, end_date, total_weeks, is_current } = req.body
  if (is_current) {
    db.prepare('UPDATE semester SET is_current = 0').run()
  }
  db.prepare(
    'UPDATE semester SET name=?, start_date=?, end_date=?, total_weeks=?, is_current=? WHERE id=?'
  ).run(name, start_date, end_date, total_weeks, is_current ? 1 : 0, req.params.id)
  res.json({ success: true })
})

export default router
