import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getTeachers,
  getClasses,
} from '@/api';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const roomRequirementMap: Record<string, { label: string; color: string }> = {
  multimedia: { label: '多媒体', color: 'bg-blue-100 text-blue-700' },
  lab: { label: '实验室', color: 'bg-purple-100 text-purple-700' },
  lecture: { label: '阶梯教室', color: 'bg-green-100 text-green-700' },
  normal: { label: '普通教室', color: 'bg-gray-100 text-gray-600' },
};

const statusMap: Record<string, { label: string; color: string }> = {
  scheduled: { label: '已排', color: 'bg-green-100 text-green-700' },
  pending: { label: '待排', color: 'bg-orange-100 text-orange-700' },
};

const emptyForm = {
  name: '',
  code: '',
  credits: '',
  hours: '',
  teacher_id: '',
  student_count: '',
  room_requirement: 'normal',
  class_id: '',
  is_fixed: false,
};

interface CourseItem {
  id: number;
  name: string;
  code: string;
  credits: number;
  hours: number;
  teacher_id: number;
  student_count: number;
  room_requirement: string;
  class_id: number;
  status: string;
  is_fixed?: boolean;
}

interface NamedItem {
  id: number;
  name: string;
}

export default function Courses() {
  const { semester, fetchSemester } = useAppStore();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [teachers, setTeachers] = useState<NamedItem[]>([]);
  const [classes, setClasses] = useState<NamedItem[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchSemester();
    getCourses().then(setCourses).catch(() => {});
    getTeachers().then(setTeachers).catch(() => {});
    getClasses().then(setClasses).catch(() => {});
  }, []);

  const filtered = courses.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (course: CourseItem) => {
    setEditingId(course.id);
    setForm({
      name: course.name || '',
      code: course.code || '',
      credits: course.credits != null ? String(course.credits) : '',
      hours: course.hours != null ? String(course.hours) : '',
      teacher_id: course.teacher_id != null ? String(course.teacher_id) : '',
      student_count: course.student_count != null ? String(course.student_count) : '',
      room_requirement: course.room_requirement || 'normal',
      class_id: course.class_id != null ? String(course.class_id) : '',
      is_fixed: !!course.is_fixed,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      code: form.code,
      credits: Number(form.credits),
      hours: Number(form.hours),
      teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      student_count: Number(form.student_count),
      room_requirement: form.room_requirement,
      class_id: form.class_id ? Number(form.class_id) : null,
      is_fixed: form.is_fixed,
    };
    if (editingId) {
      await updateCourse(editingId, payload);
    } else {
      await createCourse(payload);
    }
    setModalOpen(false);
    getCourses().then(setCourses).catch(() => {});
  };

  const handleDelete = async (id: number) => {
    await deleteCourse(id);
    setDeleteConfirm(null);
    getCourses().then(setCourses).catch(() => {});
  };

  const getTeacherName = (id: number) => {
    const t = teachers.find((t) => t.id === id);
    return t ? t.name : '-';
  };

  const getClassName = (id: number) => {
    const c = classes.find((c) => c.id === id);
    return c ? c.name : '-';
  };

  return (
    <div className="space-y-5">
      {semester && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">学期信息</h3>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>
              学期：<span className="font-medium text-gray-800">{semester.name}</span>
            </span>
            <span>
              起止日期：<span className="font-medium text-gray-800">{semester.start_date} ~ {semester.end_date}</span>
            </span>
            <span>
              总周数：<span className="font-medium text-gray-800">{semester.total_weeks} 周</span>
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">课程管理</h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: '#e8723a' }}
          >
            <Plus size={16} />
            新增课程
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索课程名或课程号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-3 px-3 font-medium">课程名</th>
                <th className="text-left py-3 px-3 font-medium">课程号</th>
                <th className="text-center py-3 px-3 font-medium">学分</th>
                <th className="text-center py-3 px-3 font-medium">学时</th>
                <th className="text-left py-3 px-3 font-medium">授课教师</th>
                <th className="text-center py-3 px-3 font-medium">上课人数</th>
                <th className="text-left py-3 px-3 font-medium">教室需求</th>
                <th className="text-left py-3 px-3 font-medium">班级</th>
                <th className="text-center py-3 px-3 font-medium">状态</th>
                <th className="text-center py-3 px-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => {
                const rr = roomRequirementMap[course.room_requirement] || roomRequirementMap.normal;
                const statusKey = course.is_fixed ? 'scheduled' : 'pending';
                const st = statusMap[statusKey] || statusMap.pending;
                return (
                  <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 text-gray-800 font-medium">{course.name}</td>
                    <td className="py-3 px-3 text-gray-600">{course.code}</td>
                    <td className="py-3 px-3 text-center text-gray-600">{course.credits}</td>
                    <td className="py-3 px-3 text-center text-gray-600">{course.hours}</td>
                    <td className="py-3 px-3 text-gray-600">{getTeacherName(course.teacher_id)}</td>
                    <td className="py-3 px-3 text-center text-gray-600">{course.student_count}</td>
                    <td className="py-3 px-3">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', rr.color)}>
                        {rr.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600">{getClassName(course.class_id)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', st.color)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(course)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(course.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">
                    暂无课程数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-800">
                {editingId ? '编辑课程' : '新增课程'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">课程名</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">课程号</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">学分</label>
                  <input
                    type="number"
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">学时</label>
                  <input
                    type="number"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">授课教师</label>
                  <select
                    value={form.teacher_id}
                    onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="">请选择教师</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">上课人数</label>
                  <input
                    type="number"
                    value={form.student_count}
                    onChange={(e) => setForm({ ...form, student_count: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">教室需求</label>
                  <select
                    value={form.room_requirement}
                    onChange={(e) => setForm({ ...form, room_requirement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="multimedia">多媒体</option>
                    <option value="lab">实验室</option>
                    <option value="lecture">阶梯教室</option>
                    <option value="normal">普通教室</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">班级</label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="">请选择班级</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_fixed"
                  checked={form.is_fixed}
                  onChange={(e) => setForm({ ...form, is_fixed: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                />
                <label htmlFor="is_fixed" className="text-sm text-gray-600">固定排课</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: '#e8723a' }}
              >
                {editingId ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-5">确定要删除该课程吗？此操作不可撤销。</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-red-500 hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
