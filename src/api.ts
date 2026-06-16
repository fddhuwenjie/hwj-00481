const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  const json = await res.json();
  if (json && typeof json === 'object' && 'success' in json) {
    return json.success ? (json.data ?? json) : Promise.reject(new Error(json.error || 'Request failed'));
  }
  return json as T;
}

export function getCourses() {
  return request<any[]>('/courses');
}

export function getCourse(id: number) {
  return request<any>(`/courses/${id}`);
}

export function createCourse(data: any) {
  return request<any>('/courses', { method: 'POST', body: JSON.stringify(data) });
}

export function updateCourse(id: number, data: any) {
  return request<any>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteCourse(id: number) {
  return request<void>(`/courses/${id}`, { method: 'DELETE' });
}

export function getSemesters() {
  return request<any[]>('/semesters');
}

export function getCurrentSemester() {
  return request<any>('/semesters/current');
}

export function updateSemester(id: number, data: any) {
  return request<any>(`/semesters/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function getClassrooms() {
  return request<any[]>('/classrooms');
}

export function createClassroom(data: any) {
  return request<any>('/classrooms', { method: 'POST', body: JSON.stringify(data) });
}

export function updateClassroom(id: number, data: any) {
  return request<any>(`/classrooms/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteClassroom(id: number) {
  return request<void>(`/classrooms/${id}`, { method: 'DELETE' });
}

export function getClassroomAvailability(id: number) {
  return request<any>(`/classrooms/${id}/availability`);
}

export function updateClassroomStatus(id: number, data: any) {
  return request<any>(`/classrooms/${id}/status`, { method: 'PUT', body: JSON.stringify(data) });
}

export function getTeachers() {
  return request<any[]>('/teachers');
}

export function getClasses() {
  return request<any[]>('/classes');
}

export function getStudentTimetable(classId: number, week: number) {
  return request<any>(`/timetable/student/${classId}?week=${week}`);
}

export function getTeacherTimetable(teacherId: number, week: number) {
  return request<any>(`/timetable/teacher/${teacherId}?week=${week}`);
}

export function getClassroomTimetable(classroomId: number, week: number) {
  return request<any>(`/timetable/classroom/${classroomId}?week=${week}`);
}

export function getPendingCourses() {
  return request<any[]>('/scheduling/pending');
}

export function autoSchedule(courseIds: number[]) {
  return request<any>('/scheduling/auto', { method: 'POST', body: JSON.stringify({ courseIds }) });
}

export function confirmSchedule(slots: any[]) {
  return request<any>('/scheduling/confirm', { method: 'POST', body: JSON.stringify({ slots }) });
}

export function getAdjustments() {
  return request<any[]>('/adjustments');
}

export function createAdjustment(data: any) {
  const mapped: Record<string, any> = {};
  if (data.courseId != null) mapped.course_id = data.courseId;
  if (data.newDayOfWeek != null) mapped.new_day_of_week = data.newDayOfWeek;
  if (data.newPeriodStart != null) mapped.new_period_start = data.newPeriodStart;
  if (data.newClassroomId != null) mapped.new_classroom_id = data.newClassroomId;
  if (data.reason != null) mapped.reason = data.reason;
  return request<any>('/adjustments', { method: 'POST', body: JSON.stringify(mapped) });
}

export function approveAdjustment(id: number) {
  return request<any>(`/adjustments/${id}/approve`, { method: 'PUT' });
}

export function rejectAdjustment(id: number) {
  return request<any>(`/adjustments/${id}/reject`, { method: 'PUT' });
}

export function swapRoom(data: any) {
  const mapped: Record<string, any> = {};
  if (data.courseId != null) mapped.course_id = data.courseId;
  if (data.newClassroomId != null) mapped.new_classroom_id = data.newClassroomId;
  if (data.reason != null) mapped.reason = data.reason;
  return request<any>('/adjustments/swap-room', { method: 'POST', body: JSON.stringify(mapped) });
}

export function checkConflict(params: Record<string, any>) {
  const mapped: Record<string, any> = {};
  if (params.courseId != null) mapped.course_id = params.courseId;
  if (params.newDayOfWeek != null) mapped.new_day_of_week = params.newDayOfWeek;
  if (params.newPeriodStart != null) mapped.new_period_start = params.newPeriodStart;
  if (params.newClassroomId != null) mapped.new_classroom_id = params.newClassroomId;
  const query = new URLSearchParams(mapped).toString();
  return request<any>(`/adjustments/check-conflict?${query}`);
}

export function getNotifications() {
  return request<any[]>('/adjustments/notifications');
}

export function getClassroomUtilization() {
  return request<any>('/statistics/classroom-utilization');
}

export function getTimeslotHeatmap() {
  return request<any>('/statistics/timeslot-heatmap');
}

export function getTeacherWorkload() {
  return request<any>('/statistics/teacher-workload');
}

export function getFreeClassrooms(day: number, period: number) {
  return request<any[]>(`/statistics/free-classrooms?day=${day}&period=${period}`);
}

export function getSelectionPeriods() {
  return request<any[]>('/selection/periods');
}

export function createSelectionPeriod(data: any) {
  return request<any>('/selection/periods', { method: 'POST', body: JSON.stringify(data) });
}

export function updateSelectionPeriod(id: number, data: any) {
  return request<any>(`/selection/periods/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function getActiveSelectionPeriod() {
  return request<any>('/selection/active-period');
}

export function getAvailableCourses() {
  return request<any[]>('/selection/available-courses');
}

export function getStudents() {
  return request<any[]>('/selection/students');
}

export function selectCourse(studentId: number, courseId: number) {
  return request<any>('/selection/select', { method: 'POST', body: JSON.stringify({ student_id: studentId, course_id: courseId }) });
}

export function dropCourse(studentId: number, courseId: number) {
  return request<any>('/selection/drop', { method: 'POST', body: JSON.stringify({ student_id: studentId, course_id: courseId }) });
}

export function getMyCourses(studentId: number) {
  return request<any[]>(`/selection/my-courses/${studentId}`);
}

export function getSelectionStatistics() {
  return request<any>('/selection/statistics');
}

export function getExams() {
  return request<any[]>('/exams');
}

export function createExam(data: any) {
  return request<any>('/exams', { method: 'POST', body: JSON.stringify(data) });
}

export function updateExam(id: number, data: any) {
  return request<any>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteExam(id: number) {
  return request<void>(`/exams/${id}`, { method: 'DELETE' });
}

export function autoArrangeExams(data: any) {
  return request<any>('/exams/auto-arrange', { method: 'POST', body: JSON.stringify(data) });
}

export function getExamCalendar(month?: string) {
  const query = month ? `?month=${month}` : '';
  return request<any>(`/exams/calendar${query}`);
}

export function occupyClassroomForExam(id: number) {
  return request<any>(`/exams/${id}/occupy-classroom`, { method: 'PUT', body: JSON.stringify({}) });
}

export function getBookings() {
  return request<any[]>('/bookings');
}

export function createBooking(data: any) {
  return request<any>('/bookings', { method: 'POST', body: JSON.stringify(data) });
}

export function approveBooking(id: number) {
  return request<any>(`/bookings/${id}/approve`, { method: 'PUT', body: JSON.stringify({}) });
}

export function rejectBooking(id: number) {
  return request<any>(`/bookings/${id}/reject`, { method: 'PUT', body: JSON.stringify({}) });
}

export function deleteBooking(id: number) {
  return request<void>(`/bookings/${id}`, { method: 'DELETE' });
}

export function checkBookingAvailability(params: any) {
  const query = new URLSearchParams(params).toString();
  return request<any>(`/bookings/check-availability?${query}`);
}
