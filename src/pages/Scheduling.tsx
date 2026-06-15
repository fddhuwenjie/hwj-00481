import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, CheckSquare, Square, Loader2, AlertCircle, CheckCircle2, RotateCcw, Zap, Users, BookOpen } from 'lucide-react';
import * as api from '@/api';
import { useAppStore } from '@/store';

const DAYS = ['周一', '周二', '周三', '周四', '周五'];
const PERIODS = ['第1-2节', '第3-4节', '第5-6节', '第7-8节', '第9-10节', '第11-12节'];

const ROOM_REQ_LABELS: Record<string, string> = {
  multimedia: '多媒体',
  lab: '实验室',
  lecture: '阶梯教室',
  normal: '普通教室',
};

function roomReqLabel(req: string) {
  return ROOM_REQ_LABELS[req] || req;
}

const COURSE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#d946ef', '#84cc16', '#0ea5e9', '#f43f5e', '#a855f7',
];

export default function Scheduling() {
  const { classrooms, fetchClassrooms } = useAppStore();
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [schedulingResult, setSchedulingResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewSlots, setPreviewSlots] = useState<any[]>([]);
  const [confirmMsg, setConfirmMsg] = useState('');

  useEffect(() => {
    if (classrooms.length === 0) fetchClassrooms();
  }, [classrooms.length, fetchClassrooms]);

  const fetchPending = useCallback(async () => {
    try {
      const data = await api.getPendingCourses();
      setPendingCourses(data);
    } catch {
      setPendingCourses([]);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (!schedulingResult?.slots) {
      setPreviewSlots([]);
      return;
    }
    setPreviewSlots(schedulingResult.slots);
  }, [schedulingResult]);

  const toggleSelect = (id: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedCourseIds(pendingCourses.map((c) => c.id));
  };

  const deselectAll = () => {
    setSelectedCourseIds([]);
  };

  const handleAutoSchedule = async () => {
    if (selectedCourseIds.length === 0) return;
    setIsLoading(true);
    setSchedulingResult(null);
    setConfirmMsg('');
    try {
      const result = await api.autoSchedule(selectedCourseIds);
      setSchedulingResult(result);
    } catch {
      setSchedulingResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (previewSlots.length === 0) return;
    try {
      await api.confirmSchedule(previewSlots);
      setConfirmMsg('排课已确认成功！');
      setSchedulingResult(null);
      setPreviewSlots([]);
      setSelectedCourseIds([]);
      fetchPending();
    } catch {
      setConfirmMsg('确认失败，请重试');
    }
  };

  const handleRetry = () => {
    setSchedulingResult(null);
    setPreviewSlots([]);
    setConfirmMsg('');
  };

  const getSlotForCell = (dayIndex: number, periodIndex: number) => {
    return previewSlots.find(
      (s: any) => s.day_of_week === dayIndex + 1 && Math.ceil(s.period_start / 2) === periodIndex + 1
    );
  };

  const getCourseColor = (courseName: string | undefined) => {
    const name = courseName || 'default';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
  };

  const getCourseName = (slot: any) => {
    if (slot.course_name) return slot.course_name;
    if (slot.courseName) return slot.courseName;
    const course = pendingCourses.find((c: any) => c.id === slot.course_id);
    return course?.name || `课程${slot.course_id}`;
  };

  const getClassroomCode = (slot: any) => {
    if (slot.classroom_code) return slot.classroom_code;
    if (slot.classroomCode) return slot.classroomCode;
    const classroom = classrooms.find((c: any) => c.id === slot.classroom_id);
    return classroom?.code || `教室${slot.classroom_id}`;
  };

  const isAllSelected = pendingCourses.length > 0 && selectedCourseIds.length === pendingCourses.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#1e3a5f' }}>
            <CalendarClock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
              智能排课
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              选择待排课程，系统将自动为您生成最优排课方案
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: '#1e3a5f' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                待排课程
              </h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {pendingCourses.length} 门
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={isAllSelected ? deselectAll : selectAll}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                style={{ color: '#1e3a5f' }}
              >
                {isAllSelected ? '取消全选' : '全选'}
              </button>
              <button
                onClick={handleAutoSchedule}
                disabled={selectedCourseIds.length === 0 || isLoading}
                className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#e8723a' }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                一键排课
              </button>
            </div>
          </div>

          {pendingCourses.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              暂无待排课程
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pendingCourses.map((course) => {
                const selected = selectedCourseIds.includes(course.id);
                return (
                  <div
                    key={course.id}
                    className={`px-6 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selected ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => toggleSelect(course.id)}
                  >
                    {selected ? (
                      <CheckSquare className="w-5 h-5 flex-shrink-0" style={{ color: '#e8723a' }} />
                    ) : (
                      <Square className="w-5 h-5 flex-shrink-0 text-gray-300" />
                    )}
                    <div className="flex-1 grid grid-cols-5 gap-4 items-center min-w-0">
                      <span className="font-medium text-gray-800 truncate">
                        {course.name}
                      </span>
                      <span className="text-sm text-gray-500 truncate">
                        {course.code}
                      </span>
                      <span className="text-sm text-gray-500 truncate">
                        {course.teacher_name || course.teacher}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {course.student_count}人
                      </span>
                      <span className="inline-flex">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 truncate">
                          {roomReqLabel(course.room_requirement)}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#e8723a' }} />
            <p className="text-gray-500">正在智能排课中，请稍候…</p>
          </div>
        )}

        {schedulingResult && !isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-green-700">
                    排课成功
                  </h3>
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                    {schedulingResult.scheduled || 0} 门
                  </span>
                </div>
                {(schedulingResult.slots || []).length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-400 text-sm">
                    无成功排课
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {(schedulingResult.slots || []).map((slot: any, idx: number) => {
                      const course = pendingCourses.find((c: any) => c.id === slot.course_id);
                      const classroom = classrooms.find((cr: any) => cr.id === slot.classroom_id);
                      return (
                        <div key={idx} className="px-6 py-3 flex items-center gap-3">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getCourseColor(course?.name || '') }}
                          />
                          <span className="font-medium text-gray-800 flex-1 truncate">
                            {course?.name || `课程${slot.course_id}`}
                          </span>
                          <span className="text-sm text-gray-500">
                            {DAYS[(slot.day_of_week || 1) - 1]} {PERIODS[Math.ceil((slot.period_start || 1) / 2) - 1]}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {classroom?.code || `教室${slot.classroom_id}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-red-700">
                    排课失败
                  </h3>
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                    {(schedulingResult.failed || []).length} 门
                  </span>
                </div>
                {(schedulingResult.failed || []).length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-400 text-sm">
                    全部排课成功
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {(schedulingResult.failed || []).map((item: any, idx: number) => (
                      <div key={idx} className="px-6 py-3 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="font-medium text-gray-800 flex-1 truncate">
                          {item.course?.name || item.courseName || item.course_name || `课程`}
                        </span>
                        <span className="text-sm text-red-500 truncate">
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: '#1e3a5f' }}>
                  排课预览
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    style={{ color: '#1e3a5f' }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    重新排课
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="text-sm px-4 py-1.5 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    确认排课
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr>
                      <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 w-20">
                        节次
                      </th>
                      {DAYS.map((day) => (
                        <th
                          key={day}
                          className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period, periodIdx) => (
                      <tr key={period}>
                        <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-center text-gray-500 font-medium">
                          {period}
                        </td>
                        {DAYS.map((_, dayIdx) => {
                          const slot = getSlotForCell(dayIdx, periodIdx);
                          if (!slot) {
                            return (
                              <td
                                key={dayIdx}
                                className="border border-gray-200 px-2 py-3 text-center text-gray-300 text-xs"
                              >
                                -
                              </td>
                            );
                          }
                          const courseName = getCourseName(slot);
                          const classroomCode = getClassroomCode(slot);
                          const color = getCourseColor(courseName);
                          return (
                            <td
                              key={dayIdx}
                              className="border border-gray-200 px-2 py-2"
                            >
                              <div
                                className="rounded-lg px-2 py-1.5 text-center"
                                style={{
                                  backgroundColor: color + '18',
                                  borderLeft: `3px solid ${color}`,
                                }}
                              >
                                <div className="text-xs font-semibold truncate" style={{ color }}>
                                  {courseName}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {classroomCode}
                                </div>
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
          </>
        )}

        {confirmMsg && (
          <div
            className={`rounded-xl px-6 py-4 flex items-center gap-3 ${
              confirmMsg.includes('成功')
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {confirmMsg.includes('成功') ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <span
              className={`text-sm font-medium ${
                confirmMsg.includes('成功') ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {confirmMsg}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
