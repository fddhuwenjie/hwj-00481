import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { getDb } from './database.js'
import courseRoutes from './routes/courses.js'
import semesterRoutes from './routes/semesters.js'
import classroomRoutes from './routes/classrooms.js'
import teacherRoutes from './routes/teachers.js'
import classRoutes from './routes/classes.js'
import timetableRoutes from './routes/timetable.js'
import schedulingRoutes from './routes/scheduling.js'
import adjustmentRoutes from './routes/adjustments.js'
import statisticsRoutes from './routes/statistics.js'
import selectionRoutes from './routes/selection.js'
import examRoutes from './routes/exams.js'
import bookingRoutes from './routes/bookings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use((_req: Request, _res: Response, next: NextFunction) => {
  getDb()
  next()
})

app.use('/api/courses', courseRoutes)
app.use('/api/semesters', semesterRoutes)
app.use('/api/classrooms', classroomRoutes)
app.use('/api/teachers', teacherRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/timetable', timetableRoutes)
app.use('/api/scheduling', schedulingRoutes)
app.use('/api/adjustments', adjustmentRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/selection', selectionRoutes)
app.use('/api/exams', examRoutes)
app.use('/api/bookings', bookingRoutes)

app.use(
  '/api/health',
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
