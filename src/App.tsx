import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Courses from "@/pages/Courses"
import Classrooms from "@/pages/Classrooms"
import Scheduling from "@/pages/Scheduling"
import Timetable from "@/pages/Timetable"
import Adjustment from "@/pages/Adjustment"
import Statistics from "@/pages/Statistics"

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
        </Routes>
      </Layout>
    </Router>
  )
}
