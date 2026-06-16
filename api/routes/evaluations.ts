import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/courses/:courseId', (req: Request, res: Response) => {
  const db = getDb()
  const courseId = req.params.courseId
  const evaluations = db.prepare(`
    SELECT ce.*, s.name as student_name, s.student_no,
      c.name as course_name
    FROM course_evaluation ce
    JOIN student s ON ce.student_id = s.id
    JOIN course c ON ce.course_id = c.id
    WHERE ce.course_id = ?
    ORDER BY ce.created_at DESC
  `).all(courseId)
  res.json({ success: true, data: evaluations })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { student_id, course_id, content_score, method_score, interaction_score, workload_score, comment } = req.body

  if (!student_id || !course_id) {
    res.status(400).json({ success: false, error: '学生ID和课程ID不能为空' })
    return
  }

  const existing = db.prepare(
    'SELECT * FROM course_evaluation WHERE student_id = ? AND course_id = ?'
  ).get(student_id, course_id)
  if (existing) {
    res.status(400).json({ success: false, error: '您已评价过该课程，每人每课只能评价一次' })
    return
  }

  const scores = [content_score, method_score, interaction_score, workload_score]
  for (const s of scores) {
    if (s < 1 || s > 5) {
      res.status(400).json({ success: false, error: '评分必须在1-5之间' })
      return
    }
  }

  try {
    const result = db.prepare(
      'INSERT INTO course_evaluation (student_id, course_id, content_score, method_score, interaction_score, workload_score, comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(student_id, course_id, content_score, method_score, interaction_score, workload_score, comment || '')
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.get('/teacher/:teacherId', (req: Request, res: Response) => {
  const db = getDb()
  const teacherId = req.params.teacherId

  const courses = db.prepare(`
    SELECT c.id, c.name, c.code,
      COALESCE(ev.cnt, 0) as eval_count,
      COALESCE(ev.avg_content, 0) as avg_content,
      COALESCE(ev.avg_method, 0) as avg_method,
      COALESCE(ev.avg_interaction, 0) as avg_interaction,
      COALESCE(ev.avg_workload, 0) as avg_workload,
      COALESCE(ev.avg_total, 0) as avg_total
    FROM course c
    LEFT JOIN (
      SELECT course_id,
        COUNT(*) as cnt,
        ROUND(AVG(content_score), 1) as avg_content,
        ROUND(AVG(method_score), 1) as avg_method,
        ROUND(AVG(interaction_score), 1) as avg_interaction,
        ROUND(AVG(workload_score), 1) as avg_workload,
        ROUND(AVG((content_score + method_score + interaction_score + workload_score) / 4.0), 1) as avg_total
      FROM course_evaluation
      GROUP BY course_id
    ) ev ON ev.course_id = c.id
    WHERE c.teacher_id = ?
    ORDER BY ev.avg_total DESC
  `).all(teacherId)

  res.json({ success: true, data: courses })
})

router.get('/statistics', (_req: Request, res: Response) => {
  const db = getDb()

  const courseStats = db.prepare(`
    SELECT c.id, c.name, c.code, t.name as teacher_name, t.department,
      COALESCE(ev.cnt, 0) as eval_count,
      COALESCE(ev.avg_content, 0) as avg_content,
      COALESCE(ev.avg_method, 0) as avg_method,
      COALESCE(ev.avg_interaction, 0) as avg_interaction,
      COALESCE(ev.avg_workload, 0) as avg_workload,
      COALESCE(ev.avg_total, 0) as avg_total
    FROM course c
    LEFT JOIN teacher t ON c.teacher_id = t.id
    LEFT JOIN (
      SELECT course_id,
        COUNT(*) as cnt,
        ROUND(AVG(content_score), 1) as avg_content,
        ROUND(AVG(method_score), 1) as avg_method,
        ROUND(AVG(interaction_score), 1) as avg_interaction,
        ROUND(AVG(workload_score), 1) as avg_workload,
        ROUND(AVG((content_score + method_score + interaction_score + workload_score) / 4.0), 1) as avg_total
      FROM course_evaluation
      GROUP BY course_id
    ) ev ON ev.course_id = c.id
    ORDER BY ev.avg_total DESC
  `).all()

  const departmentStats = db.prepare(`
    SELECT t.department,
      COUNT(DISTINCT c.id) as course_count,
      COALESCE(ev.total_evals, 0) as total_evals,
      COALESCE(ev.avg_total, 0) as avg_total
    FROM teacher t
    JOIN course c ON c.teacher_id = t.id
    LEFT JOIN (
      SELECT c2.teacher_id,
        COUNT(*) as total_evals,
        ROUND(AVG((ce.content_score + ce.method_score + ce.interaction_score + ce.workload_score) / 4.0), 1) as avg_total
      FROM course_evaluation ce
      JOIN course c2 ON ce.course_id = c2.id
      GROUP BY c2.teacher_id
    ) ev ON ev.teacher_id = t.id
    GROUP BY t.department
    ORDER BY ev.avg_total DESC
  `).all()

  res.json({ success: true, data: { courseStats, departmentStats } })
})

router.get('/student/:studentId/evaluated', (req: Request, res: Response) => {
  const db = getDb()
  const evaluated = db.prepare(
    'SELECT course_id FROM course_evaluation WHERE student_id = ?'
  ).all(req.params.studentId) as any[]
  res.json({ success: true, data: evaluated.map((e: any) => e.course_id) })
})

export default router
