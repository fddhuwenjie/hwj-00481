import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Calendar, Clock, Plus, CheckCircle2, XCircle, Search,
  User, Users, FileText, Loader2,
} from 'lucide-react';
import * as api from '@/api';
import { useAppStore } from '@/store';

const APPLICANT_TYPE_BADGE: Record<string, { label: string; badge: string }> = {
  teacher: { label: '教师', badge: 'bg-blue-100 text-blue-700' },
  student: { label: '学生', badge: 'bg-green-100 text-green-700' },
  club: { label: '社团', badge: 'bg-purple-100 text-purple-700' },
};

const STATUS_BADGE: Record<string, { label: string; badge: string }> = {
  pending: { label: '待审批', badge: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已通过', badge: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒绝', badge: 'bg-red-100 text-red-700' },
};

const PERIOD_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

interface BookingForm {
  applicant: string;
  applicant_type: string;
  classroom_id: number | '';
  booking_date: string;
  period_start: number | '';
  period_end: number | '';
  purpose: string;
  attendees: number | '';
}

const emptyForm: BookingForm = {
  applicant: '',
  applicant_type: 'teacher',
  classroom_id: '',
  booking_date: '',
  period_start: '',
  period_end: '',
  purpose: '',
  attendees: '',
};

export default function RoomBooking() {
  const { classrooms, bookings, viewRole, fetchClassrooms, fetchBookings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'apply' | 'approval'>('apply');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [availabilityResult, setAvailabilityResult] = useState<any>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [classroomDetail, setClassroomDetail] = useState<any>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const loadBookings = useCallback(async () => {
    await fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCheckAvailability = async () => {
    if (!form.classroom_id || !form.booking_date || !form.period_start || !form.period_end) return;
    setAvailabilityLoading(true);
    setAvailabilityResult(null);
    try {
      const params: Record<string, string> = {
        classroom_id: String(form.classroom_id),
        booking_date: form.booking_date,
        period_start: String(form.period_start),
        period_end: String(form.period_end),
      };
      const result = await api.checkBookingAvailability(params);
      setAvailabilityResult(result);
    } catch {
      setAvailabilityResult({ available: false, message: '检测失败，请重试' });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (!form.applicant || !form.classroom_id || !form.booking_date || !form.period_start || !form.period_end || !form.purpose) return;
    setSubmitLoading(true);
    setSubmitMsg('');
    try {
      await api.createBooking({
        applicant: form.applicant,
        applicant_type: form.applicant_type,
        classroom_id: form.classroom_id,
        booking_date: form.booking_date,
        period_start: form.period_start,
        period_end: form.period_end,
        purpose: form.purpose,
        attendees: Number(form.attendees) || 0,
      });
      setSubmitMsg('预约申请已提交成功！');
      setShowModal(false);
      setForm(emptyForm);
      setAvailabilityResult(null);
      loadBookings();
    } catch {
      setSubmitMsg('提交失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    await api.approveBooking(id);
    loadBookings();
  };

  const handleReject = async (id: number) => {
    await api.rejectBooking(id);
    loadBookings();
  };

  const handleViewDetail = async (booking: any) => {
    if (expandedId === booking.id) {
      setExpandedId(null);
      setClassroomDetail(null);
      return;
    }
    setExpandedId(booking.id);
    try {
      const detail = await api.getClassroomAvailability(booking.classroom_id || booking.classroomId);
      setClassroomDetail(detail);
    } catch {
      setClassroomDetail(null);
    }
  };

  const getClassroomInfo = (classroomId: number) => {
    return classrooms.find((c: any) => c.id === classroomId);
  };

  const formatPeriod = (start: number, end: number) => {
    return `第${start}-${end}节`;
  };

  const filteredBookings = bookings.filter((b: any) => {
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    return (
      (b.applicant || '').toLowerCase().includes(text) ||
      (b.purpose || '').toLowerCase().includes(text) ||
      (getClassroomInfo(b.classroom_id || b.classroomId)?.code || '').toLowerCase().includes(text)
    );
  });

  const pendingBookings = bookings.filter((b: any) => b.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#1e3a5f' }}>
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
              教室预约
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              申请教室借用、审批预约请求，查看教室占用情况
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
            预约申请
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'approval'
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={activeTab === 'approval' ? { backgroundColor: '#1e3a5f' } : undefined}
          >
            <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            审批管理
          </button>
        </div>

        {activeTab === 'apply' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                  <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                    预约列表
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {filteredBookings.length} 条
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="搜索申请人/用途/教室"
                      className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                    />
                  </div>
                  <button
                    onClick={() => { setForm(emptyForm); setAvailabilityResult(null); setSubmitMsg(''); setShowModal(true); }}
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    <Plus className="w-4 h-4" />
                    申请借用
                  </button>
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">暂无预约记录</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-600">申请人</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">申请人类型</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">教室</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">日期</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">时段</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">用途</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">人数</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredBookings.map((b: any) => {
                        const cr = getClassroomInfo(b.classroom_id || b.classroomId);
                        const typeInfo = APPLICANT_TYPE_BADGE[b.applicant_type || b.applicantType] || { label: b.applicant_type || b.applicantType || '-', badge: 'bg-gray-100 text-gray-600' };
                        const statusInfo = STATUS_BADGE[b.status] || { label: b.status || '-', badge: 'bg-gray-100 text-gray-600' };
                        return (
                          <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-800">{b.applicant}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.badge}`}>
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {cr ? (
                                <div>
                                  <div className="font-medium text-gray-800">{cr.code}</div>
                                  <div className="text-xs text-gray-500">{cr.building} · {cr.capacity}人</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {b.booking_date || b.bookingDate}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatPeriod(b.period_start || b.periodStart, b.period_end || b.periodEnd)}
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{b.purpose}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-gray-600">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                {b.attendees || b.attendees === 0 ? b.attendees : '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.badge}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleViewDetail(b)}
                                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                style={{ color: '#1e3a5f' }}
                              >
                                教室详情
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {submitMsg && (
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

            {expandedId !== null && classroomDetail && (() => {
              const booking = bookings.find((b: any) => b.id === expandedId);
              if (!booking) return null;
              const cr = getClassroomInfo(booking.classroom_id || booking.classroomId);
              const slots = classroomDetail.slots || [];
              const occupiedSlots = Array.isArray(slots) ? slots.filter((s: any) => s.status === 'occupied' || s.courseName) : [];
              return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                      <h3 className="font-semibold" style={{ color: '#1e3a5f' }}>
                        {cr?.code || '教室'} 详情
                      </h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {booking.booking_date || booking.bookingDate}
                      </span>
                    </div>
                    <button
                      onClick={() => { setExpandedId(null); setClassroomDetail(null); }}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      关闭
                    </button>
                  </div>
                  <div className="p-6">
                    {cr && (
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                        <span>{cr.building}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{cr.capacity}人</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 mb-2">该日占用情况</div>
                      {occupiedSlots.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          该日无课程或考试占用
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {occupiedSlots.map((s: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              <span className="text-red-700 font-medium">第{s.period}节</span>
                              {s.courseName && (
                                <span className="text-red-500 truncate">{s.courseName}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'approval' && (
          <div className="space-y-6">
            {viewRole !== 'admin' ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                仅管理员可进行审批操作
              </div>
            ) : pendingBookings.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                暂无待审批的预约
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Clock className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                  <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                    待审批预约
                  </h2>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    {pendingBookings.length} 条
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {pendingBookings.map((b: any) => {
                    const cr = getClassroomInfo(b.classroom_id || b.classroomId);
                    const typeInfo = APPLICANT_TYPE_BADGE[b.applicant_type || b.applicantType] || { label: b.applicant_type || b.applicantType || '-', badge: 'bg-gray-100 text-gray-600' };
                    const isExpanded = expandedId === b.id;
                    return (
                      <div key={b.id}>
                        <div className="px-6 py-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-800">{b.applicant}</span>
                              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.badge}`}>
                                {typeInfo.label}
                              </span>
                              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                                待审批
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {cr ? `${cr.code} (${cr.building})` : '-'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {b.booking_date || b.bookingDate}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatPeriod(b.period_start || b.periodStart, b.period_end || b.periodEnd)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {b.attendees || 0}人
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              用途：{b.purpose}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleViewDetail(b)}
                              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                              style={{ color: '#1e3a5f' }}
                            >
                              详情
                            </button>
                            <button
                              onClick={() => handleApprove(b.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-green-500 hover:bg-green-600 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              通过
                            </button>
                            <button
                              onClick={() => handleReject(b.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              拒绝
                            </button>
                          </div>
                        </div>

                        {isExpanded && classroomDetail && (
                          <div className="px-6 pb-4">
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Building2 className="w-4 h-4" style={{ color: '#1e3a5f' }} />
                                <span className="text-sm font-medium" style={{ color: '#1e3a5f' }}>
                                  {cr?.code || '教室'} 占用详情
                                </span>
                              </div>
                              {(() => {
                                const slots = classroomDetail.slots || [];
                                const occupiedSlots = Array.isArray(slots) ? slots.filter((s: any) => s.status === 'occupied' || s.courseName) : [];
                                return occupiedSlots.length === 0 ? (
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    该日无课程或考试占用
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {occupiedSlots.map((s: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                        <span className="text-gray-700 font-medium">第{s.period}节</span>
                                        {s.courseName && (
                                          <span className="text-gray-500 truncate">{s.courseName}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">申请借用教室</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
                  <input
                    value={form.applicant}
                    onChange={(e) => setForm({ ...form, applicant: e.target.value })}
                    placeholder="请输入申请人姓名"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">申请人类型</label>
                  <select
                    value={form.applicant_type}
                    onChange={(e) => setForm({ ...form, applicant_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="teacher">教师</option>
                    <option value="student">学生</option>
                    <option value="club">社团</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择教室</label>
                  <select
                    value={form.classroom_id}
                    onChange={(e) => setForm({ ...form, classroom_id: Number(e.target.value) || '' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择教室</option>
                    {classrooms.map((cr: any) => (
                      <option key={cr.id} value={cr.id}>{cr.code} - {cr.building} ({cr.capacity}人)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">预约日期</label>
                  <input
                    type="date"
                    value={form.booking_date}
                    onChange={(e) => setForm({ ...form, booking_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始节次</label>
                    <select
                      value={form.period_start}
                      onChange={(e) => setForm({ ...form, period_start: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择</option>
                      {PERIOD_OPTIONS.map((p) => (
                        <option key={p} value={p}>第{p}节</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束节次</label>
                    <select
                      value={form.period_end}
                      onChange={(e) => setForm({ ...form, period_end: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择</option>
                      {PERIOD_OPTIONS.map((p) => (
                        <option key={p} value={p}>第{p}节</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用途</label>
                  <input
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    placeholder="请输入借用用途"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">参加人数</label>
                  <input
                    type="number"
                    value={form.attendees}
                    onChange={(e) => setForm({ ...form, attendees: Number(e.target.value) || '' })}
                    placeholder="请输入参加人数"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {availabilityResult && (
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      availabilityResult.available === false
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    {availabilityResult.available === false ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-red-700">教室不可用</span>
                        </div>
                        {availabilityResult.conflicts && availabilityResult.conflicts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {availabilityResult.conflicts.map((c: any, i: number) => (
                              <div key={i} className="text-xs text-red-600 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                {c.courseName || c.course_name || c.message || JSON.stringify(c)}
                              </div>
                            ))}
                          </div>
                        )}
                        {availabilityResult.message && !availabilityResult.conflicts && (
                          <div className="text-xs text-red-600 mt-1">{availabilityResult.message}</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-700">
                          {availabilityResult.message || '教室可用，可以预约'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleCheckAvailability}
                    disabled={!form.classroom_id || !form.booking_date || !form.period_start || !form.period_end || availabilityLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    {availabilityLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    检查可用性
                  </button>
                  <button
                    onClick={handleSubmitBooking}
                    disabled={!form.applicant || !form.classroom_id || !form.booking_date || !form.period_start || !form.period_end || !form.purpose || submitLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    {submitLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    提交申请
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
