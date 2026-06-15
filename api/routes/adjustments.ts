import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const adjustments = db.prepare(`
    SELECT a.*, c.name as course_name, c.code as course_code,
           oc.code as old_classroom_code, nc.code as new_classroom_code
    FROM adjustment a
    JOIN course c ON a.course_id = c.id
    LEFT JOIN classroom oc ON a.old_classroom_id = oc.id
    LEFT JOIN classroom nc ON a.new_classroom_id = nc.id
    ORDER BY a.created_at DESC
  `).all()
  res.json({ success: true, data: adjustments })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { course_id, new_classroom_id, new_day_of_week, new_period_start, reason } = req.body

  const course = db.prepare(`
    SELECT c.*, s.day_of_week as old_day, s.period_start as old_period, s.classroom_id as old_classroom
    FROM course c
    JOIN schedule s ON s.course_id = c.id
    WHERE c.id = ?
    LIMIT 1
  `).get(course_id) as any

  if (!course) {
    res.status(404).json({ success: false, error: '课程不存在或无排课记录' })
    return
  }

  const result = db.prepare(
    `INSERT INTO adjustment (course_id, old_classroom_id, new_classroom_id, old_day_of_week, old_period_start, new_day_of_week, new_period_start, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(course_id, course.old_classroom, new_classroom_id || course.old_classroom, course.old_day, course.old_period, new_day_of_week, new_period_start, reason || '')

  res.json({ success: true, data: { id: result.lastInsertRowid } })
})

router.put('/:id/approve', (req: Request, res: Response) => {
  const db = getDb()
  const adjustment = db.prepare('SELECT * FROM adjustment WHERE id = ?').get(req.params.id) as any

  if (!adjustment) {
    res.status(404).json({ success: false, error: '调课申请不存在' })
    return
  }

  const approve = db.transaction(() => {
    db.prepare('UPDATE adjustment SET status = ? WHERE id = ?').run('approved', req.params.id)

    const course = db.prepare('SELECT * FROM course WHERE id = ?').get(adjustment.course_id) as any

    if (adjustment.new_day_of_week && adjustment.new_period_start) {
      db.prepare(`
        UPDATE schedule SET day_of_week = ?, period_start = ?, classroom_id = ?
        WHERE course_id = ? AND day_of_week = ? AND period_start = ?
      `).run(
        adjustment.new_day_of_week,
        adjustment.new_period_start,
        adjustment.new_classroom_id || adjustment.old_classroom_id,
        adjustment.course_id,
        adjustment.old_day_of_week,
        adjustment.old_period_start
      )

      if (adjustment.new_period_start) {
        db.prepare(`
          UPDATE schedule SET period_end = ? WHERE course_id = ? AND period_start = ?
        `).run(adjustment.new_period_start + 1, adjustment.course_id, adjustment.new_period_start)
      }
    }

    const message = `课程"${course.name}"调课通知：原周${adjustment.old_day_of_week}第${adjustment.old_period_start}节调整至周${adjustment.new_day_of_week}第${adjustment.new_period_start}节`
    db.prepare(
      'INSERT INTO notification (adjustment_id, class_id, message) VALUES (?, ?, ?)'
    ).run(parseInt(req.params.id), course.class_id, message)
  })

  try {
    approve()
    res.json({ success: true, message: '调课已审批通过' })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.put('/:id/reject', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('UPDATE adjustment SET status = ? WHERE id = ?').run('rejected', req.params.id)
  res.json({ success: true, message: '调课已驳回' })
})

router.post('/swap-room', (req: Request, res: Response) => {
  const db = getDb()
  const { course_id, new_classroom_id, reason } = req.body

  const schedule = db.prepare('SELECT * FROM schedule WHERE course_id = ?').all(course_id) as any[]
  if (schedule.length === 0) {
    res.status(404).json({ success: false, error: '课程无排课记录' })
    return
  }

  const swap = db.transaction(() => {
    for (const s of schedule) {
      db.prepare(
        `INSERT INTO adjustment (course_id, old_classroom_id, new_classroom_id, old_day_of_week, old_period_start, new_day_of_week, new_period_start, reason, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`
      ).run(course_id, s.classroom_id, new_classroom_id, s.day_of_week, s.period_start, s.day_of_week, s.period_start, reason || '临时换教室')

      db.prepare('UPDATE schedule SET classroom_id = ? WHERE id = ?').run(new_classroom_id, s.id)
    }

    const course = db.prepare('SELECT * FROM course WHERE id = ?').get(course_id) as any
    const newClassroom = db.prepare('SELECT * FROM classroom WHERE id = ?').get(new_classroom_id) as any
    const message = `课程"${course.name}"临时换教室通知：教室调整为${newClassroom.code}`
    db.prepare(
      'INSERT INTO notification (adjustment_id, class_id, message) VALUES (?, ?, ?)'
    ).run(0, course.class_id, message)
  })

  try {
    swap()
    res.json({ success: true, message: '换教室成功' })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/check-conflict', (req: Request, res: Response) => {
  const db = getDb()
  const { course_id, new_day_of_week, new_period_start, new_classroom_id } = req.query

  const course = db.prepare('SELECT * FROM course WHERE id = ?').get(course_id) as any
  if (!course) {
    res.status(404).json({ success: false, error: '课程不存在' })
    return
  }

  const conflicts: string[] = []
  const day = parseInt(new_day_of_week as string)
  const period = parseInt(new_period_start as string)
  const classroomId = parseInt(new_classroom_id as string)

  const teacherSchedules = db.prepare(`
    SELECT s.* FROM schedule s JOIN course c ON s.course_id = c.id
    WHERE c.teacher_id = ? AND s.day_of_week = ? AND s.period_start <= ? AND s.period_end >= ?
  `).all(course.teacher_id, day, period + 1, period)

  if (teacherSchedules.length > 0) {
    conflicts.push('教师时间冲突')
  }

  const classSchedules = db.prepare(`
    SELECT s.* FROM schedule s JOIN course c ON s.course_id = c.id
    WHERE c.class_id = ? AND s.day_of_week = ? AND s.period_start <= ? AND s.period_end >= ?
  `).all(course.class_id, day, period + 1, period)

  if (classSchedules.length > 0) {
    conflicts.push('学生课程冲突')
  }

  if (classroomId) {
    const roomSchedules = db.prepare(`
      SELECT s.* FROM schedule s
      WHERE s.classroom_id = ? AND s.day_of_week = ? AND s.period_start <= ? AND s.period_end >= ?
    `).all(classroomId, day, period + 1, period)

    if (roomSchedules.length > 0) {
      conflicts.push('教室已被占用')
    }
  }

  res.json({ success: true, data: { conflicts, hasConflict: conflicts.length > 0 } })
})

router.get('/notifications', (_req: Request, res: Response) => {
  const db = getDb()
  const notifications = db.prepare(`
    SELECT n.*, cl.name as class_name
    FROM notification n
    JOIN class cl ON n.class_id = cl.id
    ORDER BY n.created_at DESC
  `).all()
  res.json({ success: true, data: notifications })
})

export default router
