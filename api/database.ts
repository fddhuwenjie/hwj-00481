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
      max_selection INTEGER NOT NULL DEFAULT 0,
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
      type TEXT NOT NULL DEFAULT 'adjustment',
      adjustment_id INTEGER REFERENCES adjustment(id),
      exam_id INTEGER REFERENCES exam(id),
      course_id INTEGER REFERENCES course(id),
      class_id INTEGER REFERENCES class(id),
      student_id INTEGER REFERENCES student(id),
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_evaluation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES student(id),
      course_id INTEGER NOT NULL REFERENCES course(id),
      content_score INTEGER NOT NULL DEFAULT 0,
      method_score INTEGER NOT NULL DEFAULT 0,
      interaction_score INTEGER NOT NULL DEFAULT 0,
      workload_score INTEGER NOT NULL DEFAULT 0,
      comment TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS course_resource (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES course(id),
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'pdf',
      file_url TEXT NOT NULL DEFAULT '',
      uploaded_by INTEGER NOT NULL REFERENCES teacher(id),
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      student_no TEXT NOT NULL UNIQUE,
      class_id INTEGER NOT NULL REFERENCES class(id)
    );

    CREATE TABLE IF NOT EXISTS selection_period (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS course_selection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES student(id),
      course_id INTEGER NOT NULL REFERENCES course(id),
      selected_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'selected',
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS exam (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES course(id),
      exam_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration INTEGER NOT NULL,
      classroom_id INTEGER NOT NULL REFERENCES classroom(id),
      invigilator_id INTEGER NOT NULL REFERENCES teacher(id),
      exam_type TEXT NOT NULL DEFAULT 'final',
      status TEXT NOT NULL DEFAULT 'scheduled'
    );

    CREATE TABLE IF NOT EXISTS room_booking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant TEXT NOT NULL,
      applicant_type TEXT NOT NULL DEFAULT 'teacher',
      classroom_id INTEGER NOT NULL REFERENCES classroom(id),
      booking_date TEXT NOT NULL,
      period_start INTEGER NOT NULL,
      period_end INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      attendees INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
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
      { name: '数据结构与算法', code: 'CS201', credits: 4, hours: 64, teacher_id: 1, student_count: 20, room_requirement: 'multimedia', is_fixed: 1, max_selection: 60, class_id: 1, semester_id: 1 },
      { name: '高等数学A', code: 'MA101', credits: 5, hours: 80, teacher_id: 2, student_count: 20, room_requirement: 'lecture', is_fixed: 1, max_selection: 120, class_id: 1, semester_id: 1 },
      { name: '大学物理实验', code: 'PH102', credits: 2, hours: 32, teacher_id: 3, student_count: 20, room_requirement: 'lab', is_fixed: 1, max_selection: 30, class_id: 2, semester_id: 1 },
      { name: '操作系统', code: 'CS301', credits: 3, hours: 48, teacher_id: 4, student_count: 20, room_requirement: 'multimedia', is_fixed: 0, max_selection: 60, class_id: 1, semester_id: 1 },
      { name: '电路分析基础', code: 'EE201', credits: 3, hours: 48, teacher_id: 5, student_count: 20, room_requirement: 'normal', is_fixed: 1, max_selection: 45, class_id: 2, semester_id: 1 },
      { name: '数据库原理', code: 'CS302', credits: 3, hours: 48, teacher_id: 1, student_count: 20, room_requirement: 'multimedia', is_fixed: 0, max_selection: 60, class_id: 3, semester_id: 1 },
      { name: '线性代数', code: 'MA201', credits: 3, hours: 48, teacher_id: 2, student_count: 20, room_requirement: 'lecture', is_fixed: 1, max_selection: 100, class_id: 3, semester_id: 1 },
      { name: '软件工程', code: 'CS401', credits: 3, hours: 48, teacher_id: 4, student_count: 20, room_requirement: 'normal', is_fixed: 0, max_selection: 80, class_id: 3, semester_id: 1 },
    ]
    const insertCourse = db.prepare(`INSERT INTO course (name, code, credits, hours, teacher_id, student_count, room_requirement, is_fixed, max_selection, class_id, semester_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    courses.forEach(c => insertCourse.run(c.name, c.code, c.credits, c.hours, c.teacher_id, c.student_count, c.room_requirement, c.is_fixed, c.max_selection, c.class_id, c.semester_id))

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

    const students = [
      { name: '刘伟', student_no: '2023001', class_id: 1 },
      { name: '陈静', student_no: '2023002', class_id: 1 },
      { name: '李强', student_no: '2023003', class_id: 1 },
      { name: '王芳', student_no: '2023004', class_id: 1 },
      { name: '赵磊', student_no: '2023005', class_id: 1 },
      { name: '孙丽', student_no: '2023006', class_id: 2 },
      { name: '周洋', student_no: '2023007', class_id: 2 },
      { name: '吴刚', student_no: '2023008', class_id: 2 },
      { name: '郑慧', student_no: '2023009', class_id: 2 },
      { name: '马超', student_no: '2023010', class_id: 2 },
      { name: '黄敏', student_no: '2023011', class_id: 3 },
      { name: '林涛', student_no: '2023012', class_id: 3 },
      { name: '何雪', student_no: '2023013', class_id: 3 },
      { name: '罗杰', student_no: '2023014', class_id: 3 },
      { name: '谢婷', student_no: '2023015', class_id: 3 },
    ]
    const insertStudent = db.prepare('INSERT INTO student (name, student_no, class_id) VALUES (?, ?, ?)')
    students.forEach(s => insertStudent.run(s.name, s.student_no, s.class_id))

    db.prepare(`INSERT INTO selection_period (name, start_time, end_time, is_active) VALUES (?, ?, ?, ?)`)
      .run('2025-2026第二学期选课', '2025-06-01 00:00:00', '2025-06-30 23:59:59', 1)

    const selections = [
      { student_id: 1, course_id: 4, status: 'selected' },
      { student_id: 2, course_id: 4, status: 'selected' },
      { student_id: 3, course_id: 6, status: 'selected' },
      { student_id: 6, course_id: 8, status: 'selected' },
      { student_id: 7, course_id: 8, status: 'selected' },
      { student_id: 11, course_id: 4, status: 'selected' },
    ]
    const insertSelection = db.prepare('INSERT INTO course_selection (student_id, course_id, status) VALUES (?, ?, ?)')
    selections.forEach(s => insertSelection.run(s.student_id, s.course_id, s.status))

    const exams = [
      { course_id: 1, exam_date: '2025-07-01', start_time: '09:00', duration: 120, classroom_id: 2, invigilator_id: 2, exam_type: 'final' },
      { course_id: 2, exam_date: '2025-07-02', start_time: '09:00', duration: 120, classroom_id: 2, invigilator_id: 5, exam_type: 'final' },
      { course_id: 3, exam_date: '2025-06-25', start_time: '14:00', duration: 90, classroom_id: 7, invigilator_id: 4, exam_type: 'midterm' },
      { course_id: 7, exam_date: '2025-07-03', start_time: '09:00', duration: 120, classroom_id: 6, invigilator_id: 1, exam_type: 'final' },
    ]
    const insertExam = db.prepare('INSERT INTO exam (course_id, exam_date, start_time, duration, classroom_id, invigilator_id, exam_type) VALUES (?, ?, ?, ?, ?, ?, ?)')
    exams.forEach(e => insertExam.run(e.course_id, e.exam_date, e.start_time, e.duration, e.classroom_id, e.invigilator_id, e.exam_type))

    const bookings = [
      { applicant: '计算机协会', applicant_type: 'club', classroom_id: 1, booking_date: '2025-06-20', period_start: 7, period_end: 8, purpose: '技术分享会', attendees: 50, status: 'approved' },
      { applicant: '李晓华', applicant_type: 'teacher', classroom_id: 3, booking_date: '2025-06-22', period_start: 5, period_end: 6, purpose: '学术讲座', attendees: 40, status: 'pending' },
    ]
    const insertBooking = db.prepare('INSERT INTO room_booking (applicant, applicant_type, classroom_id, booking_date, period_start, period_end, purpose, attendees, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    bookings.forEach(b => insertBooking.run(b.applicant, b.applicant_type, b.classroom_id, b.booking_date, b.period_start, b.period_end, b.purpose, b.attendees, b.status))

    const evaluations = [
      { student_id: 1, course_id: 1, content_score: 5, method_score: 4, interaction_score: 4, workload_score: 3, comment: '课程内容丰富，逻辑清晰' },
      { student_id: 2, course_id: 1, content_score: 4, method_score: 5, interaction_score: 4, workload_score: 3, comment: '老师讲解生动，互动多' },
      { student_id: 3, course_id: 2, content_score: 5, method_score: 4, interaction_score: 3, workload_score: 5, comment: '高数难度大，作业多但收获大' },
      { student_id: 6, course_id: 8, content_score: 4, method_score: 4, interaction_score: 5, workload_score: 3, comment: '项目实践有趣，团队协作好' },
      { student_id: 1, course_id: 4, content_score: 4, method_score: 3, interaction_score: 4, workload_score: 4, comment: '操作系统概念讲解清晰' },
    ]
    const insertEval = db.prepare('INSERT INTO course_evaluation (student_id, course_id, content_score, method_score, interaction_score, workload_score, comment) VALUES (?, ?, ?, ?, ?, ?, ?)')
    evaluations.forEach(e => insertEval.run(e.student_id, e.course_id, e.content_score, e.method_score, e.interaction_score, e.workload_score, e.comment))

    const resources = [
      { course_id: 1, file_name: '数据结构第一章-绪论.pdf', file_type: 'pdf', file_url: 'https://example.com/ds-ch1.pdf', uploaded_by: 1 },
      { course_id: 1, file_name: '数据结构第二章-线性表.pdf', file_type: 'pdf', file_url: 'https://example.com/ds-ch2.pdf', uploaded_by: 1 },
      { course_id: 2, file_name: '高等数学上册课件.pdf', file_type: 'pdf', file_url: 'https://example.com/math1.pdf', uploaded_by: 2 },
      { course_id: 4, file_name: '操作系统课件合集.pdf', file_type: 'pdf', file_url: 'https://example.com/os-all.pdf', uploaded_by: 4 },
      { course_id: 6, file_name: '数据库原理实验指导.pdf', file_type: 'pdf', file_url: 'https://example.com/db-lab.pdf', uploaded_by: 1 },
    ]
    const insertResource = db.prepare('INSERT INTO course_resource (course_id, file_name, file_type, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?)')
    resources.forEach(r => insertResource.run(r.course_id, r.file_name, r.file_type, r.file_url, r.uploaded_by))

    const notifications = [
      { type: 'exam', exam_id: 1, class_id: 1, message: '考试通知：数据结构与算法期末考试定于2025-07-01 09:00在A201举行', is_read: 0 },
      { type: 'exam', exam_id: 2, class_id: 1, message: '考试通知：高等数学A期末考试定于2025-07-02 09:00在A201举行', is_read: 0 },
      { type: 'selection', course_id: 4, class_id: 1, message: '选课通知：操作系统课程目前选课名额有变动，请关注', is_read: 1 },
      { type: 'selection', course_id: 6, class_id: 3, message: '选课通知：数据库原理课程目前选课名额有变动，请关注', is_read: 0 },
    ]
    const insertNotification = db.prepare('INSERT INTO notification (type, adjustment_id, exam_id, course_id, class_id, message, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)')
    notifications.forEach(n => insertNotification.run(n.type, n.adjustment_id || null, n.exam_id || null, n.course_id || null, n.class_id, n.message, n.is_read))
  })

  try {
    insert()
  } catch (e: any) {
    console.error('Seed data error:', e.message)
  }
}
