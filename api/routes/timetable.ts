import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/student/:classId', (req: Request, res: Response) => {
  const db = getDb()
  const week = parseInt(req.query.week as string) || 1
  const schedules = db.prepare(`
    SELECT s.*, c.name as course_name, c.code as course_code, cr.code as classroom_code,
           t.name as teacher_name, cl.name as class_name
    FROM schedule s
    JOIN course c ON s.course_id = c.id
    JOIN classroom cr ON s.classroom_id = cr.id
    JOIN teacher t ON c.teacher_id = t.id
    JOIN class cl ON c.class_id = cl.id
    WHERE c.class_id = ? AND s.week_start <= ? AND s.week_end >= ?
      AND (s.week_type = 'all' OR (s.week_type = 'odd' AND ? % 2 = 1) OR (s.week_type = 'even' AND ? % 2 = 0))
  `).all(req.params.classId, week, week, week, week)
  res.json({ success: true, data: schedules })
})

router.get('/teacher/:teacherId', (req: Request, res: Response) => {
  const db = getDb()
  const week = parseInt(req.query.week as string) || 1
  const schedules = db.prepare(`
    SELECT s.*, c.name as course_name, c.code as course_code, cr.code as classroom_code,
           t.name as teacher_name, cl.name as class_name
    FROM schedule s
    JOIN course c ON s.course_id = c.id
    JOIN classroom cr ON s.classroom_id = cr.id
    JOIN teacher t ON c.teacher_id = t.id
    JOIN class cl ON c.class_id = cl.id
    WHERE c.teacher_id = ? AND s.week_start <= ? AND s.week_end >= ?
      AND (s.week_type = 'all' OR (s.week_type = 'odd' AND ? % 2 = 1) OR (s.week_type = 'even' AND ? % 2 = 0))
  `).all(req.params.teacherId, week, week, week, week)
  res.json({ success: true, data: schedules })
})

router.get('/classroom/:classroomId', (req: Request, res: Response) => {
  const db = getDb()
  const week = parseInt(req.query.week as string) || 1
  const schedules = db.prepare(`
    SELECT s.*, c.name as course_name, c.code as course_code, cr.code as classroom_code,
           t.name as teacher_name, cl.name as class_name
    FROM schedule s
    JOIN course c ON s.course_id = c.id
    JOIN classroom cr ON s.classroom_id = cr.id
    JOIN teacher t ON c.teacher_id = t.id
    JOIN class cl ON c.class_id = cl.id
    WHERE s.classroom_id = ? AND s.week_start <= ? AND s.week_end >= ?
      AND (s.week_type = 'all' OR (s.week_type = 'odd' AND ? % 2 = 1) OR (s.week_type = 'even' AND ? % 2 = 0))
  `).all(req.params.classroomId, week, week, week, week)
  res.json({ success: true, data: schedules })
})

export default router
