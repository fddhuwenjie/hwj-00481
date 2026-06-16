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
  const id = req.params.id
  const schedules = db.prepare(`
    SELECT s.*, c.name as course_name
    FROM schedule s
    JOIN course c ON s.course_id = c.id
    WHERE s.classroom_id = ?
  `).all(id) as any[]
  const classroom = db.prepare('SELECT * FROM classroom WHERE id = ?').get(id)
  const semester = db.prepare('SELECT * FROM semester WHERE is_current = 1').get() as any

  const slots: { day: number; period: number; status: string; courseName?: string; entryType?: string }[] = []
  for (const s of schedules) {
    const pairs = Math.ceil((s.period_end - s.period_start + 1) / 2)
    for (let i = 0; i < pairs; i++) {
      slots.push({
        day: s.day_of_week,
        period: Math.ceil((s.period_start + i * 2) / 2),
        status: 'occupied',
        courseName: s.course_name,
        entryType: 'course'
      })
    }
  }

  if (semester) {
    const startDate = new Date(semester.start_date)
    const endDate = new Date(semester.end_date)
    const toDateStr = (d: Date) => d.toISOString().split('T')[0]

    const exams = db.prepare(`
      SELECT e.*, c.name as course_name
      FROM exam e
      LEFT JOIN course c ON e.course_id = c.id
      WHERE e.classroom_id = ? AND e.exam_date >= ? AND e.exam_date <= ?
    `).all(id, toDateStr(startDate), toDateStr(endDate)) as any[]

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
      const periodPairs = Math.ceil((periodEnd - periodStart + 1) / 2)
      const startPairIdx = Math.ceil(periodStart / 2)
      for (let i = 0; i < periodPairs; i++) {
        slots.push({
          day: dayOfWeek,
          period: startPairIdx + i,
          status: 'occupied',
          courseName: `考试: ${exam.course_name}`,
          entryType: 'exam'
        })
      }
    }

    const bookings = db.prepare(`
      SELECT * FROM room_booking
      WHERE classroom_id = ? AND booking_date >= ? AND booking_date <= ? AND status = 'approved'
    `).all(id, toDateStr(startDate), toDateStr(endDate)) as any[]

    for (const booking of bookings) {
      const bookingDate = new Date(booking.booking_date)
      const dayOfWeek = bookingDate.getDay() || 7
      const periodPairs = Math.ceil((booking.period_end - booking.period_start + 1) / 2)
      const startPairIdx = Math.ceil(booking.period_start / 2)
      for (let i = 0; i < periodPairs; i++) {
        slots.push({
          day: dayOfWeek,
          period: startPairIdx + i,
          status: 'occupied',
          courseName: `活动: ${booking.purpose}`,
          entryType: 'booking'
        })
      }
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
