import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users, UserCheck, Building2 } from 'lucide-react';
import * as api from '@/api';
import { useAppStore } from '@/store';

const COLOR_PALETTE = [
  'bg-blue-100',
  'bg-green-100',
  'bg-purple-100',
  'bg-yellow-100',
  'bg-pink-100',
  'bg-indigo-100',
  'bg-orange-100',
  'bg-teal-100',
];

const PERIOD_PAIRS = [
  { label: '1-2节', start: 1, end: 2 },
  { label: '3-4节', start: 3, end: 4 },
  { label: '5-6节', start: 5, end: 6 },
  { label: '7-8节', start: 7, end: 8 },
  { label: '9-10节', start: 9, end: 10 },
  { label: '11-12节', start: 11, end: 12 },
];

const DAYS = ['周一', '周二', '周三', '周四', '周五'];

type TabType = 'student' | 'teacher' | 'classroom';

interface TimetableEntry {
  course_id: number;
  course_name: string;
  classroom_code: string;
  teacher_name: string;
  day_of_week?: number;
  day?: number;
  period_start: number;
  period_end: number;
  week_type?: 'odd' | 'even' | string;
}

interface DropdownItem {
  id?: number;
  class_id?: number;
  class_name?: string;
  name?: string;
  teacher_id?: number;
  teacher_name?: string;
  classroom_id?: number;
  classroom_code?: string;
  code?: string;
  [key: string]: unknown;
}

export default function Timetable() {
  const { classes, teachers, classrooms, fetchClasses, fetchTeachers, fetchClassrooms, currentWeek, setCurrentWeek } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('student');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [week, setWeek] = useState(currentWeek);
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'student' && classes.length === 0) fetchClasses();
    if (activeTab === 'teacher' && teachers.length === 0) fetchTeachers();
    if (activeTab === 'classroom' && classrooms.length === 0) fetchClassrooms();
  }, [activeTab, classes.length, teachers.length, classrooms.length, fetchClasses, fetchTeachers, fetchClassrooms]);

  useEffect(() => {
    if (!selectedId) {
      setTimetableData([]);
      return;
    }
    setLoading(true);
    const fetcher =
      activeTab === 'student'
        ? api.getStudentTimetable(selectedId, week)
        : activeTab === 'teacher'
          ? api.getTeacherTimetable(selectedId, week)
          : api.getClassroomTimetable(selectedId, week);
    fetcher
      .then((data) => {
        setTimetableData(Array.isArray(data) ? data : data?.items ?? []);
      })
      .catch(() => {
        setTimetableData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedId, week, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedId(null);
    setTimetableData([]);
  };

  const weekChange = (delta: number) => {
    const next = week + delta;
    if (next >= 1 && next <= 20) {
      setWeek(next);
      setCurrentWeek(next);
    }
  };

  const getCourseColor = (courseId: number) => COLOR_PALETTE[courseId % COLOR_PALETTE.length];

  const getPairIndex = (period: number) => Math.floor((period - 1) / 2);

  const buildGrid = () => {
    const occupied: boolean[][] = Array.from({ length: 6 }, () => Array(5).fill(false));
    const cellMap = new Map<string, { entry: TimetableEntry; rowSpan: number }>();

    for (const entry of timetableData) {
      const day = (entry.day_of_week ?? entry.day) - 1;
      const startPair = getPairIndex(entry.period_start);
      const endPair = getPairIndex(entry.period_end);
      const rowSpan = endPair - startPair + 1;
      cellMap.set(`${startPair}-${day}`, { entry, rowSpan });
      for (let p = startPair; p <= endPair; p++) {
        occupied[p][day] = true;
      }
    }

    return { occupied, cellMap };
  };

  const { occupied, cellMap } = buildGrid();

  const dropdownItems =
    activeTab === 'student' ? classes : activeTab === 'teacher' ? teachers : classrooms;

  const dropdownLabel =
    activeTab === 'student' ? '选择班级' : activeTab === 'teacher' ? '选择教师' : '选择教室';

  const itemKey = (item: DropdownItem) =>
    activeTab === 'student'
      ? item.class_id ?? item.id
      : activeTab === 'teacher'
        ? item.teacher_id ?? item.id
        : item.classroom_id ?? item.id;

  const itemName = (item: DropdownItem) =>
    activeTab === 'student'
      ? item.class_name ?? item.name
      : activeTab === 'teacher'
        ? item.teacher_name ?? item.name
        : item.classroom_code ?? item.code;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex rounded-md overflow-hidden border border-gray-200">
            {([
              { key: 'student' as TabType, label: '学生课表', icon: Users },
              { key: 'teacher' as TabType, label: '教师课表', icon: UserCheck },
              { key: 'classroom' as TabType, label: '教室占用表', icon: Building2 },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[180px]"
          >
            <option value="">{dropdownLabel}</option>
            {dropdownItems.map((item: DropdownItem) => (
              <option key={itemKey(item)} value={itemKey(item)}>
                {itemName(item)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => weekChange(-1)}
            disabled={week <= 1}
            className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
            第 {week} 周
          </span>
          <button
            onClick={() => weekChange(1)}
            disabled={week >= 20}
            className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            加载中...
          </div>
        ) : !selectedId ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            请选择{activeTab === 'student' ? '班级' : activeTab === 'teacher' ? '教师' : '教室'}查看课表
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-600 w-20">
                  节次
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-600"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIOD_PAIRS.map((pair, rowIdx) => (
                <tr key={pair.label}>
                  <td className="border border-gray-200 bg-gray-50 px-2 py-3 text-center text-xs text-gray-500 font-medium">
                    {pair.label}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const key = `${rowIdx}-${dayIdx}`;
                    const cell = cellMap.get(key);

                    if (cell) {
                      const { entry, rowSpan } = cell;
                      return (
                        <td
                          key={key}
                          rowSpan={rowSpan}
                          className={`border border-gray-200 px-2 py-2 align-top ${getCourseColor(entry.course_id)}`}
                        >
                          <div className="text-sm font-bold text-gray-800 leading-tight">
                            {entry.course_name}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">{entry.classroom_code}</div>
                          <div className="text-xs text-gray-600">{entry.teacher_name}</div>
                          {entry.week_type === 'odd' && (
                            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-200 text-blue-700 font-medium">
                              (单周)
                            </span>
                          )}
                          {entry.week_type === 'even' && (
                            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-700 font-medium">
                              (双周)
                            </span>
                          )}
                        </td>
                      );
                    }

                    if (occupied[rowIdx][dayIdx]) return null;

                    return <td key={key} className="border border-gray-200 bg-gray-50/50" />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
