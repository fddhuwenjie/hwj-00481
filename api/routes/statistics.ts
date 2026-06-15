import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/classroom-utilization', (_req: Request, res: Response) => {
  const db = getDb()
  const classrooms = db.prepare('SELECT * FROM classroom').all() as any[]
  const totalSlots = 5 * 6

  const data = classrooms.map(cr => {
    const schedules = db.prepare(
      'SELECT * FROM schedule WHERE classroom_id = ?'
    ).all(cr.id) as any[]

    const uniqueSlots = new Set<string>()
    schedules.forEach(s => {
      const pairs = Math.ceil((s.period_end - s.period_start + 1) / 2)
      for (let i = 0; i < pairs; i++) {
        uniqueSlots.add(`${s.day_of_week}-${s.period_start + i * 2}`)
      }
    })

    return {
      id: cr.id,
      code: cr.code,
      building: cr.building,
      capacity: cr.capacity,
      type: cr.type,
      status: cr.status,
      usedSlots: uniqueSlots.size,
      totalSlots,
      utilization: Math.round((uniqueSlots.size / totalSlots) * 100)
    }
  })

  res.json({ success: true, data })
})

router.get('/timeslot-heatmap', (_req: Request, res: Response) => {
  const db = getDb()
  const heatmap: { day: number; period: number; count: number }[] = []

  for (const day of [1, 2, 3, 4, 5]) {
    for (const period of [1, 3, 5, 7, 9, 11]) {
      const count = db.prepare(`
        SELECT COUNT(*) as cnt FROM schedule
        WHERE day_of_week = ? AND period_start <= ? AND period_end >= ?
      `).get(day, period + 1, period) as { cnt: number }
      heatmap.push({ day, period, count: count.cnt })
    }
  }

  res.json({ success: true, data: heatmap })
})

router.get('/teacher-workload', (_req: Request, res: Response) => {
  const db = getDb()
  const teachers = db.prepare('SELECT * FROM teacher').all() as any[]

  const data = teachers.map(t => {
    const courses = db.prepare(
      'SELECT * FROM course WHERE teacher_id = ?'
    ).all(t.id) as any[]

    let totalHours = 0
    const courseList = courses.map(c => {
      totalHours += c.hours
      return { id: c.id, name: c.name, code: c.code, hours: c.hours }
    })

    const weeklyPeriods = db.prepare(`
      SELECT SUM(s.period_end - s.period_start + 1) as total
      FROM schedule s JOIN course c ON s.course_id = c.id
      WHERE c.teacher_id = ?
    `).get(t.id) as { total: number | null }

    return {
      id: t.id,
      name: t.name,
      title: t.title,
      department: t.department,
      courseCount: courses.length,
      totalHours,
      weeklyPeriods: weeklyPeriods.total || 0,
      courses: courseList
    }
  })

  res.json({ success: true, data })
})

router.get('/free-classrooms', (req: Request, res: Response) => {
  const db = getDb()
  const day = parseInt(req.query.day as string)
  const period = parseInt(req.query.period as string)

  if (!day || !period) {
    res.status(400).json({ success: false, error: '请提供星期和节次参数' })
    return
  }

  const busyClassroomIds = db.prepare(`
    SELECT DISTINCT classroom_id FROM schedule
    WHERE day_of_week = ? AND period_start <= ? AND period_end >= ?
  `).all(day, period + 1, period).map((r: any) => r.classroom_id)

  const freeClassrooms = db.prepare('SELECT * FROM classroom WHERE status = \'normal\'').all()
    .filter((cr: any) => !busyClassroomIds.includes(cr.id))

  res.json({ success: true, data: freeClassrooms })
})

export default router
