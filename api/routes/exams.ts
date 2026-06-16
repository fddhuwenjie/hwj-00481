import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const exams = db.prepare(`
    SELECT e.*, c.name as course_name, c.code as course_code,
      cr.code as classroom_code, cr.capacity as classroom_capacity,
      t.name as invigilator_name
    FROM exam e
    LEFT JOIN course c ON e.course_id = c.id
    LEFT JOIN classroom cr ON e.classroom_id = cr.id
    LEFT JOIN teacher t ON e.invigilator_id = t.id
    ORDER BY e.exam_date, e.start_time
  `).all()
  res.json({ success: true, data: exams })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { course_id, exam_date, start_time, duration, classroom_id, invigilator_id, exam_type } = req.body

  const existing = db.prepare(`
    SELECT * FROM exam WHERE classroom_id = ? AND exam_date = ? AND start_time = ?
  `).get(classroom_id, exam_date, start_time)
  if (existing) {
    res.status(400).json({ success: false, error: '该教室在该时段已有考试安排' })
    return
  }

  const invConflict = db.prepare(`
    SELECT * FROM exam WHERE invigilator_id = ? AND exam_date = ? AND start_time = ?
  `).get(invigilator_id, exam_date, start_time)
  if (invConflict) {
    res.status(400).json({ success: false, error: '该监考教师在该时段已有监考任务' })
    return
  }

  try {
    const result = db.prepare(
      'INSERT INTO exam (course_id, exam_date, start_time, duration, classroom_id, invigilator_id, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(course_id, exam_date, start_time, duration, classroom_id, invigilator_id, exam_type || 'final')
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { course_id, exam_date, start_time, duration, classroom_id, invigilator_id, exam_type, status } = req.body
  try {
    db.prepare(
      'UPDATE exam SET course_id=?, exam_date=?, start_time=?, duration=?, classroom_id=?, invigilator_id=?, exam_type=?, status=? WHERE id=?'
    ).run(course_id, exam_date, start_time, duration, classroom_id, invigilator_id, exam_type, status, req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM exam WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.post('/auto-arrange', (req: Request, res: Response) => {
  const db = getDb()
  const { exam_type, start_date, end_date } = req.body

  const courses = db.prepare(`
    SELECT c.*, cr.id as schedule_classroom_id
    FROM course c
    LEFT JOIN schedule s ON s.course_id = c.id
    LEFT JOIN classroom cr ON s.classroom_id = cr.id
    WHERE c.is_fixed = 1
    GROUP BY c.id
  `).all() as any[]

  const classrooms = db.prepare('SELECT * FROM classroom WHERE status = \'normal\' ORDER BY capacity ASC').all() as any[]
  const teachers = db.prepare('SELECT * FROM teacher').all() as any[]

  const existingExams = db.prepare('SELECT * FROM exam').all() as any[]

  const arranged: any[] = []
  const failed: any[] = []
  const usedSlots = new Set<string>()
  const usedInvigilators = new Set<string>()

  for (const ex of existingExams) {
    usedSlots.add(`${ex.classroom_id}-${ex.exam_date}-${ex.start_time}`)
    usedInvigilators.add(`${ex.invigilator_id}-${ex.exam_date}-${ex.start_time}`)
  }

  const startDate = new Date(start_date)
  const endDate = new Date(end_date)
  const examDates: string[] = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) {
      examDates.push(d.toISOString().split('T')[0])
    }
  }

  const timeSlots = ['09:00', '14:00', '16:00']

  for (const course of courses) {
    let placed = false
    const neededCapacity = course.student_count || 20

    for (const date of examDates) {
      for (const time of timeSlots) {
        if (usedSlots.has(`${course.schedule_classroom_id}-${date}-${time}`)) continue

        const suitableRoom = classrooms.find(cr => {
          if (cr.capacity < neededCapacity) return false
          return !usedSlots.has(`${cr.id}-${date}-${time}`)
        })

        if (!suitableRoom) continue

        const availableTeacher = teachers.find(t => {
          return !usedInvigilators.has(`${t.id}-${date}-${time}`) && t.id !== course.teacher_id
        })

        if (!availableTeacher) continue

        try {
          const result = db.prepare(
            'INSERT INTO exam (course_id, exam_date, start_time, duration, classroom_id, invigilator_id, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(course.id, date, time, 120, suitableRoom.id, availableTeacher.id, exam_type || 'final')

          usedSlots.add(`${suitableRoom.id}-${date}-${time}`)
          usedInvigilators.add(`${availableTeacher.id}-${date}-${time}`)

          arranged.push({
            id: result.lastInsertRowid,
            course_id: course.id,
            course_name: course.name,
            exam_date: date,
            start_time: time,
            duration: 120,
            classroom_id: suitableRoom.id,
            classroom_code: suitableRoom.code,
            invigilator_id: availableTeacher.id,
            invigilator_name: availableTeacher.name,
            exam_type: exam_type || 'final'
          })
          placed = true
          break
        } catch {
          continue
        }
      }
      if (placed) break
    }

    if (!placed) {
      failed.push({ course_id: course.id, course_name: course.name, reason: '无法找到合适的时间和教室' })
    }
  }

  res.json({
    success: true,
    data: { arranged, failed, total: courses.length, scheduled: arranged.length }
  })
})

router.get('/calendar', (req: Request, res: Response) => {
  const db = getDb()
  const { month } = req.query
  let exams = db.prepare(`
    SELECT e.*, c.name as course_name, c.code as course_code,
      cr.code as classroom_code, t.name as invigilator_name
    FROM exam e
    LEFT JOIN course c ON e.course_id = c.id
    LEFT JOIN classroom cr ON e.classroom_id = cr.id
    LEFT JOIN teacher t ON e.invigilator_id = t.id
    ORDER BY e.exam_date, e.start_time
  `).all() as any[]

  if (month) {
    exams = exams.filter((e: any) => e.exam_date && e.exam_date.startsWith(month as string))
  }

  const calendar: Record<string, any[]> = {}
  for (const exam of exams) {
    if (!calendar[exam.exam_date]) {
      calendar[exam.exam_date] = []
    }
    calendar[exam.exam_date].push(exam)
  }

  res.json({ success: true, data: calendar })
})

router.put('/:id/occupy-classroom', (req: Request, res: Response) => {
  const db = getDb()
  const exam = db.prepare('SELECT * FROM exam WHERE id = ?').get(req.params.id) as any
  if (!exam) {
    res.status(404).json({ success: false, error: '考试不存在' })
    return
  }
  db.prepare('UPDATE classroom SET status = ? WHERE id = ?').run('exam', exam.classroom_id)
  res.json({ success: true })
})

export default router
