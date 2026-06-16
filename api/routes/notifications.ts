import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const notifications = db.prepare(`
    SELECT n.*, cl.name as class_name,
      c.name as course_name, e.exam_date
    FROM notification n
    LEFT JOIN class cl ON n.class_id = cl.id
    LEFT JOIN course c ON n.course_id = c.id
    LEFT JOIN exam e ON n.exam_id = e.id
    ORDER BY n.created_at DESC
  `).all()
  res.json({ success: true, data: notifications })
})

router.get('/unread-count', (_req: Request, res: Response) => {
  const db = getDb()
  const result = db.prepare('SELECT COUNT(*) as cnt FROM notification WHERE is_read = 0').get() as { cnt: number }
  res.json({ success: true, data: { count: result.cnt } })
})

router.put('/:id/read', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('UPDATE notification SET is_read = 1 WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.put('/read-all', (_req: Request, res: Response) => {
  const db = getDb()
  db.prepare('UPDATE notification SET is_read = 1 WHERE is_read = 0').run()
  res.json({ success: true })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { type, adjustment_id, exam_id, course_id, class_id, student_id, message } = req.body
  try {
    const result = db.prepare(
      'INSERT INTO notification (type, adjustment_id, exam_id, course_id, class_id, student_id, message) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(type || 'info', adjustment_id || null, exam_id || null, course_id || null, class_id || null, student_id || null, message)
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

export default router
