import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft, FileText, Bell, CheckCircle2, XCircle, Clock,
  AlertTriangle, CheckCircle, Send, RefreshCw, Building2
} from 'lucide-react';
import * as api from '@/api';
import { useAppStore } from '@/store';

const DAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
];

const PERIODS = [
  { value: 1, label: '第1-2节' },
  { value: 3, label: '第3-4节' },
  { value: 5, label: '第5-6节' },
  { value: 7, label: '第7-8节' },
  { value: 9, label: '第9-10节' },
  { value: 11, label: '第11-12节' },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: typeof Clock }> = {
  pending: { label: '待审批', badge: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: '已通过', badge: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: '已拒绝', badge: 'bg-red-100 text-red-700', icon: XCircle },
};

const DAY_LABELS: Record<number, string> = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五' };
const PERIOD_LABELS: Record<number, string> = {
  1: '1-2节', 3: '3-4节', 5: '5-6节', 7: '7-8节', 9: '9-10节', 11: '11-12节',
};

export default function Adjustment() {
  const { courses, classrooms, adjustments, notifications, fetchCourses, fetchClassrooms, fetchAdjustments, fetchNotifications } = useAppStore();
  const [activeTab, setActiveTab] = useState<'apply' | 'records'>('apply');

  const [adjustCourseId, setAdjustCourseId] = useState<number | ''>('');
  const [adjustDay, setAdjustDay] = useState<number>(1);
  const [adjustPeriod, setAdjustPeriod] = useState<number>(1);
  const [adjustClassroomId, setAdjustClassroomId] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [conflictResult, setConflictResult] = useState<any>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const [swapCourseId, setSwapCourseId] = useState<number | ''>('');
  const [swapClassroomId, setSwapClassroomId] = useState<number | ''>('');
  const [swapReason, setSwapReason] = useState('');
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapMsg, setSwapMsg] = useState('');

  useEffect(() => {
    fetchCourses();
    fetchClassrooms();
  }, [fetchCourses, fetchClassrooms]);

  const loadRecords = useCallback(async () => {
    await Promise.all([fetchAdjustments(), fetchNotifications()]);
  }, [fetchAdjustments, fetchNotifications]);

  useEffect(() => {
    if (activeTab === 'records') {
      loadRecords();
    }
  }, [activeTab, loadRecords]);

  const handleCheckConflict = async () => {
    if (!adjustCourseId) return;
    setConflictLoading(true);
    setConflictResult(null);
    try {
      const params: Record<string, any> = {
        courseId: adjustCourseId,
        newDayOfWeek: adjustDay,
        newPeriodStart: adjustPeriod,
      };
      if (adjustClassroomId) params.newClassroomId = adjustClassroomId;
      const result = await api.checkConflict(params);
      setConflictResult(result);
    } catch {
      setConflictResult({ hasConflict: true, message: '检测失败，请重试' });
    } finally {
      setConflictLoading(false);
    }
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustCourseId || !adjustReason) return;
    setSubmitLoading(true);
    setSubmitMsg('');
    try {
      await api.createAdjustment({
        courseId: adjustCourseId,
        newDayOfWeek: adjustDay,
        newPeriodStart: adjustPeriod,
        newClassroomId: adjustClassroomId || undefined,
        reason: adjustReason,
      });
      setSubmitMsg('调课申请已提交成功！');
      setAdjustCourseId('');
      setAdjustDay(1);
      setAdjustPeriod(1);
      setAdjustClassroomId('');
      setAdjustReason('');
      setConflictResult(null);
    } catch {
      setSubmitMsg('提交失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSwapRoom = async () => {
    if (!swapCourseId || !swapClassroomId || !swapReason) return;
    setSwapLoading(true);
    setSwapMsg('');
    try {
      await api.swapRoom({
        courseId: swapCourseId,
        newClassroomId: swapClassroomId,
        reason: swapReason,
      });
      setSwapMsg('换教室成功！');
      setSwapCourseId('');
      setSwapClassroomId('');
      setSwapReason('');
    } catch {
      setSwapMsg('换教室失败，请重试');
    } finally {
      setSwapLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    await api.approveAdjustment(id);
    fetchAdjustments();
  };

  const handleReject = async (id: number) => {
    await api.rejectAdjustment(id);
    fetchAdjustments();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#1e3a5f' }}>
            <ArrowRightLeft className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
              调课管理
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              提交调课申请、临时换教室，查看调课记录与通知
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('apply')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'apply'
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={activeTab === 'apply' ? { backgroundColor: '#1e3a5f' } : undefined}
          >
            <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            调课申请
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'records'
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={activeTab === 'records' ? { backgroundColor: '#1e3a5f' } : undefined}
          >
            <Bell className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            调课记录/通知
          </button>
        </div>

        {activeTab === 'apply' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                  调课申请
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择课程</label>
                    <select
                      value={adjustCourseId}
                      onChange={(e) => setAdjustCourseId(Number(e.target.value) || '')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择课程</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">新上课日</label>
                    <select
                      value={adjustDay}
                      onChange={(e) => setAdjustDay(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {DAYS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">新上课节次</label>
                    <select
                      value={adjustPeriod}
                      onChange={(e) => setAdjustPeriod(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PERIODS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">新教室（可选）</label>
                    <select
                      value={adjustClassroomId}
                      onChange={(e) => setAdjustClassroomId(Number(e.target.value) || '')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">不更换教室</option>
                      {classrooms.map((cr: any) => (
                        <option key={cr.id} value={cr.id}>{cr.code} - {cr.building}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">调课原因</label>
                  <input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="请输入调课原因"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {conflictResult && (
                  <div
                    className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
                      conflictResult.hasConflict
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    {conflictResult.hasConflict ? (
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${conflictResult.hasConflict ? 'text-red-700' : 'text-green-700'}`}>
                      {conflictResult.hasConflict
                        ? `存在冲突：${conflictResult.message || '时间或教室冲突'}`
                        : conflictResult.message || '无冲突，可以调课'}
                    </span>
                    {conflictResult.conflicts && conflictResult.conflicts.length > 0 && (
                      <div className="mt-1 text-xs text-red-600 space-y-1">
                        {conflictResult.conflicts.map((c: any, i: number) => (
                          <div key={i}>{c.courseName || c.course_name}: {c.message}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {submitMsg && (
                  <div
                    className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
                      submitMsg.includes('成功')
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {submitMsg.includes('成功') ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${submitMsg.includes('成功') ? 'text-green-700' : 'text-red-700'}`}>
                      {submitMsg}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleCheckConflict}
                    disabled={!adjustCourseId || conflictLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    {conflictLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    冲突检测
                  </button>
                  <button
                    onClick={handleSubmitAdjustment}
                    disabled={!adjustCourseId || !adjustReason || submitLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    {submitLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    提交申请
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Building2 className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                  临时换教室
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择课程</label>
                    <select
                      value={swapCourseId}
                      onChange={(e) => setSwapCourseId(Number(e.target.value) || '')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择课程</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">新教室</label>
                    <select
                      value={swapClassroomId}
                      onChange={(e) => setSwapClassroomId(Number(e.target.value) || '')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择教室</option>
                      {classrooms.map((cr: any) => (
                        <option key={cr.id} value={cr.id}>{cr.code} - {cr.building}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">换教室原因</label>
                  <input
                    value={swapReason}
                    onChange={(e) => setSwapReason(e.target.value)}
                    placeholder="请输入换教室原因"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {swapMsg && (
                  <div
                    className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
                      swapMsg.includes('成功')
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {swapMsg.includes('成功') ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${swapMsg.includes('成功') ? 'text-green-700' : 'text-red-700'}`}>
                      {swapMsg}
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleSwapRoom}
                    disabled={!swapCourseId || !swapClassroomId || !swapReason || swapLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    {swapLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                    确认换教室
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                  <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                    调课记录
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {adjustments.length} 条
                  </span>
                </div>
                <button
                  onClick={() => fetchAdjustments()}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  style={{ color: '#1e3a5f' }}
                >
                  <RefreshCw className="w-4 h-4 inline mr-1 -mt-0.5" />
                  刷新
                </button>
              </div>
              {adjustments.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">暂无调课记录</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {adjustments.map((adj: any) => {
                    const status = STATUS_CONFIG[adj.status] || STATUS_CONFIG.pending;
                    const StatusIcon = status.icon;
                    return (
                      <div key={adj.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800 truncate">
                              {adj.courseName || adj.course_name}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.badge}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 space-x-1">
                            <span>{DAY_LABELS[adj.oldDayOfWeek || adj.old_day_of_week] || `周${adj.oldDayOfWeek || adj.old_day_of_week}`}</span>
                            <span>{PERIOD_LABELS[adj.oldPeriodStart || adj.old_period_start] || `${adj.oldPeriodStart || adj.old_period_start}节`}</span>
                            <span className="text-gray-400">→</span>
                            <span>{DAY_LABELS[adj.newDayOfWeek || adj.new_day_of_week] || `周${adj.newDayOfWeek || adj.new_day_of_week}`}</span>
                            <span>{PERIOD_LABELS[adj.newPeriodStart || adj.new_period_start] || `${adj.newPeriodStart || adj.new_period_start}节`}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            <span>{adj.oldClassroomCode || adj.old_classroom_code || '原教室'}</span>
                            <span className="text-gray-400 mx-1">→</span>
                            <span>{adj.newClassroomCode || adj.new_classroom_code || '新教室'}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {adj.createdAt || adj.created_at}
                        </div>
                        {adj.status === 'pending' && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleApprove(adj.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-500 hover:bg-green-600 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              通过
                            </button>
                            <button
                              onClick={() => handleReject(adj.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              拒绝
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Bell className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                  通知
                </h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {notifications.length} 条
                </span>
              </div>
              {notifications.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">暂无通知</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((n: any, idx: number) => (
                    <div
                      key={n.id || idx}
                      className={`px-6 py-3 flex items-center gap-4 ${
                        !n.isRead && !n.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        !n.isRead && !n.is_read ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${
                          !n.isRead && !n.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'
                        }`}>
                          {n.message}
                        </p>
                        <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                          {n.className || n.class_name ? <span>{n.className || n.class_name}</span> : null}
                          {n.time && <span>{n.time}</span>}
                        </div>
                      </div>
                      {!n.isRead && !n.is_read && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex-shrink-0">
                          未读
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
