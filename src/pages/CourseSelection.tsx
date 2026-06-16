import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Users, Clock, TrendingUp, CheckCircle2, XCircle, AlertCircle, Plus, Settings, Loader2 } from 'lucide-react';
import * as api from '@/api';
import { useAppStore } from '@/store';

const DAYS = ['周一', '周二', '周三', '周四', '周五'];
const PERIODS = ['第1-2节', '第3-4节', '第5-6节', '第7-8节', '第9-10节', '第11-12节'];

const COURSE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const ROOM_REQ_LABELS: Record<string, string> = {
  multimedia: '多媒体',
  lab: '实验室',
  lecture: '阶梯教室',
  normal: '普通教室',
};

const TABS = [
  { key: 'hall', label: '选课大厅', icon: BookOpen },
  { key: 'my', label: '我的选课', icon: Users },
  { key: 'stats', label: '选课统计', icon: TrendingUp },
];

function getCourseColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

function getRemainingColor(remaining: number) {
  if (remaining > 20) return '#22c55e';
  if (remaining >= 5) return '#f59e0b';
  return '#ef4444';
}

function getRateColor(rate: number) {
  if (rate >= 80) return '#22c55e';
  if (rate >= 50) return '#f59e0b';
  return '#ef4444';
}

function getRankBadge(idx: number) {
  if (idx === 0) return 'bg-yellow-400 text-yellow-900';
  if (idx === 1) return 'bg-gray-300 text-gray-700';
  if (idx === 2) return 'bg-amber-600 text-white';
  return 'bg-gray-100 text-gray-500';
}

export default function CourseSelection() {
  const { students, fetchStudents, viewRole, selectionPeriods, fetchSelectionPeriods } = useAppStore();

  const [activeTab, setActiveTab] = useState('hall');
  const [activePeriod, setActivePeriod] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [conflictMsg, setConflictMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: '', start_time: '', end_time: '', is_active: true });
  const [periodSubmitting, setPeriodSubmitting] = useState(false);

  useEffect(() => {
    if (students.length === 0) fetchStudents();
    if (selectionPeriods.length === 0) fetchSelectionPeriods();
  }, [students.length, fetchStudents, selectionPeriods.length, fetchSelectionPeriods]);

  const fetchActivePeriod = useCallback(async () => {
    try {
      const data = await api.getActiveSelectionPeriod();
      setActivePeriod(data);
    } catch {
      setActivePeriod(null);
    }
  }, []);

  const fetchAvailableCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAvailableCourses();
      setAvailableCourses(Array.isArray(data) ? data : []);
    } catch {
      setAvailableCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyCourses = useCallback(async () => {
    if (!selectedStudentId) {
      setMyCourses([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getMyCourses(selectedStudentId);
      setMyCourses(Array.isArray(data) ? data : []);
    } catch {
      setMyCourses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSelectionStatistics();
      setStatistics(data);
    } catch {
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivePeriod();
    fetchAvailableCourses();
  }, [fetchActivePeriod, fetchAvailableCourses]);

  useEffect(() => {
    if (activeTab === 'my') fetchMyCourses();
    if (activeTab === 'stats') fetchStatistics();
  }, [activeTab, fetchMyCourses, fetchStatistics]);

  const handleSelectCourse = async (courseId: number) => {
    if (!selectedStudentId) {
      setErrorMsg('请先选择学生');
      return;
    }
    setSelecting(courseId);
    setConflictMsg('');
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const result = await api.selectCourse(selectedStudentId, courseId);
      if (result?.conflict || result?.hasConflict) {
        setConflictMsg(result.message || result.conflict || '该课程与已选课程时间冲突');
      } else {
        setSuccessMsg('选课成功');
        fetchMyCourses();
        fetchAvailableCourses();
      }
    } catch (e: any) {
      const msg = e?.message || '选课失败';
      if (msg.includes('冲突') || msg.includes('conflict')) {
        setConflictMsg(msg);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setSelecting(null);
      setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
        setConflictMsg('');
      }, 3000);
    }
  };

  const handleDropCourse = async (courseId: number) => {
    if (!selectedStudentId) return;
    try {
      await api.dropCourse(selectedStudentId, courseId);
      setSuccessMsg('退选成功');
      fetchMyCourses();
      fetchAvailableCourses();
    } catch (e: any) {
      setErrorMsg(e?.message || '退选失败');
    } finally {
      setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 3000);
    }
  };

  const handleCreatePeriod = async () => {
    setPeriodSubmitting(true);
    try {
      await api.createSelectionPeriod(periodForm);
      setShowPeriodModal(false);
      setPeriodForm({ name: '', start_time: '', end_time: '', is_active: true });
      fetchSelectionPeriods();
      fetchActivePeriod();
      setSuccessMsg('选课时间段创建成功');
    } catch (e: any) {
      setErrorMsg(e?.message || '创建失败');
    } finally {
      setPeriodSubmitting(false);
      setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 3000);
    }
  };

  const filteredCourses = filterType === 'all'
    ? availableCourses
    : availableCourses.filter((c) => c.room_requirement === filterType);

  const timetableGrid: (any | null)[][] = PERIODS.map(() => DAYS.map(() => null));
  myCourses.forEach((course: any) => {
    const dayIdx = (course.day_of_week || course.day || 1) - 1;
    const periodStart = course.period_start || course.period || 1;
    const periodIdx = [1, 3, 5, 7, 9, 11].indexOf(periodStart);
    if (dayIdx >= 0 && dayIdx < 5 && periodIdx >= 0 && periodIdx < 6) {
      timetableGrid[periodIdx][dayIdx] = course;
    }
  });

  const statsCourses = statistics?.courses || statistics?.data || [];
  const hotCourses: any[] = statistics?.hotCourses || statistics?.hot_courses || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#1e3a5f' }}>
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>选课中心</h1>
            <p className="text-gray-500 text-sm mt-0.5">在线选课、退选及选课统计</p>
          </div>
        </div>

        {viewRole === 'admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" style={{ color: '#1e3a5f' }} />
              <span className="text-sm font-medium" style={{ color: '#1e3a5f' }}>管理员操作</span>
            </div>
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#e8723a' }}
            >
              <Plus className="w-4 h-4" />
              设置选课时间段
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm font-medium text-green-700">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium text-red-700">{errorMsg}</span>
          </div>
        )}
        {conflictMsg && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-6 py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <span className="text-sm font-medium text-yellow-700">{conflictMsg}</span>
          </div>
        )}

        <div className="flex gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: '#1e3a5f' } : undefined}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'hall' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: '#e8723a' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>选课时段</h2>
              </div>
              <div className="px-6 py-4">
                {activePeriod ? (
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{activePeriod.name}</span>
                    <span className="text-sm text-gray-500">
                      {activePeriod.start_time} ~ {activePeriod.end_time}
                    </span>
                    {activePeriod.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">进行中</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">未开始</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">暂无活跃选课时段</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                  <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>可选课程</h2>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    value={selectedStudentId || ''}
                    onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">选择学生</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name || s.student_name}</option>
                    ))}
                  </select>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部类型</option>
                    {Object.entries(ROOM_REQ_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="px-6 py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#e8723a' }} />
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">暂无可选课程</div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCourses.map((course) => {
                    const selectionCount = course.selection_count || course.selected_count || 0;
                    const maxSelection = course.max_selection || course.max_students || 0;
                    const remaining = maxSelection - selectionCount;
                    const isFull = remaining <= 0;
                    const remColor = getRemainingColor(remaining);
                    const isSelecting = selecting === course.id;
                    return (
                      <div
                        key={course.id}
                        className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 truncate">{course.name}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{course.code}</p>
                          </div>
                          {isFull && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium flex-shrink-0 ml-2">已满</span>
                          )}
                        </div>
                        <div className="space-y-1.5 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span>{course.teacher_name || course.teacher}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                            <span>{course.credits} 学分</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: remColor + '1a', color: remColor }}
                            >
                              余位 {remaining}/{maxSelection}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectCourse(course.id)}
                          disabled={isFull || !selectedStudentId || isSelecting}
                          className="w-full text-sm py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          style={{ backgroundColor: isFull ? '#9ca3af' : '#e8723a' }}
                        >
                          {isSelecting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              选课中...
                            </>
                          ) : (
                            '选课'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'my' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
                <Users className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>我的选课</h2>
                <select
                  value={selectedStudentId || ''}
                  onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ml-auto"
                >
                  <option value="">选择学生</option>
                  {students.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name || s.student_name}</option>
                  ))}
                </select>
              </div>
              {!selectedStudentId ? (
                <div className="px-6 py-12 text-center text-gray-400">请先选择学生查看已选课程</div>
              ) : loading ? (
                <div className="px-6 py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#e8723a' }} />
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : myCourses.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">暂未选课</div>
              ) : (
                <>
                  <div className="px-6 py-4">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse min-w-[640px]">
                        <thead>
                          <tr>
                            <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 w-20">节次</th>
                            {DAYS.map((day) => (
                              <th key={day} className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">{day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {PERIODS.map((period, periodIdx) => (
                            <tr key={period}>
                              <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-center text-gray-500 font-medium">{period}</td>
                              {DAYS.map((_, dayIdx) => {
                                const course = timetableGrid[periodIdx][dayIdx];
                                if (!course) {
                                  return (
                                    <td key={dayIdx} className="border border-gray-200 px-2 py-3 text-center text-gray-300 text-xs">-</td>
                                  );
                                }
                                const color = getCourseColor(course.name || course.course_name || '');
                                return (
                                  <td key={dayIdx} className="border border-gray-200 px-2 py-2">
                                    <div
                                      className="rounded-lg px-2 py-1.5 text-center"
                                      style={{ backgroundColor: color + '18', borderLeft: `3px solid ${color}` }}
                                    >
                                      <div className="text-xs font-semibold truncate" style={{ color }}>
                                        {course.name || course.course_name}
                                      </div>
                                      <button
                                        onClick={() => handleDropCourse(course.id || course.course_id)}
                                        className="text-xs text-red-500 hover:text-red-700 mt-1 transition-colors"
                                      >
                                        退选
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">已选课程列表</h3>
                    <div className="divide-y divide-gray-50">
                      {myCourses.map((course: any) => {
                        const color = getCourseColor(course.name || course.course_name || '');
                        return (
                          <div key={course.id || course.course_id} className="flex items-center gap-3 py-3">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-medium text-gray-800 flex-1 truncate">{course.name || course.course_name}</span>
                            <span className="text-sm text-gray-500">
                              {DAYS[((course.day_of_week || course.day || 1) - 1)]} {PERIODS[[1, 3, 5, 7, 9, 11].indexOf(course.period_start || course.period || 1)]}
                            </span>
                            <button
                              onClick={() => handleDropCourse(course.id || course.course_id)}
                              className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              退选
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'stats' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>选课统计</h2>
              </div>
              {loading ? (
                <div className="px-6 py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#e8723a' }} />
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : !statistics ? (
                <div className="px-6 py-12 text-center text-gray-400">暂无统计数据</div>
              ) : (
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">课程名</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">选课人数</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">选课上限</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">选课率(%)</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {statsCourses.map((item: any, idx: number) => {
                        const selected = item.selected_count || item.selection_count || 0;
                        const max = item.max_selection || item.max_students || 0;
                        const rate = max > 0 ? (selected / max) * 100 : 0;
                        const rateColor = getRateColor(rate);
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{item.name || item.course_name}</td>
                            <td className="px-4 py-2.5 text-gray-600">{selected}</td>
                            <td className="px-4 py-2.5 text-gray-600">{max}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: rateColor + '1a', color: rateColor }}
                              >
                                {rate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {rate >= 80 ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">热门</span>
                              ) : rate >= 50 ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">正常</span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">冷门</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: '#e8723a' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>热门课程排行</h2>
              </div>
              {hotCourses.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">暂无热门课程数据</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {hotCourses.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className="px-6 py-3 flex items-center gap-4">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getRankBadge(idx)}`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium text-gray-800 flex-1 truncate">{item.name || item.course_name}</span>
                      <span className="text-sm text-gray-500">{item.selected_count || item.selection_count || 0}人</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
                        {(item.rate || 0).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {showPeriodModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>设置选课时间段</h3>
                <button
                  onClick={() => setShowPeriodModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <input
                    type="text"
                    value={periodForm.name}
                    onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="如：2024秋季第一轮选课"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input
                    type="datetime-local"
                    value={periodForm.start_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input
                    type="datetime-local"
                    value={periodForm.end_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">启用</label>
                  <button
                    onClick={() => setPeriodForm({ ...periodForm, is_active: !periodForm.is_active })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${periodForm.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${periodForm.is_active ? 'left-5' : 'left-0.5'}`}
                    />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowPeriodModal(false)}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  style={{ color: '#1e3a5f' }}
                >
                  取消
                </button>
                <button
                  onClick={handleCreatePeriod}
                  disabled={periodSubmitting || !periodForm.name || !periodForm.start_time || !periodForm.end_time}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#e8723a' }}
                >
                  {periodSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
