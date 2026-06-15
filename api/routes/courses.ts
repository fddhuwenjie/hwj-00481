import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const courses = db.prepare(`
    SELECT c.*, t.name as teacher_name, cl.name as class_name
    FROM course c
    LEFT JOIN teacher t ON c.teacher_id = t.id
    LEFT JOIN class cl ON c.class_id = cl.id
  `).all()
  res.json({ success: true, data: courses })
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const course = db.prepare(`
    SELECT c.*, t.name as teacher_name, cl.name as class_name
    FROM course c
    LEFT JOIN teacher t ON c.teacher_id = t.id
    LEFT JOIN class cl ON c.class_id = cl.id
    WHERE c.id = ?
  `).get(req.params.id)
  if (!course) { res.status(404).json({ success: false, error: '课程不存在' }); return }
  res.json({ success: true, data: course })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { name, code, credits, hours, teacher_id, student_count, room_requirement, is_fixed, class_id, semester_id } = req.body
  try {
    let sid = semester_id
    if (!sid) {
      const current = db.prepare('SELECT id FROM semester WHERE is_current = 1').get() as { id: number } | undefined
      if (current) sid = current.id
    }
    const result = db.prepare(
      `INSERT INTO course (name, code, credits, hours, teacher_id, student_count, room_requirement, is_fixed, class_id, semester_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(name, code, credits, hours, teacher_id, student_count, room_requirement, is_fixed ? 1 : 0, class_id, sid || 1)
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { name, code, credits, hours, teacher_id, student_count, room_requirement, is_fixed, class_id, semester_id } = req.body
  try {
    db.prepare(
      `UPDATE course SET name=?, code=?, credits=?, hours=?, teacher_id=?, student_count=?, room_requirement=?, is_fixed=?, class_id=?, semester_id=? WHERE id=?`
    ).run(name, code, credits, hours, teacher_id, student_count, room_requirement, is_fixed ? 1 : 0, class_id, semester_id, req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM schedule WHERE course_id = ?').run(req.params.id)
  db.prepare('DELETE FROM course WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
