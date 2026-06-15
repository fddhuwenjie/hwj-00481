import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const classrooms = db.prepare('SELECT * FROM classroom').all()
  res.json({ success: true, data: classrooms })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { code, building, capacity, type, equipment } = req.body
  try {
    const result = db.prepare(
      'INSERT INTO classroom (code, building, capacity, type, equipment) VALUES (?, ?, ?, ?, ?)'
    ).run(code, building, capacity, type, equipment)
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { code, building, capacity, type, equipment, status } = req.body
  try {
    db.prepare(
      'UPDATE classroom SET code=?, building=?, capacity=?, type=?, equipment=?, status=? WHERE id=?'
    ).run(code, building, capacity, type, equipment, status, req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM schedule WHERE classroom_id = ?').run(req.params.id)
  db.prepare('DELETE FROM classroom WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.get('/:id/availability', (req: Request, res: Response) => {
  const db = getDb()
  const schedules = db.prepare(`
    SELECT s.*, c.name as course_name
    FROM schedule s
    JOIN course c ON s.course_id = c.id
    WHERE s.classroom_id = ?
  `).all(req.params.id) as any[]
  const classroom = db.prepare('SELECT * FROM classroom WHERE id = ?').get(req.params.id)

  const slots: { day: number; period: number; status: string; courseName?: string }[] = []
  for (const s of schedules) {
    const pairs = Math.ceil((s.period_end - s.period_start + 1) / 2)
    for (let i = 0; i < pairs; i++) {
      slots.push({
        day: s.day_of_week,
        period: Math.ceil((s.period_start + i * 2) / 2),
        status: 'occupied',
        courseName: s.course_name
      })
    }
  }

  res.json({ success: true, data: { classroom, slots } })
})

router.put('/:id/status', (req: Request, res: Response) => {
  const db = getDb()
  const { status } = req.body
  db.prepare('UPDATE classroom SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ success: true })
})

export default router
