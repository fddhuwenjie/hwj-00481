import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Courses from "@/pages/Courses"
import Classrooms from "@/pages/Classrooms"
import Scheduling from "@/pages/Scheduling"
import Timetable from "@/pages/Timetable"
import Adjustment from "@/pages/Adjustment"
import Statistics from "@/pages/Statistics"
import CourseSelection from "@/pages/CourseSelection"
import ExamManagement from "@/pages/ExamManagement"
import RoomBooking from "@/pages/RoomBooking"
import TeachingEvaluation from "@/pages/TeachingEvaluation"
import CourseResources from "@/pages/CourseResources"

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/classrooms" element={<Classrooms />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/adjustment" element={<Adjustment />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/selection" element={<CourseSelection />} />
          <Route path="/exams" element={<ExamManagement />} />
          <Route path="/bookings" element={<RoomBooking />} />
          <Route path="/evaluation" element={<TeachingEvaluation />} />
          <Route path="/resources" element={<CourseResources />} />
        </Routes>
      </Layout>
    </Router>
  )
}
