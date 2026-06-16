import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const bookings = db.prepare(`
    SELECT rb.*, cr.code as classroom_code, cr.building, cr.capacity
    FROM room_booking rb
    LEFT JOIN classroom cr ON rb.classroom_id = cr.id
    ORDER BY rb.created_at DESC
  `).all()
  res.json({ success: true, data: bookings })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { applicant, applicant_type, classroom_id, booking_date, period_start, period_end, purpose, attendees } = req.body

  const courseConflict = db.prepare(`
    SELECT s.*, c.name as course_name FROM schedule s
    JOIN course c ON s.course_id = c.id
    WHERE s.classroom_id = ? AND s.day_of_week = CAST(strftime('%w', ?) AS INTEGER)
  `).all(classroom_id, booking_date) as any[]

  const dow = new Date(booking_date).getDay() || 7
  for (const sch of courseConflict) {
    if (sch.day_of_week === dow) {
      if (!(period_end < sch.period_start || period_start > sch.period_end)) {
        res.status(400).json({ success: false, error: `该时段有课程安排: ${sch.course_name}` })
        return
      }
    }
  }

  const examConflict = db.prepare(`
    SELECT e.*, c.name as course_name FROM exam e
    JOIN course c ON e.course_id = c.id
    WHERE e.classroom_id = ? AND e.exam_date = ?
  `).all(classroom_id, booking_date) as any[]

  for (const exam of examConflict) {
    const examHour = parseInt(exam.start_time.split(':')[0])
    const examPeriod = examHour < 12 ? 1 : (examHour < 16 ? 5 : 7)
    const examPeriodEnd = examPeriod + 1
    if (!(period_end < examPeriod || period_start > examPeriodEnd)) {
      res.status(400).json({ success: false, error: `该时段有考试安排: ${exam.course_name}` })
      return
    }
  }

  const bookingConflict = db.prepare(`
    SELECT * FROM room_booking
    WHERE classroom_id = ? AND booking_date = ? AND status IN ('pending', 'approved')
  `).all(classroom_id, booking_date) as any[]

  for (const bk of bookingConflict) {
    if (!(period_end < bk.period_start || period_start > bk.period_end)) {
      res.status(400).json({ success: false, error: '该时段已有预约申请' })
      return
    }
  }

  try {
    const result = db.prepare(
      'INSERT INTO room_booking (applicant, applicant_type, classroom_id, booking_date, period_start, period_end, purpose, attendees) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(applicant, applicant_type, classroom_id, booking_date, period_start, period_end, purpose, attendees)
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.put('/:id/approve', (req: Request, res: Response) => {
  const db = getDb()
  const booking = db.prepare('SELECT * FROM room_booking WHERE id = ?').get(req.params.id) as any
  if (!booking) {
    res.status(404).json({ success: false, error: '预约不存在' })
    return
  }
  db.prepare('UPDATE room_booking SET status = ? WHERE id = ?').run('approved', req.params.id)
  res.json({ success: true, message: '审批通过' })
})

router.put('/:id/reject', (req: Request, res: Response) => {
  const db = getDb()
  const booking = db.prepare('SELECT * FROM room_booking WHERE id = ?').get(req.params.id) as any
  if (!booking) {
    res.status(404).json({ success: false, error: '预约不存在' })
    return
  }
  db.prepare('UPDATE room_booking SET status = ? WHERE id = ?').run('rejected', req.params.id)
  res.json({ success: true, message: '已拒绝' })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM room_booking WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.get('/check-availability', (req: Request, res: Response) => {
  const db = getDb()
  const { classroom_id, booking_date, period_start, period_end } = req.query

  const conflicts: any[] = []

  const dow = new Date(booking_date as string).getDay() || 7
  const courseSlots = db.prepare(`
    SELECT s.*, c.name as course_name FROM schedule s
    JOIN course c ON s.course_id = c.id
    WHERE s.classroom_id = ? AND s.day_of_week = ?
  `).all(classroom_id, dow) as any[]

  for (const sch of courseSlots) {
    const ps = Number(period_start)
    const pe = Number(period_end)
    if (!(pe < sch.period_start || ps > sch.period_end)) {
      conflicts.push({ type: 'course', name: sch.course_name, period: `${sch.period_start}-${sch.period_end}` })
    }
  }

  const examSlots = db.prepare(`
    SELECT e.*, c.name as course_name FROM exam e
    JOIN course c ON e.course_id = c.id
    WHERE e.classroom_id = ? AND e.exam_date = ?
  `).all(classroom_id, booking_date) as any[]

  for (const exam of examSlots) {
    conflicts.push({ type: 'exam', name: exam.course_name, time: exam.start_time })
  }

  const bookingSlots = db.prepare(`
    SELECT * FROM room_booking
    WHERE classroom_id = ? AND booking_date = ? AND status IN ('pending', 'approved')
  `).all(classroom_id, booking_date) as any[]

  for (const bk of bookingSlots) {
    const ps = Number(period_start)
    const pe = Number(period_end)
    if (!(pe < bk.period_start || ps > bk.period_end)) {
      conflicts.push({ type: 'booking', name: bk.purpose, period: `${bk.period_start}-${bk.period_end}` })
    }
  }

  res.json({ success: true, data: { available: conflicts.length === 0, conflicts } })
})

export default router
