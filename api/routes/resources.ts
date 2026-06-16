import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/course/:courseId', (req: Request, res: Response) => {
  const db = getDb()
  const resources = db.prepare(`
    SELECT cr.*, t.name as uploader_name
    FROM course_resource cr
    LEFT JOIN teacher t ON cr.uploaded_by = t.id
    WHERE cr.course_id = ?
    ORDER BY cr.uploaded_at DESC
  `).all(req.params.courseId)
  res.json({ success: true, data: resources })
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { course_id, file_name, file_type, file_url, uploaded_by } = req.body

  if (!course_id || !file_name) {
    res.status(400).json({ success: false, error: '课程ID和文件名不能为空' })
    return
  }

  try {
    const result = db.prepare(
      'INSERT INTO course_resource (course_id, file_name, file_type, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?)'
    ).run(course_id, file_name, file_type || 'pdf', file_url || '', uploaded_by)
    res.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM course_resource WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
