import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '..', 'data', 'schedule.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initTables()
    seedData()
  }
  return db
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS semester (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_weeks INTEGER NOT NULL DEFAULT 20,
      is_current INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS teacher (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT DEFAULT '',
      department TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS class (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      student_count INTEGER NOT NULL DEFAULT 20
    );

    CREATE TABLE IF NOT EXISTS classroom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      building TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'normal',
      equipment TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'normal'
    );

    CREATE TABLE IF NOT EXISTS course (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      credits INTEGER NOT NULL DEFAULT 0,
      hours INTEGER NOT NULL DEFAULT 0,
      teacher_id INTEGER NOT NULL REFERENCES teacher(id),
      student_count INTEGER NOT NULL DEFAULT 0,
      room_requirement TEXT NOT NULL DEFAULT 'normal',
      is_fixed INTEGER NOT NULL DEFAULT 0,
      class_id INTEGER NOT NULL REFERENCES class(id),
      semester_id INTEGER NOT NULL REFERENCES semester(id)
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES course(id),
      classroom_id INTEGER NOT NULL REFERENCES classroom(id),
      day_of_week INTEGER NOT NULL,
      period_start INTEGER NOT NULL,
      period_end INTEGER NOT NULL,
      week_start INTEGER NOT NULL DEFAULT 1,
      week_end INTEGER NOT NULL DEFAULT 20,
      week_type TEXT NOT NULL DEFAULT 'all'
    );

    CREATE TABLE IF NOT EXISTS adjustment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES course(id),
      old_classroom_id INTEGER REFERENCES classroom(id),
      new_classroom_id INTEGER REFERENCES classroom(id),
      old_day_of_week INTEGER,
      old_period_start INTEGER,
      new_day_of_week INTEGER,
      new_period_start INTEGER,
      reason TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adjustment_id INTEGER NOT NULL REFERENCES adjustment(id),
      class_id INTEGER NOT NULL REFERENCES class(id),
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function seedData() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM semester').get() as { cnt: number }
  if (count.cnt > 0) return

  const insert = db.transaction(() => {
    db.prepare(`INSERT INTO semester (name, start_date, end_date, total_weeks, is_current) VALUES (?, ?, ?, ?, ?)`)
      .run('2025-2026学年第二学期', '2025-02-17', '2025-07-04', 20, 1)

    const teachers = [
      { name: '张明远', title: '教授', department: '计算机学院' },
      { name: '李晓华', title: '副教授', department: '数学学院' },
      { name: '王建国', title: '教授', department: '物理学院' },
      { name: '赵雪梅', title: '讲师', department: '计算机学院' },
      { name: '陈志强', title: '副教授', department: '电子工程学院' },
    ]
    const insertTeacher = db.prepare('INSERT INTO teacher (name, title, department) VALUES (?, ?, ?)')
    teachers.forEach(t => insertTeacher.run(t.name, t.title, t.department))

    const classes = [
      { name: '计科2301班', student_count: 20 },
      { name: '计科2302班', student_count: 20 },
      { name: '软工2301班', student_count: 20 },
    ]
    const insertClass = db.prepare('INSERT INTO class (name, student_count) VALUES (?, ?)')
    classes.forEach(c => insertClass.run(c.name, c.student_count))

    const classrooms = [
      { code: 'A101', building: '教学楼A', capacity: 60, type: 'multimedia', equipment: '投影,电脑,话筒' },
      { code: 'A201', building: '教学楼A', capacity: 120, type: 'lecture', equipment: '投影,话筒' },
      { code: 'A301', building: '教学楼A', capacity: 45, type: 'normal', equipment: '投影' },
      { code: 'B101', building: '教学楼B', capacity: 60, type: 'multimedia', equipment: '投影,电脑,话筒' },
      { code: 'B102', building: '教学楼B', capacity: 40, type: 'normal', equipment: '投影' },
      { code: 'B201', building: '教学楼B', capacity: 100, type: 'lecture', equipment: '投影,话筒' },
      { code: 'C101', building: '实验楼C', capacity: 30, type: 'lab', equipment: '投影,电脑,实验台' },
      { code: 'C102', building: '实验楼C', capacity: 30, type: 'lab', equipment: '投影,电脑,实验台' },
      { code: 'C201', building: '实验楼C', capacity: 50, type: 'multimedia', equipment: '投影,电脑,话筒' },
      { code: 'D101', building: '教学楼D', capacity: 80, type: 'normal', equipment: '投影,话筒' },
    ]
    const insertClassroom = db.prepare('INSERT INTO classroom (code, building, capacity, type, equipment) VALUES (?, ?, ?, ?, ?)')
    classrooms.forEach(c => insertClassroom.run(c.code, c.building, c.capacity, c.type, c.equipment))

    const courses = [
      { name: '数据结构与算法', code: 'CS201', credits: 4, hours: 64, teacher_id: 1, student_count: 20, room_requirement: 'multimedia', is_fixed: 1, class_id: 1, semester_id: 1 },
      { name: '高等数学A', code: 'MA101', credits: 5, hours: 80, teacher_id: 2, student_count: 20, room_requirement: 'lecture', is_fixed: 1, class_id: 1, semester_id: 1 },
      { name: '大学物理实验', code: 'PH102', credits: 2, hours: 32, teacher_id: 3, student_count: 20, room_requirement: 'lab', is_fixed: 1, class_id: 2, semester_id: 1 },
      { name: '操作系统', code: 'CS301', credits: 3, hours: 48, teacher_id: 4, student_count: 20, room_requirement: 'multimedia', is_fixed: 0, class_id: 1, semester_id: 1 },
      { name: '电路分析基础', code: 'EE201', credits: 3, hours: 48, teacher_id: 5, student_count: 20, room_requirement: 'normal', is_fixed: 1, class_id: 2, semester_id: 1 },
      { name: '数据库原理', code: 'CS302', credits: 3, hours: 48, teacher_id: 1, student_count: 20, room_requirement: 'multimedia', is_fixed: 0, class_id: 3, semester_id: 1 },
      { name: '线性代数', code: 'MA201', credits: 3, hours: 48, teacher_id: 2, student_count: 20, room_requirement: 'lecture', is_fixed: 1, class_id: 3, semester_id: 1 },
      { name: '软件工程', code: 'CS401', credits: 3, hours: 48, teacher_id: 4, student_count: 20, room_requirement: 'normal', is_fixed: 0, class_id: 3, semester_id: 1 },
    ]
    const insertCourse = db.prepare(`INSERT INTO course (name, code, credits, hours, teacher_id, student_count, room_requirement, is_fixed, class_id, semester_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    courses.forEach(c => insertCourse.run(c.name, c.code, c.credits, c.hours, c.teacher_id, c.student_count, c.room_requirement, c.is_fixed, c.class_id, c.semester_id))

    const schedules = [
      { course_id: 1, classroom_id: 1, day_of_week: 1, period_start: 1, period_end: 2, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 1, classroom_id: 1, day_of_week: 3, period_start: 3, period_end: 4, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 2, classroom_id: 2, day_of_week: 1, period_start: 3, period_end: 4, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 2, classroom_id: 2, day_of_week: 2, period_start: 1, period_end: 2, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 2, classroom_id: 2, day_of_week: 4, period_start: 1, period_end: 2, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 3, classroom_id: 7, day_of_week: 2, period_start: 5, period_end: 6, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 3, classroom_id: 7, day_of_week: 4, period_start: 5, period_end: 6, week_start: 1, week_end: 20, week_type: 'odd' },
      { course_id: 5, classroom_id: 3, day_of_week: 1, period_start: 5, period_end: 6, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 5, classroom_id: 3, day_of_week: 3, period_start: 5, period_end: 6, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 7, classroom_id: 6, day_of_week: 2, period_start: 3, period_end: 4, week_start: 1, week_end: 20, week_type: 'all' },
      { course_id: 7, classroom_id: 6, day_of_week: 5, period_start: 1, period_end: 2, week_start: 1, week_end: 20, week_type: 'all' },
    ]
    const insertSchedule = db.prepare(`INSERT INTO schedule (course_id, classroom_id, day_of_week, period_start, period_end, week_start, week_end, week_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    schedules.forEach(s => insertSchedule.run(s.course_id, s.classroom_id, s.day_of_week, s.period_start, s.period_end, s.week_start, s.week_end, s.week_type))
  })

  insert()
}
