import { useState, useEffect, useCallback } from 'react';
import {
  Star, MessageSquare, BarChart3, User, CheckCircle2, XCircle, Loader2,
  ChevronDown, BookOpen,
} from 'lucide-react';
import * as api from '@/api';
import { useAppStore } from '@/store';

const DIMENSIONS = [
  { key: 'content_score', label: '教学内容' },
  { key: 'method_score', label: '教学方法' },
  { key: 'interaction_score', label: '课堂互动' },
  { key: 'workload_score', label: '作业负担' },
];

const SCORE_BADGE: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  average: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-red-100 text-red-700',
};

function getScoreBadgeClass(score: number) {
  if (score >= 4.5) return SCORE_BADGE.excellent;
  if (score >= 3.5) return SCORE_BADGE.good;
  if (score >= 2.5) return SCORE_BADGE.average;
  return SCORE_BADGE.poor;
}

function getScoreLabel(score: number) {
  if (score >= 4.5) return '优秀';
  if (score >= 3.5) return '良好';
  if (score >= 2.5) return '一般';
  return '较差';
}

function getBarColor(score: number) {
  if (score >= 4.5) return '#22c55e';
  if (score >= 3.5) return '#3b82f6';
  if (score >= 2.5) return '#eab308';
  return '#ef4444';
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

function BarChart({ label, score, maxScore = 5 }: { label: string; score: number; maxScore?: number }) {
  const pct = Math.round((score / maxScore) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-20 text-right">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: getBarColor(score) }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-800 w-10">{score.toFixed(1)}</span>
    </div>
  );
}

const tabs = [
  { key: 'student' as const, label: '学生评价', icon: Star },
  { key: 'teacher' as const, label: '教师查看', icon: MessageSquare },
  { key: 'admin' as const, label: '评价统计', icon: BarChart3 },
];

export default function TeachingEvaluation() {
  const { students, teachers, viewRole, fetchStudents, fetchTeachers } = useAppStore();
  const [activeTab, setActiveTab] = useState<'student' | 'teacher' | 'admin'>('student');
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('');
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [evaluatedIds, setEvaluatedIds] = useState<number[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalCourse, setEvalCourse] = useState<any>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({
    content_score: 0,
    method_score: 0,
    interaction_score: 0,
    workload_score: 0,
  });
  const [comment, setComment] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [teacherEvals, setTeacherEvals] = useState<any[]>([]);
  const [teacherEvalsLoading, setTeacherEvalsLoading] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [courseEvals, setCourseEvals] = useState<any[]>([]);
  const [courseEvalsLoading, setCourseEvalsLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchTeachers();
  }, [fetchStudents, fetchTeachers]);

  useEffect(() => {
    if (viewRole === 'student') setActiveTab('student');
    else if (viewRole === 'teacher') setActiveTab('teacher');
    else setActiveTab('admin');
  }, [viewRole]);

  const loadStudentData = useCallback(async (studentId: number) => {
    setCoursesLoading(true);
    try {
      const [courses, evaluated] = await Promise.all([
        api.getMyCourses(studentId),
        api.getStudentEvaluated(studentId),
      ]);
      setMyCourses(courses);
      setEvaluatedIds(Array.isArray(evaluated) ? evaluated.map((e: any) => e.course_id || e.courseId) : []);
    } catch {
      setMyCourses([]);
      setEvaluatedIds([]);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentData(selectedStudentId);
    } else {
      setMyCourses([]);
      setEvaluatedIds([]);
    }
  }, [selectedStudentId, loadStudentData]);

  const loadTeacherData = useCallback(async (teacherId: number) => {
    setTeacherEvalsLoading(true);
    try {
      const data = await api.getTeacherEvaluations(teacherId);
      setTeacherEvals(Array.isArray(data) ? data : []);
    } catch {
      setTeacherEvals([]);
    } finally {
      setTeacherEvalsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      loadTeacherData(selectedTeacherId);
      setExpandedCourseId(null);
    } else {
      setTeacherEvals([]);
    }
  }, [selectedTeacherId, loadTeacherData]);

  const loadStatistics = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await api.getEvaluationStatistics();
      setStatistics(data);
    } catch {
      setStatistics(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'admin') {
      loadStatistics();
    }
  }, [activeTab, loadStatistics]);

  const handleOpenEval = (course: any) => {
    setEvalCourse(course);
    setRatings({ content_score: 0, method_score: 0, interaction_score: 0, workload_score: 0 });
    setComment('');
    setSubmitMsg('');
    setShowEvalModal(true);
  };

  const handleSubmitEval = async () => {
    if (!selectedStudentId || !evalCourse) return;
    if (ratings.content_score === 0 || ratings.method_score === 0 || ratings.interaction_score === 0 || ratings.workload_score === 0) {
      setSubmitMsg('请为所有维度评分');
      return;
    }
    setSubmitLoading(true);
    setSubmitMsg('');
    try {
      await api.createEvaluation({
        student_id: selectedStudentId,
        course_id: evalCourse.id,
        content_score: ratings.content_score,
        method_score: ratings.method_score,
        interaction_score: ratings.interaction_score,
        workload_score: ratings.workload_score,
        comment,
      });
      setSubmitMsg('评价提交成功！');
      setShowEvalModal(false);
      loadStudentData(selectedStudentId);
    } catch {
      setSubmitMsg('提交失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleExpandCourse = async (courseId: number) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      setCourseEvals([]);
      return;
    }
    setExpandedCourseId(courseId);
    setCourseEvalsLoading(true);
    try {
      const data = await api.getCourseEvaluations(courseId);
      setCourseEvals(Array.isArray(data) ? data : []);
    } catch {
      setCourseEvals([]);
    } finally {
      setCourseEvalsLoading(false);
    }
  };

  const computeCourseSummary = (courseEvalsList: any) => {
    if (!courseEvalsList || !Array.isArray(courseEvalsList.evaluations) || courseEvalsList.evaluations.length === 0) {
      return null;
    }
    const evals = courseEvalsList.evaluations;
    const count = evals.length;
    const avg = (key: string) =>
      Number((evals.reduce((s: number, e: any) => s + (e[key] || 0), 0) / count).toFixed(2));
    const content_score = avg('content_score');
    const method_score = avg('method_score');
    const interaction_score = avg('interaction_score');
    const workload_score = avg('workload_score');
    const avg_total = Number(((content_score + method_score + interaction_score + workload_score) / 4).toFixed(2));
    return { content_score, method_score, interaction_score, workload_score, avg_total, count };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#1e3a5f' }}>
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
              教学评价
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              学生评教、教师查看评价、管理员统计分析
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              style={activeTab === tab.key ? { backgroundColor: '#1e3a5f' } : undefined}
            >
              <tab.icon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {submitMsg && !showEvalModal && (
          <div
            className={`rounded-xl px-6 py-4 flex items-center gap-3 ${
              submitMsg.includes('成功')
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {submitMsg.includes('成功') ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <span className={`text-sm font-medium ${submitMsg.includes('成功') ? 'text-green-700' : 'text-red-700'}`}>
              {submitMsg}
            </span>
          </div>
        )}

        {activeTab === 'student' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Star className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                  学生评价
                </h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择学生</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(Number(e.target.value) || '')}
                    className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择学生</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name || s.student_name}</option>
                    ))}
                  </select>
                </div>

                {coursesLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}

                {!coursesLoading && selectedStudentId && myCourses.length === 0 && (
                  <div className="text-center text-gray-400 py-12">该学生暂无选课记录</div>
                )}

                {!coursesLoading && myCourses.length > 0 && (
                  <div className="space-y-3">
                    {myCourses.map((course: any) => {
                      const isEvaluated = evaluatedIds.includes(course.id);
                      return (
                        <div
                          key={course.id}
                          className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-800">{course.name || course.course_name}</div>
                              <div className="text-xs text-gray-500">
                                {course.teacher_name || course.teacherName || '未知教师'}
                                {course.department && ` · ${course.department}`}
                              </div>
                            </div>
                          </div>
                          {isEvaluated ? (
                            <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              已评价
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenEval(course)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                              style={{ backgroundColor: '#e8723a' }}
                            >
                              <Star className="w-3.5 h-3.5" />
                              评价
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teacher' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                  教师查看评价
                </h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择教师</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(Number(e.target.value) || '')}
                    className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择教师</option>
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name || t.teacher_name}</option>
                    ))}
                  </select>
                </div>

                {teacherEvalsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}

                {!teacherEvalsLoading && selectedTeacherId && teacherEvals.length === 0 && (
                  <div className="text-center text-gray-400 py-12">该教师暂无评价数据</div>
                )}

                {!teacherEvalsLoading && teacherEvals.length > 0 && (
                  <div className="space-y-4">
                    {teacherEvals.map((item: any) => {
                      const summary = computeCourseSummary(item);
                      const courseId = item.course_id || item.courseId;
                      const courseName = item.course_name || item.courseName || `课程 #${courseId}`;
                      const isExpanded = expandedCourseId === courseId;
                      return (
                        <div key={courseId} className="rounded-lg border border-gray-100 overflow-hidden">
                          <div
                            className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleExpandCourse(courseId)}
                          >
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-800">{courseName}</div>
                                {summary && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {summary.count} 条评价 · 平均 {summary.avg_total} 分
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {summary && (
                                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${getScoreBadgeClass(summary.avg_total)}`}>
                                  {summary.avg_total} - {getScoreLabel(summary.avg_total)}
                                </span>
                              )}
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>

                          {summary && (
                            <div className="px-5 pb-3">
                              <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                                <BarChart label="教学内容" score={summary.content_score} />
                                <BarChart label="教学方法" score={summary.method_score} />
                                <BarChart label="课堂互动" score={summary.interaction_score} />
                                <BarChart label="作业负担" score={summary.workload_score} />
                              </div>
                            </div>
                          )}

                          {isExpanded && (
                            <div className="px-5 pb-4">
                              {courseEvalsLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                </div>
                              ) : courseEvals.length === 0 ? (
                                <div className="text-center text-gray-400 py-6 text-sm">暂无详细评价</div>
                              ) : (
                                <div className="space-y-3">
                                  {courseEvals.map((ev: any, idx: number) => (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                      <div className="flex items-center gap-4 mb-2">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                          <User className="w-3.5 h-3.5 text-gray-400" />
                                          学生 #{ev.student_id || ev.studentId || idx + 1}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {DIMENSIONS.map((dim) => (
                                            <span
                                              key={dim.key}
                                              className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded font-medium ${getScoreBadgeClass(ev[dim.key] || 0)}`}
                                            >
                                              {dim.label.slice(0, 2)} {ev[dim.key] || 0}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      {ev.comment && (
                                        <div className="text-sm text-gray-600 bg-white rounded-md px-3 py-2 border border-gray-100">
                                          {ev.comment}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : !statistics ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                暂无统计数据
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                    <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                      课程评价排行
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left font-medium text-gray-600">排名</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">课程</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">教学内容</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">教学方法</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">课堂互动</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">作业负担</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">综合评分</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">评价数</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(statistics.ranking || statistics.leaderboard || []).map((item: any, idx: number) => {
                          const avgTotal = item.avg_total || item.avgTotal || 0;
                          return (
                            <tr key={item.course_id || item.courseId || idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                  idx === 1 ? 'bg-gray-200 text-gray-700' :
                                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {item.course_name || item.courseName || `课程 #${item.course_id || item.courseId}`}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{(item.avg_content || item.avgContent || item.content_score || 0).toFixed(1)}</td>
                              <td className="px-4 py-3 text-gray-600">{(item.avg_method || item.avgMethod || item.method_score || 0).toFixed(1)}</td>
                              <td className="px-4 py-3 text-gray-600">{(item.avg_interaction || item.avgInteraction || item.interaction_score || 0).toFixed(1)}</td>
                              <td className="px-4 py-3 text-gray-600">{(item.avg_workload || item.avgWorkload || item.workload_score || 0).toFixed(1)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${getScoreBadgeClass(avgTotal)}`}>
                                  {avgTotal.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{item.eval_count || item.evalCount || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                    <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                      院系对比
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left font-medium text-gray-600">院系</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">教学内容</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">教学方法</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">课堂互动</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">作业负担</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">综合评分</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">课程数</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(statistics.departments || []).map((dept: any, idx: number) => {
                          const avgTotal = dept.avg_total || dept.avgTotal || 0;
                          return (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-800">{dept.department || dept.name || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{(dept.avg_content || dept.avgContent || 0).toFixed(1)}</td>
                              <td className="px-4 py-3 text-gray-600">{(dept.avg_method || dept.avgMethod || 0).toFixed(1)}</td>
                              <td className="px-4 py-3 text-gray-600">{(dept.avg_interaction || dept.avgInteraction || 0).toFixed(1)}</td>
                              <td className="px-4 py-3 text-gray-600">{(dept.avg_workload || dept.avgWorkload || 0).toFixed(1)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${getScoreBadgeClass(avgTotal)}`}>
                                  {avgTotal.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{dept.course_count || dept.courseCount || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {showEvalModal && evalCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEvalModal(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  评价 - {evalCourse.name || evalCourse.course_name}
                </h2>
                <button onClick={() => setShowEvalModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-5">
                {DIMENSIONS.map((dim) => (
                  <div key={dim.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{dim.label}</label>
                    <StarRating
                      value={ratings[dim.key]}
                      onChange={(v) => setRatings({ ...ratings, [dim.key]: v })}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">评价意见</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请输入您的评价意见（选填）"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {submitMsg && (
                  <div
                    className={`rounded-lg px-4 py-3 flex items-center gap-2 ${
                      submitMsg.includes('成功')
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {submitMsg.includes('成功') ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${submitMsg.includes('成功') ? 'text-green-700' : 'text-red-700'}`}>
                      {submitMsg}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSubmitEval}
                    disabled={submitLoading || ratings.content_score === 0 || ratings.method_score === 0 || ratings.interaction_score === 0 || ratings.workload_score === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    {submitLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                    提交评价
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
