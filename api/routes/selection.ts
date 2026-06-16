import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/periods', (_req: Request, res: Response) => {
  const db = getDb()
  const periods = db.prepare('SELECT * FROM selection_period ORDER BY start_time DESC').all()
  res.json({ success: true, data: periods })
})

router.post('/periods', (req: Request, res: Response) => {
  const db = getDb()
  const { name, start_time, end_time, is_active } = req.body
  try {
    const result = db.prepare(
      'INSERT INTO selection_period (name, start_time, end_time, is_active) VALUES (?, ?, ?, ?)'
    ).run(name, start_time, end_time, is_active ? 1 : 0)
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.put('/periods/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { name, start_time, end_time, is_active } = req.body
  try {
    db.prepare(
      'UPDATE selection_period SET name=?, start_time=?, end_time=?, is_active=? WHERE id=?'
    ).run(name, start_time, end_time, is_active ? 1 : 0, req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.get('/active-period', (_req: Request, res: Response) => {
  const db = getDb()
  const period = db.prepare('SELECT * FROM selection_period WHERE is_active = 1').get()
  res.json({ success: true, data: period || null })
})

router.get('/available-courses', (_req: Request, res: Response) => {
  const db = getDb()
  const courses = db.prepare(`
    SELECT c.*, t.name as teacher_name, cl.name as class_name,
      c.max_selection as max_selection,
      COALESCE(sel.cnt, 0) as selected_count,
      CASE WHEN c.max_selection > 0 THEN c.max_selection - COALESCE(sel.cnt, 0) ELSE 999 END as remaining
    FROM course c
    LEFT JOIN teacher t ON c.teacher_id = t.id
    LEFT JOIN class cl ON c.class_id = cl.id
    LEFT JOIN (
      SELECT course_id, COUNT(*) as cnt FROM course_selection WHERE status = 'selected' GROUP BY course_id
    ) sel ON sel.course_id = c.id
    ORDER BY c.id
  `).all()
  res.json({ success: true, data: courses })
})

router.get('/students', (_req: Request, res: Response) => {
  const db = getDb()
  const students = db.prepare(`
    SELECT s.*, c.name as class_name FROM student s LEFT JOIN class c ON s.class_id = c.id ORDER BY s.id
  `).all()
  res.json({ success: true, data: students })
})

router.post('/select', (req: Request, res: Response) => {
  const db = getDb()
  const { student_id, course_id } = req.body

  const period = db.prepare('SELECT * FROM selection_period WHERE is_active = 1').get() as any
  if (!period) {
    res.status(400).json({ success: false, error: '当前不在选课时间段内' })
    return
  }

  const now = new Date()
  const start = new Date(period.start_time)
  const end = new Date(period.end_time)
  if (now < start || now > end) {
    res.status(400).json({ success: false, error: '当前不在选课时间段内' })
    return
  }

  const existing = db.prepare(
    'SELECT * FROM course_selection WHERE student_id = ? AND course_id = ? AND status = ?'
  ).get(student_id, course_id, 'selected')
  if (existing) {
    res.status(400).json({ success: false, error: '已选该课程' })
    return
  }

  const course = db.prepare('SELECT * FROM course WHERE id = ?').get(course_id) as any
  if (!course) {
    res.status(400).json({ success: false, error: '课程不存在' })
    return
  }

  if (course.max_selection > 0) {
    const selectedCount = db.prepare(
      'SELECT COUNT(*) as cnt FROM course_selection WHERE course_id = ? AND status = ?'
    ).get(course_id, 'selected') as { cnt: number }
    if (selectedCount.cnt >= course.max_selection) {
      res.status(400).json({ success: false, error: '该课程选课人数已满' })
      return
    }
  }

  const studentSchedules = db.prepare(`
    SELECT s.* FROM schedule s
    JOIN course_selection cs ON cs.course_id = s.course_id
    WHERE cs.student_id = ? AND cs.status = 'selected'
  `).all(student_id) as any[]

  const newCourseSchedules = db.prepare(
    'SELECT * FROM schedule WHERE course_id = ?'
  ).all(course_id) as any[]

  for (const ns of newCourseSchedules) {
    for (const es of studentSchedules) {
      if (ns.day_of_week === es.day_of_week) {
        if (!(ns.period_end < es.period_start || ns.period_start > es.period_end)) {
          res.status(400).json({
            success: false,
            error: `时间冲突: 周${ns.day_of_week} 第${ns.period_start}-${ns.period_end}节与已选课程冲突`
          })
          return
        }
      }
    }
  }

  try {
    const dup = db.prepare(
      'SELECT * FROM course_selection WHERE student_id = ? AND course_id = ?'
    ).get(student_id, course_id) as any
    if (dup) {
      db.prepare('UPDATE course_selection SET status = ?, selected_at = datetime(\'now\') WHERE id = ?')
        .run('selected', dup.id)
    } else {
      db.prepare('INSERT INTO course_selection (student_id, course_id, status) VALUES (?, ?, ?)')
        .run(student_id, course_id, 'selected')
    }
    res.json({ success: true, message: '选课成功' })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.post('/drop', (req: Request, res: Response) => {
  const db = getDb()
  const { student_id, course_id } = req.body

  const semester = db.prepare('SELECT * FROM semester WHERE is_current = 1').get() as any
  if (semester) {
    const startDate = new Date(semester.start_date)
    const today = new Date()
    const oneWeekBeforeStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (today >= oneWeekBeforeStart) {
      res.status(400).json({ success: false, error: '退选已截止（开课前一周不可退选）' })
      return
    }
  }

  try {
    const result = db.prepare(
      'UPDATE course_selection SET status = ? WHERE student_id = ? AND course_id = ? AND status = ?'
    ).run('dropped', student_id, course_id, 'selected')
    if (result.changes === 0) {
      res.status(400).json({ success: false, error: '未找到选课记录' })
      return
    }
    res.json({ success: true, message: '退选成功' })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.get('/my-courses/:studentId', (req: Request, res: Response) => {
  const db = getDb()
  const selections = db.prepare(`
    SELECT cs.*, c.name as course_name, c.code as course_code, c.credits,
      t.name as teacher_name,
      s.day_of_week, s.period_start, s.period_end, s.classroom_id,
      cr.code as classroom_code
    FROM course_selection cs
    JOIN course c ON cs.course_id = c.id
    LEFT JOIN teacher t ON c.teacher_id = t.id
    LEFT JOIN schedule s ON s.course_id = c.id
    LEFT JOIN classroom cr ON s.classroom_id = cr.id
    WHERE cs.student_id = ? AND cs.status = 'selected'
    ORDER BY s.day_of_week, s.period_start
  `).all(req.params.studentId)
  res.json({ success: true, data: selections })
})

router.get('/statistics', (_req: Request, res: Response) => {
  const db = getDb()
  const stats = db.prepare(`
    SELECT c.id, c.name, c.code, c.max_selection,
      COALESCE(sel.cnt, 0) as selected_count,
      CASE WHEN c.max_selection > 0
        THEN ROUND(COALESCE(sel.cnt, 0) * 100.0 / c.max_selection, 1)
        ELSE 0 END as selection_rate
    FROM course c
    LEFT JOIN (
      SELECT course_id, COUNT(*) as cnt FROM course_selection WHERE status = 'selected' GROUP BY course_id
    ) sel ON sel.course_id = c.id
    ORDER BY sel.cnt DESC
  `).all()

  const hotCourses = db.prepare(`
    SELECT c.id, c.name, c.code,
      COALESCE(sel.cnt, 0) as selected_count,
      CASE WHEN c.max_selection > 0
        THEN ROUND(COALESCE(sel.cnt, 0) * 100.0 / c.max_selection, 1)
        ELSE 0 END as selection_rate
    FROM course c
    LEFT JOIN (
      SELECT course_id, COUNT(*) as cnt FROM course_selection WHERE status = 'selected' GROUP BY course_id
    ) sel ON sel.course_id = c.id
    ORDER BY sel.cnt DESC
    LIMIT 10
  `).all()

  res.json({ success: true, data: { statistics: stats, hotCourses } })
})

export default router
