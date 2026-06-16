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
  const semester = db.prepare('SELECT * FROM semester WHERE is_current = 1').get() as any
  const schedules = db.prepare(`
    SELECT s.*, c.name as course_name, c.code as course_code, cr.code as classroom_code,
           t.name as teacher_name, cl.name as class_name,
           'course' as entry_type
    FROM schedule s
    JOIN course c ON s.course_id = c.id
    JOIN classroom cr ON s.classroom_id = cr.id
    JOIN teacher t ON c.teacher_id = t.id
    JOIN class cl ON c.class_id = cl.id
    WHERE s.classroom_id = ? AND s.week_start <= ? AND s.week_end >= ?
      AND (s.week_type = 'all' OR (s.week_type = 'odd' AND ? % 2 = 1) OR (s.week_type = 'even' AND ? % 2 = 0))
  `).all(req.params.classroomId, week, week, week, week) as any[]

  const allEntries: any[] = [...schedules]

  if (semester) {
    const startDate = new Date(semester.start_date)
    const weekStartDate = new Date(startDate.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEndDate = new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000)
    const toDateStr = (d: Date) => d.toISOString().split('T')[0]

    const exams = db.prepare(`
      SELECT e.*, c.name as course_name, c.code as course_code, cr.code as classroom_code,
             t.name as invigilator_name, 'exam' as entry_type
      FROM exam e
      LEFT JOIN course c ON e.course_id = c.id
      LEFT JOIN classroom cr ON e.classroom_id = cr.id
      LEFT JOIN teacher t ON e.invigilator_id = t.id
      WHERE e.classroom_id = ? AND e.exam_date >= ? AND e.exam_date <= ?
    `).all(req.params.classroomId, toDateStr(weekStartDate), toDateStr(weekEndDate)) as any[]

    for (const exam of exams) {
      const examDate = new Date(exam.exam_date)
      const dayOfWeek = examDate.getDay() || 7
      const hour = parseInt(exam.start_time.split(':')[0])
      const minute = parseInt(exam.start_time.split(':')[1])
      const timeMinutes = hour * 60 + minute

      let periodStart = 1
      if (timeMinutes >= 480 && timeMinutes < 600) periodStart = 1
      else if (timeMinutes >= 600 && timeMinutes < 720) periodStart = 3
      else if (timeMinutes >= 780 && timeMinutes < 900) periodStart = 5
      else if (timeMinutes >= 900 && timeMinutes < 1020) periodStart = 7
      else if (timeMinutes >= 1020 && timeMinutes < 1140) periodStart = 9
      else periodStart = 11

      const durationPeriods = Math.ceil(exam.duration / 90)
      const periodEnd = periodStart + durationPeriods * 2 - 1

      allEntries.push({
        ...exam,
        day_of_week: dayOfWeek,
        period_start: periodStart,
        period_end: periodEnd,
        teacher_name: exam.invigilator_name
      })
    }

    const bookings = db.prepare(`
      SELECT rb.*, cr.code as classroom_code, 'booking' as entry_type
      FROM room_booking rb
      LEFT JOIN classroom cr ON rb.classroom_id = cr.id
      WHERE rb.classroom_id = ? AND rb.booking_date >= ? AND rb.booking_date <= ? AND rb.status = 'approved'
    `).all(req.params.classroomId, toDateStr(weekStartDate), toDateStr(weekEndDate)) as any[]

    for (const booking of bookings) {
      const bookingDate = new Date(booking.booking_date)
      const dayOfWeek = bookingDate.getDay() || 7
      allEntries.push({
        ...booking,
        day_of_week: dayOfWeek,
        course_name: `活动: ${booking.purpose}`,
        teacher_name: booking.applicant
      })
    }
  }

  res.json({ success: true, data: allEntries })
})

export default router
