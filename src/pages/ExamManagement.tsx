import { useState, useEffect, useCallback } from 'react';
import { FileText, Calendar, Clock, Plus, Trash2, Zap, CheckCircle2, AlertCircle, Loader2, Building2, User } from 'lucide-react';
import * as api from '@/api';
import { useAppStore } from '@/store';

const EXAM_TYPE_BADGE: Record<string, string> = {
  midterm: 'bg-blue-100 text-blue-700',
  final: 'bg-orange-100 text-orange-700',
  makeup: 'bg-red-100 text-red-700',
};

const EXAM_TYPE_LABEL: Record<string, string> = {
  midterm: '期中',
  final: '期末',
  makeup: '补考',
};

const EXAM_TYPE_BORDER: Record<string, string> = {
  midterm: '#3b82f6',
  final: '#f97316',
  makeup: '#ef4444',
};

interface ExamForm {
  course_id: number | string;
  exam_date: string;
  start_time: string;
  duration: number | string;
  classroom_id: number | string;
  invigilator_id: number | string;
  exam_type: string;
}

const emptyExamForm: ExamForm = {
  course_id: '',
  exam_date: '',
  start_time: '',
  duration: '',
  classroom_id: '',
  invigilator_id: '',
  exam_type: 'final',
};

interface ArrangeForm {
  exam_type: string;
  start_date: string;
  end_date: string;
}

const emptyArrangeForm: ArrangeForm = {
  exam_type: 'final',
  start_date: '',
  end_date: '',
};

export default function ExamManagement() {
  const { courses, classrooms, teachers, fetchCourses, fetchClassrooms, fetchTeachers } = useAppStore();
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [exams, setExams] = useState<any[]>([]);
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [examForm, setExamForm] = useState<ExamForm>(emptyExamForm);
  const [showArrangeModal, setShowArrangeModal] = useState(false);
  const [arrangeForm, setArrangeForm] = useState<ArrangeForm>(emptyArrangeForm);
  const [arranging, setArranging] = useState(false);
  const [arrangeResult, setArrangeResult] = useState<any | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarData, setCalendarData] = useState<any>(null);

  useEffect(() => {
    if (courses.length === 0) fetchCourses();
    if (classrooms.length === 0) fetchClassrooms();
    if (teachers.length === 0) fetchTeachers();
  }, [courses.length, classrooms.length, teachers.length, fetchCourses, fetchClassrooms, fetchTeachers]);

  const fetchExams = useCallback(async () => {
    try {
      const data = await api.getExams();
      setExams(data);
    } catch {
      setExams([]);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const fetchCalendar = useCallback(async () => {
    try {
      const data = await api.getExamCalendar(calendarMonth);
      setCalendarData(data);
    } catch {
      setCalendarData(null);
    }
  }, [calendarMonth]);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendar();
    }
  }, [activeTab, fetchCalendar]);

  const handleOpenExamModal = (exam?: any) => {
    if (exam) {
      setEditingExamId(exam.id);
      setExamForm({
        course_id: exam.course_id ?? '',
        exam_date: exam.exam_date ?? '',
        start_time: exam.start_time ?? '',
        duration: exam.duration ?? '',
        classroom_id: exam.classroom_id ?? '',
        invigilator_id: exam.invigilator_id ?? '',
        exam_type: exam.exam_type ?? 'final',
      });
    } else {
      setEditingExamId(null);
      setExamForm(emptyExamForm);
    }
    setShowExamModal(true);
  };

  const handleExamSubmit = async () => {
    const payload = {
      ...examForm,
      course_id: Number(examForm.course_id),
      duration: Number(examForm.duration),
      classroom_id: Number(examForm.classroom_id),
      invigilator_id: Number(examForm.invigilator_id),
    };
    if (editingExamId !== null) {
      await api.updateExam(editingExamId, payload);
    } else {
      await api.createExam(payload);
    }
    setShowExamModal(false);
    fetchExams();
  };

  const handleDeleteExam = async (id: number) => {
    await api.deleteExam(id);
    fetchExams();
  };

  const handleOccupyClassroom = async (id: number) => {
    await api.occupyClassroomForExam(id);
    fetchExams();
  };

  const handleArrangeSubmit = async () => {
    setArranging(true);
    setArrangeResult(null);
    try {
      const result = await api.autoArrangeExams(arrangeForm);
      setArrangeResult(result);
      fetchExams();
    } catch {
      setArrangeResult(null);
    } finally {
      setArranging(false);
    }
  };

  const getCourseName = (exam: any) => {
    if (exam.course_name) return exam.course_name;
    const course = courses.find((c: any) => c.id === exam.course_id);
    return course?.name || `课程${exam.course_id}`;
  };

  const getCourseCode = (exam: any) => {
    if (exam.course_code) return exam.course_code;
    const course = courses.find((c: any) => c.id === exam.course_id);
    return course?.code || '-';
  };

  const getClassroomCode = (exam: any) => {
    if (exam.classroom_code) return exam.classroom_code;
    const classroom = classrooms.find((c: any) => c.id === exam.classroom_id);
    return classroom?.code || '-';
  };

  const getTeacherName = (exam: any) => {
    if (exam.invigilator_name) return exam.invigilator_name;
    const teacher = teachers.find((t: any) => t.id === exam.invigilator_id);
    return teacher?.name || '-';
  };

  const changeMonth = (delta: number) => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const calendarEntries: Record<string, any[]> = {};
  if (calendarData) {
    const items = Array.isArray(calendarData) ? calendarData : calendarData.exams || calendarData.days || [];
    items.forEach((exam: any) => {
      const date = exam.exam_date || exam.date;
      if (!date) return;
      if (!calendarEntries[date]) calendarEntries[date] = [];
      calendarEntries[date].push(exam);
    });
  }

  const sortedDates = Object.keys(calendarEntries).sort();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#1e3a5f' }}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
              考试管理
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              管理考试安排、智能排场与日历查看
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'list' ? { color: '#1e3a5f' } : undefined}
          >
            考试列表
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'calendar' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'calendar' ? { color: '#1e3a5f' } : undefined}
          >
            考试日历
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                  <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                    考试列表
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {exams.length} 场
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenExamModal()}
                    className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    <Plus className="w-4 h-4" />
                    新增考试
                  </button>
                  <button
                    onClick={() => {
                      setArrangeForm(emptyArrangeForm);
                      setArrangeResult(null);
                      setShowArrangeModal(true);
                    }}
                    className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    <Zap className="w-4 h-4" />
                    一键排场
                  </button>
                </div>
              </div>

              {exams.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">
                  暂无考试安排
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">课程名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">课程号</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">考试日期</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始时间</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时长(分钟)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教室</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">监考教师</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">考试类型</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {exams.map((exam) => (
                        <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{getCourseName(exam)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{getCourseCode(exam)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{exam.exam_date || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{exam.start_time || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{exam.duration ?? '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{getClassroomCode(exam)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{getTeacherName(exam)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_TYPE_BADGE[exam.exam_type] || 'bg-gray-100 text-gray-600'}`}>
                              {EXAM_TYPE_LABEL[exam.exam_type] || exam.exam_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOccupyClassroom(exam.id)}
                                className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                title="占用教室"
                              >
                                <Building2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenExamModal(exam)}
                                className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                                title="编辑"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExam(exam.id)}
                                className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                  考试日历
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                >
                  &lt;
                </button>
                <span className="text-sm font-medium" style={{ color: '#1e3a5f' }}>
                  {calendarMonth}
                </span>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                >
                  &gt;
                </button>
              </div>
            </div>

            {sortedDates.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                本月暂无考试安排
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sortedDates.map((date) => (
                  <div key={date} className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">{date}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {calendarEntries[date].length} 场
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {calendarEntries[date].map((exam: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-gray-100 p-4 shadow-sm"
                          style={{ borderLeftWidth: '4px', borderLeftColor: EXAM_TYPE_BORDER[exam.exam_type] || '#9ca3af' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800 text-sm truncate">
                              {getCourseName(exam)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_TYPE_BADGE[exam.exam_type] || 'bg-gray-100 text-gray-600'}`}>
                              {EXAM_TYPE_LABEL[exam.exam_type] || exam.exam_type}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{exam.start_time || '-'} · {exam.duration ?? '-'}分钟</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{getClassroomCode(exam)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              <span>{getTeacherName(exam)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showExamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowExamModal(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingExamId !== null ? '编辑考试' : '新增考试'}
                </h2>
                <button onClick={() => setShowExamModal(false)} className="text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">课程</label>
                  <select
                    value={examForm.course_id}
                    onChange={(e) => setExamForm({ ...examForm, course_id: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择课程</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">考试日期</label>
                  <input
                    type="date"
                    value={examForm.exam_date}
                    onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={examForm.start_time}
                    onChange={(e) => setExamForm({ ...examForm, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时长(分钟)</label>
                  <input
                    type="number"
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">教室</label>
                  <select
                    value={examForm.classroom_id}
                    onChange={(e) => setExamForm({ ...examForm, classroom_id: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择教室</option>
                    {classrooms.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.building}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">监考教师</label>
                  <select
                    value={examForm.invigilator_id}
                    onChange={(e) => setExamForm({ ...examForm, invigilator_id: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择教师</option>
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">考试类型</label>
                  <select
                    value={examForm.exam_type}
                    onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="midterm">期中</option>
                    <option value="final">期末</option>
                    <option value="makeup">补考</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleExamSubmit}
                  className="px-4 py-2 text-sm text-white rounded-lg transition-colors"
                  style={{ backgroundColor: '#1e3a5f' }}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {showArrangeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!arranging) setShowArrangeModal(false); }}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">一键排场</h2>
                {!arranging && (
                  <button onClick={() => setShowArrangeModal(false)} className="text-gray-400 hover:text-gray-600">
                    ×
                  </button>
                )}
              </div>

              {!arrangeResult ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">考试类型</label>
                      <select
                        value={arrangeForm.exam_type}
                        onChange={(e) => setArrangeForm({ ...arrangeForm, exam_type: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="final">期末</option>
                        <option value="midterm">期中</option>
                        <option value="makeup">补考</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                      <input
                        type="date"
                        value={arrangeForm.start_date}
                        onChange={(e) => setArrangeForm({ ...arrangeForm, start_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                      <input
                        type="date"
                        value={arrangeForm.end_date}
                        onChange={(e) => setArrangeForm({ ...arrangeForm, end_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowArrangeModal(false)}
                      disabled={arranging}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleArrangeSubmit}
                      disabled={arranging}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#e8723a' }}
                    >
                      {arranging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      开始排场
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-700">
                      成功排场 {arrangeResult.arranged ?? arrangeResult.scheduled ?? 0} 场考试
                    </span>
                  </div>

                  {(arrangeResult.failed || []).length > 0 && (
                    <div className="rounded-lg border border-red-200 overflow-hidden">
                      <div className="px-4 py-3 bg-red-50 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700">
                          排场失败 {(arrangeResult.failed || []).length} 场
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {(arrangeResult.failed || []).map((item: any, idx: number) => (
                          <div key={idx} className="px-4 py-2.5 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                            <span className="text-sm text-gray-800 flex-1 truncate">
                              {item.course?.name || item.courseName || item.course_name || '未知课程'}
                            </span>
                            <span className="text-xs text-red-500 truncate">
                              {item.reason || '原因未知'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowArrangeModal(false);
                        setArrangeResult(null);
                      }}
                      className="px-4 py-2 text-sm text-white rounded-lg transition-colors"
                      style={{ backgroundColor: '#1e3a5f' }}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
