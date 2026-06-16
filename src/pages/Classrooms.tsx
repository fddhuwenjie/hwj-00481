import { useState, useEffect } from 'react';
import { Users, Monitor, Plus, Pencil, Trash2, X, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '@/api';
import { useAppStore } from '@/store';

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'multimedia', label: '多媒体' },
  { value: 'lab', label: '实验室' },
  { value: 'lecture', label: '阶梯教室' },
  { value: 'normal', label: '普通教室' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'maintenance', label: '维修中' },
  { value: 'exam', label: '考试占用' },
];

const TYPE_BADGE: Record<string, string> = {
  multimedia: 'bg-blue-100 text-blue-700',
  lab: 'bg-purple-100 text-purple-700',
  lecture: 'bg-green-100 text-green-700',
  normal: 'bg-gray-100 text-gray-700',
};

const TYPE_LABEL: Record<string, string> = {
  multimedia: '多媒体',
  lab: '实验室',
  lecture: '阶梯教室',
  normal: '普通教室',
};

const STATUS_BADGE: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  maintenance: 'bg-red-100 text-red-700',
  exam: 'bg-yellow-100 text-yellow-700',
};

const STATUS_LABEL: Record<string, string> = {
  normal: '正常',
  maintenance: '维修中',
  exam: '考试占用',
};

const DAYS = ['周一', '周二', '周三', '周四', '周五'];
const PERIODS = ['1-2节', '3-4节', '5-6节', '7-8节', '9-10节', '11-12节'];

const STATUS_TOGGLE: { value: string; label: string; color: string }[] = [
  { value: 'normal', label: '正常', color: 'bg-green-500 hover:bg-green-600' },
  { value: 'maintenance', label: '维修中', color: 'bg-red-500 hover:bg-red-600' },
  { value: 'exam', label: '考试占用', color: 'bg-yellow-500 hover:bg-yellow-600' },
];

interface Classroom {
  id: number;
  code: string;
  building: string;
  capacity: number;
  type: string;
  equipment: string[];
  status: string;
}

interface AvailabilitySlot {
  day: number;
  period: number;
  status?: string;
  courseName?: string;
}

interface AvailabilityData {
  slots?: AvailabilitySlot[];
  [key: string]: unknown;
}

interface FormData {
  code: string;
  building: string;
  capacity: number | string;
  type: string;
  equipment: string;
  status: string;
}

const emptyForm: FormData = {
  code: '',
  building: '',
  capacity: '',
  type: 'normal',
  equipment: '',
  status: 'normal',
};

export default function Classrooms() {
  const { classrooms, fetchClassrooms } = useAppStore();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  useEffect(() => {
    if (selectedId !== null) {
      api.getClassroomAvailability(selectedId).then(setAvailability).catch(() => setAvailability(null));
    } else {
      setAvailability(null);
    }
  }, [selectedId]);

  const filtered = classrooms.filter((c: Classroom) => {
    if (typeFilter && c.type !== typeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleEdit = (c: Classroom) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      building: c.building,
      capacity: c.capacity,
      type: c.type,
      equipment: Array.isArray(c.equipment) ? c.equipment.join(',') : c.equipment || '',
      status: c.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    await api.deleteClassroom(id);
    fetchClassrooms();
    if (selectedId === id) setSelectedId(null);
  };

  const handleSubmit = async () => {
    const payload = {
      ...form,
      capacity: Number(form.capacity),
      equipment: form.equipment.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (editingId !== null) {
      await api.updateClassroom(editingId, payload);
    } else {
      await api.createClassroom(payload);
    }
    setShowModal(false);
    fetchClassrooms();
  };

  const handleStatusToggle = async (id: number, status: string) => {
    await api.updateClassroomStatus(id, { status });
    fetchClassrooms();
  };

  const selectedClassroom = classrooms.find((c: Classroom) => c.id === selectedId);

  const getCellValue = (day: number, period: number): AvailabilitySlot | null => {
    if (!availability) return null;
    const slots = availability.slots || [];
    if (Array.isArray(slots)) {
      const slot = slots.find((s: AvailabilitySlot) => s.day === day && s.period === period);
      return slot || null;
    }
    return null;
  };

  const getCellStyle = (cell: AvailabilitySlot | null) => {
    if (!cell) return 'bg-green-100 text-green-800';
    if (cell.status === 'maintenance') return 'bg-red-100 text-red-800';
    if (cell.status === 'occupied' || cell.courseName) return 'bg-gray-200 text-gray-700';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">教室资源</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          新增教室
        </button>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {filtered.map((c: Classroom) => (
          <div
            key={c.id}
            className={`relative border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition cursor-pointer ${
              selectedId === c.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className={`absolute top-3 right-3 flex gap-2 transition-opacity ${
                hoveredId === c.id ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-gray-900">{c.code}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[c.type] || ''}`}>
                  {TYPE_LABEL[c.type] || c.type}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status] || ''}`}>
                  {STATUS_LABEL[c.status] || c.status}
                </span>
              </div>

              <div className="text-sm text-gray-500">{c.building}</div>

              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Users size={14} />
                <span>{c.capacity}人</span>
              </div>

              {c.equipment && c.equipment.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Monitor size={14} />
                  <span>{Array.isArray(c.equipment) ? c.equipment.join('、') : c.equipment}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {STATUS_TOGGLE.map((t) => (
                  <button
                    key={t.value}
                    onClick={(e) => { e.stopPropagation(); handleStatusToggle(c.id, t.value); }}
                    className={`px-2.5 py-1 rounded text-xs text-white transition ${
                      c.status === t.value ? t.color : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedId !== null && selectedClassroom && (
        <div className="border rounded-xl p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedClassroom.code} 空闲情况
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/bookings')}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#e8723a' }}
              >
                <CalendarCheck size={14} />
                申请借用
              </button>
              <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-px bg-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500"></div>
            {DAYS.map((d) => (
              <div key={d} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-700">{d}</div>
            ))}
            {PERIODS.map((p, pi) => (
              <>
                <div key={`label-${p}`} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500 flex items-center justify-center">
                  {p}
                </div>
                {DAYS.map((_, di) => {
                  const cell = getCellValue(di + 1, pi + 1);
                  return (
                    <div
                      key={`${pi}-${di}`}
                      className={`p-2 text-center text-xs min-h-[40px] flex items-center justify-center ${getCellStyle(cell)}`}
                    >
                      {cell?.courseName || (cell?.status === 'maintenance' ? '维修' : '空闲')}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId !== null ? '编辑教室' : '新增教室'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">教室编号</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所在楼栋</label>
                <input
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">容量</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TYPE_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设备（逗号分隔）</label>
                <input
                  value={form.equipment}
                  onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
