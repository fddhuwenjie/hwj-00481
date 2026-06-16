import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Bell, Upload, Trash2, Download, ChevronDown, ChevronUp,
  BookOpen, CheckCircle2, XCircle, Loader2, Plus, ExternalLink,
} from 'lucide-react';
import * as api from '@/api';
import { useAppStore } from '@/store';

const TYPE_BADGE: Record<string, { label: string; badge: string }> = {
  adjustment: { label: '调课通知', badge: 'bg-blue-100 text-blue-700' },
  exam: { label: '考试通知', badge: 'bg-orange-100 text-orange-700' },
  selection: { label: '选课通知', badge: 'bg-purple-100 text-purple-700' },
  info: { label: '系统通知', badge: 'bg-gray-100 text-gray-700' },
};

const FILE_TYPE_BADGE: Record<string, { label: string; badge: string }> = {
  pdf: { label: 'PDF', badge: 'bg-red-100 text-red-700' },
  ppt: { label: 'PPT', badge: 'bg-orange-100 text-orange-700' },
  doc: { label: 'DOC', badge: 'bg-blue-100 text-blue-700' },
  xlsx: { label: 'XLSX', badge: 'bg-green-100 text-green-700' },
  other: { label: '其他', badge: 'bg-gray-100 text-gray-700' },
};

interface ResourceItem {
  id: number;
  file_name: string;
  file_type: string;
  file_url: string;
  uploaded_by: number;
  uploaded_at: string;
  uploader_name: string;
}

interface CourseItem {
  id: number;
  name: string;
  code?: string;
  course_code?: string;
  teacher_name?: string;
  teacherName?: string;
}

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  is_read: number;
  created_at?: string;
  time?: string;
}

interface TeacherItem {
  id: number;
  name: string;
}

interface UploadForm {
  course_id: number | '';
  file_name: string;
  file_type: string;
  file_url: string;
  uploaded_by: number | '';
}

const emptyUploadForm: UploadForm = {
  course_id: '',
  file_name: '',
  file_type: 'pdf',
  file_url: '',
  uploaded_by: '',
};

export default function CourseResources() {
  const { courses, teachers, viewRole, fetchCourses, fetchTeachers, allNotifications, unreadCount, fetchAllNotifications, fetchUnreadCount, markAllRead, markOneRead } = useAppStore();
  const [activeTab, setActiveTab] = useState<'resources' | 'notifications'>('resources');
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [resourcesMap, setResourcesMap] = useState<Record<number, ResourceItem[]>>({});
  const [resourcesLoading, setResourcesLoading] = useState<Record<number, boolean>>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadForm>(emptyUploadForm);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, [fetchCourses, fetchTeachers]);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      await fetchAllNotifications();
      await fetchUnreadCount();
    } finally {
      setNotifLoading(false);
    }
  }, [fetchAllNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadNotifications();
    }
  }, [activeTab, loadNotifications]);

  const handleExpandCourse = async (courseId: number) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }
    setExpandedCourseId(courseId);
    if (!resourcesMap[courseId]) {
      setResourcesLoading((prev) => ({ ...prev, [courseId]: true }));
      try {
        const data = await api.getCourseResources(courseId);
        setResourcesMap((prev) => ({ ...prev, [courseId]: Array.isArray(data) ? data : [] }));
      } catch {
        setResourcesMap((prev) => ({ ...prev, [courseId]: [] }));
      } finally {
        setResourcesLoading((prev) => ({ ...prev, [courseId]: false }));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.course_id || !uploadForm.file_name || !uploadForm.file_type || !uploadForm.file_url || !uploadForm.uploaded_by) return;
    setUploadLoading(true);
    try {
      await api.createResource({
        course_id: uploadForm.course_id,
        file_name: uploadForm.file_name,
        file_type: uploadForm.file_type,
        file_url: uploadForm.file_url,
        uploaded_by: uploadForm.uploaded_by,
      });
      setShowUploadModal(false);
      setUploadForm(emptyUploadForm);
      const cid = Number(uploadForm.course_id);
      setResourcesMap((prev) => {
        const next = { ...prev };
        delete next[cid];
        return next;
      });
      if (expandedCourseId === cid) {
        const data = await api.getCourseResources(cid);
        setResourcesMap((prev) => ({ ...prev, [cid]: Array.isArray(data) ? data : [] }));
      }
    } catch {
      setUploadLoading(false);
      return;
    }
    setUploadLoading(false);
  };

  const handleDelete = async (id: number, courseId: number) => {
    setDeleteLoading(id);
    try {
      await api.deleteResource(id);
      setResourcesMap((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] || []).filter((r) => r.id !== id),
      }));
    } catch {
      setDeleteLoading(null);
      return;
    }
    setDeleteLoading(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch {
      return;
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await markOneRead(id);
    } catch {
      return;
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
              课程资源与通知
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              管理课程资源文件，查看系统通知与公告
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'resources'
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={activeTab === 'resources' ? { backgroundColor: '#1e3a5f' } : undefined}
          >
            <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            课程资源
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={activeTab === 'notifications' ? { backgroundColor: '#1e3a5f' } : undefined}
          >
            <Bell className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            通知中心
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                  <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                    课程资源列表
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {courses.length} 门课程
                  </span>
                </div>
                {(viewRole === 'teacher' || viewRole === 'admin') && (
                  <button
                    onClick={() => { setUploadForm(emptyUploadForm); setShowUploadModal(true); }}
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    <Upload className="w-4 h-4" />
                    上传资源
                  </button>
                )}
              </div>

              {courses.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">暂无课程数据</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {courses.map((course: CourseItem) => {
                    const isExpanded = expandedCourseId === course.id;
                    const resources = resourcesMap[course.id] || [];
                    const isLoading = resourcesLoading[course.id];
                    return (
                      <div key={course.id}>
                        <div
                          className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleExpandCourse(course.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-800">{course.name}</span>
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                {course.code || course.course_code || ''}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                              {course.teacher_name || course.teacherName || ''} · {resources.length > 0 ? `${resources.length} 个资源` : '点击查看资源'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 pb-4">
                            {isLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                              </div>
                            ) : resources.length === 0 ? (
                              <div className="text-center text-gray-400 py-6 text-sm">暂无资源文件</div>
                            ) : (
                              <div className="space-y-2">
                                {resources.map((res) => {
                                  const ft = FILE_TYPE_BADGE[res.file_type] || FILE_TYPE_BADGE.other;
                                  return (
                                    <div
                                      key={res.id}
                                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                      <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <a
                                        href={res.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-gray-800 hover:underline flex items-center gap-1"
                                      >
                                        {res.file_name}
                                        <ExternalLink className="w-3 h-3 text-gray-400" />
                                      </a>
                                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${ft.badge}`}>
                                        {ft.label}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {res.uploader_name || ''}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {formatTime(res.uploaded_at)}
                                      </span>
                                      {(viewRole === 'teacher' || viewRole === 'admin') && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDelete(res.id, course.id); }}
                                          disabled={deleteLoading === res.id}
                                          className="ml-auto text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                        >
                                          {deleteLoading === res.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-4 h-4" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
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
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5" style={{ color: '#1e3a5f' }} />
                  <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                    通知中心
                  </h2>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {unreadCount} 条未读
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    全部已读
                  </button>
                )}
              </div>

              {notifLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : allNotifications.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">暂无通知</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {allNotifications.map((n: NotificationItem) => {
                    const typeInfo = TYPE_BADGE[n.type] || TYPE_BADGE.info;
                    const isUnread = !n.is_read;
                    return (
                      <div
                        key={n.id}
                        onClick={() => { if (isUnread) handleMarkOneRead(n.id); }}
                        className={`px-6 py-4 flex items-center gap-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                          isUnread ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                        }`}
                      >
                        <div className={`flex-shrink-0 p-2 rounded-lg ${isUnread ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          {n.type === 'exam' ? (
                            <FileText className={`w-4 h-4 ${isUnread ? 'text-orange-600' : 'text-gray-400'}`} />
                          ) : n.type === 'selection' ? (
                            <BookOpen className={`w-4 h-4 ${isUnread ? 'text-purple-600' : 'text-gray-400'}`} />
                          ) : n.type === 'adjustment' ? (
                            <Bell className={`w-4 h-4 ${isUnread ? 'text-blue-600' : 'text-gray-400'}`} />
                          ) : (
                            <Bell className={`w-4 h-4 ${isUnread ? 'text-gray-600' : 'text-gray-400'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.badge}`}>
                              {typeInfo.label}
                            </span>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className={`text-sm ${isUnread ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                            {n.message}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(n.created_at || n.time || '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowUploadModal(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">上传资源</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择课程</label>
                  <select
                    value={uploadForm.course_id}
                    onChange={(e) => setUploadForm({ ...uploadForm, course_id: Number(e.target.value) || '' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择课程</option>
                    {courses.map((c: CourseItem) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code || c.course_code || ''})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文件名称</label>
                  <input
                    value={uploadForm.file_name}
                    onChange={(e) => setUploadForm({ ...uploadForm, file_name: e.target.value })}
                    placeholder="请输入文件名称"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文件类型</label>
                  <select
                    value={uploadForm.file_type}
                    onChange={(e) => setUploadForm({ ...uploadForm, file_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="ppt">PPT</option>
                    <option value="doc">DOC</option>
                    <option value="xlsx">XLSX</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">文件URL</label>
                  <input
                    value={uploadForm.file_url}
                    onChange={(e) => setUploadForm({ ...uploadForm, file_url: e.target.value })}
                    placeholder="请输入文件链接地址"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">上传者</label>
                  <select
                    value={uploadForm.uploaded_by}
                    onChange={(e) => setUploadForm({ ...uploadForm, uploaded_by: Number(e.target.value) || '' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择上传者</option>
                    {teachers.map((t: TeacherItem) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleUpload}
                    disabled={!uploadForm.course_id || !uploadForm.file_name || !uploadForm.file_url || !uploadForm.uploaded_by || uploadLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#e8723a' }}
                  >
                    {uploadLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    提交上传
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
