import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

interface ScheduleSlot {
  course_id: number
  classroom_id: number
  day_of_week: number
  period_start: number
  period_end: number
  week_start: number
  week_end: number
  week_type: string
}

interface CourseInfo {
  id: number
  name: string
  code: string
  hours: number
  teacher_id: number
  student_count: number
  room_requirement: string
  class_id: number
  semester_id: number
}

interface ClassroomInfo {
  id: number
  code: string
  capacity: number
  type: string
  status: string
}

interface ExistingSchedule {
  course_id: number
  classroom_id: number
  day_of_week: number
  period_start: number
  period_end: number
  week_type: string
  teacher_id: number
  class_id: number
}

const DAYS = [1, 2, 3, 4, 5]
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const PERIOD_PAIRS: [number, number][] = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]]

function checkConflict(
  slot: { day_of_week: number; period_start: number; period_end: number },
  teacherId: number,
  classId: number,
  classroomId: number,
  existing: ExistingSchedule[],
  weekType: string
): { conflict: boolean; reason?: string } {
  for (const ex of existing) {
    if (ex.day_of_week !== slot.day_of_week) continue
    const periodsOverlap = !(slot.period_end < ex.period_start || slot.period_start > ex.period_end)
    if (!periodsOverlap) continue
    const weekOverlap =
      weekType === 'all' || ex.week_type === 'all' ||
      (weekType === 'odd' && ex.week_type === 'odd') ||
      (weekType === 'even' && ex.week_type === 'even')
    if (!weekOverlap) continue
    if (ex.teacher_id === teacherId) {
      return { conflict: true, reason: `教师时间冲突: 周${slot.day_of_week} 第${slot.period_start}-${slot.period_end}节` }
    }
    if (ex.class_id === classId) {
      return { conflict: true, reason: `学生课程冲突: 周${slot.day_of_week} 第${slot.period_start}-${slot.period_end}节` }
    }
    if (ex.classroom_id === classroomId) {
      return { conflict: true, reason: `教室占用冲突: 周${slot.day_of_week} 第${slot.period_start}-${slot.period_end}节` }
    }
  }
  return { conflict: false }
}

function findSlot(
  course: CourseInfo,
  classrooms: ClassroomInfo[],
  existing: ExistingSchedule[]
): ScheduleSlot[] | null {
  const compatibleClassrooms = classrooms
    .filter(cr => {
      if (cr.status !== 'normal') return false
      if (cr.capacity < course.student_count) return false
      if (course.room_requirement === 'lab' && cr.type !== 'lab') return false
      if (course.room_requirement === 'multimedia' && cr.type !== 'multimedia') return false
      if (course.room_requirement === 'lecture' && cr.type !== 'lecture') return false
      return true
    })
    .sort((a, b) => a.capacity - b.capacity)

  if (compatibleClassrooms.length === 0) return null

  const sessionsPerWeek = Math.max(2, Math.round(course.hours / 32))
  const result: ScheduleSlot[] = []
  const usedDays = new Set<number>()
  const usedSlots = new Set<string>()

  for (let s = 0; s < sessionsPerWeek; s++) {
    let placed = false

    const dayOrder = s < usedDays.size
      ? DAYS.filter(d => !usedDays.has(d)).concat(DAYS.filter(d => usedDays.has(d)))
      : DAYS

    for (const day of dayOrder) {
      for (const [pStart, pEnd] of PERIOD_PAIRS) {
        if (usedSlots.has(`${day}-${pStart}`)) continue

        for (const cr of compatibleClassrooms) {
          const slot = { day_of_week: day, period_start: pStart, period_end: pEnd }
          const check = checkConflict(slot, course.teacher_id, course.class_id, cr.id, existing, 'all')
          if (!check.conflict) {
            result.push({
              course_id: course.id,
              classroom_id: cr.id,
              day_of_week: day,
              period_start: pStart,
              period_end: pEnd,
              week_start: 1,
              week_end: 20,
              week_type: 'all'
            })
            existing.push({
              course_id: course.id,
              classroom_id: cr.id,
              day_of_week: day,
              period_start: pStart,
              period_end: pEnd,
              week_type: 'all',
              teacher_id: course.teacher_id,
              class_id: course.class_id
            })
            usedDays.add(day)
            usedSlots.add(`${day}-${pStart}`)
            placed = true
            break
          }
        }
        if (placed) break
      }
      if (placed) break
    }

    if (!placed) return null
  }

  return result
}

router.get('/pending', (_req: Request, res: Response) => {
  const db = getDb()
  const courses = db.prepare(`
    SELECT c.*, t.name as teacher_name, cl.name as class_name
    FROM course c
    LEFT JOIN teacher t ON c.teacher_id = t.id
    LEFT JOIN class cl ON c.class_id = cl.id
    WHERE c.is_fixed = 0
  `).all()
  res.json({ success: true, data: courses })
})

router.post('/auto', (req: Request, res: Response) => {
  const db = getDb()
  const { courseIds } = req.body as { courseIds: number[] }

  if (!courseIds || courseIds.length === 0) {
    res.status(400).json({ success: false, error: '请选择待排课程' })
    return
  }

  const courses = db.prepare(`
    SELECT c.* FROM course c WHERE c.is_fixed = 0 AND c.id IN (${courseIds.map(() => '?').join(',')})
  `).all(...courseIds) as CourseInfo[]

  const classrooms = db.prepare('SELECT * FROM classroom').all() as ClassroomInfo[]

  const existingSchedules = db.prepare(`
    SELECT s.*, c.teacher_id, c.class_id
    FROM schedule s
    JOIN course c ON s.course_id = c.id
  `).all() as ExistingSchedule[]

  const allNewSlots: ScheduleSlot[] = []
  const failedCourses: { course: CourseInfo; reason: string }[] = []
  const tempExisting = [...existingSchedules]

  const sortedCourses = [...courses].sort((a, b) => {
    const typePriority: Record<string, number> = { lab: 0, multimedia: 1, lecture: 2, normal: 3 }
    return (typePriority[a.room_requirement] ?? 4) - (typePriority[b.room_requirement] ?? 4)
  })

  for (const course of sortedCourses) {
    const slots = findSlot(course, classrooms, tempExisting)
    if (slots) {
      allNewSlots.push(...slots)
    } else {
      failedCourses.push({ course, reason: '无法找到满足条件的时间和教室' })
    }
  }

  res.json({
    success: true,
    data: {
      slots: allNewSlots,
      failed: failedCourses,
      total: courses.length,
      scheduled: allNewSlots.length > 0 ? new Set(allNewSlots.map(s => s.course_id)).size : 0
    }
  })
})

router.post('/confirm', (req: Request, res: Response) => {
  const db = getDb()
  const { slots } = req.body as { slots: ScheduleSlot[] }

  if (!slots || slots.length === 0) {
    res.status(400).json({ success: false, error: '无排课数据' })
    return
  }

  const insert = db.transaction(() => {
    const stmt = db.prepare(
      `INSERT INTO schedule (course_id, classroom_id, day_of_week, period_start, period_end, week_start, week_end, week_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const slot of slots) {
      stmt.run(slot.course_id, slot.classroom_id, slot.day_of_week, slot.period_start, slot.period_end, slot.week_start, slot.week_end, slot.week_type)
    }
    const courseIds = [...new Set(slots.map(s => s.course_id))]
    for (const cid of courseIds) {
      db.prepare('UPDATE course SET is_fixed = 1 WHERE id = ?').run(cid)
    }
  })

  try {
    insert()
    res.json({ success: true, message: '排课方案已确认入库' })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
