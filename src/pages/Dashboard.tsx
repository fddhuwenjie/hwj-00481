import { useEffect, useState } from 'react';
import { BookOpen, Users, Building2, Calendar, Bell, Clock, AlertCircle } from 'lucide-react';
import { getNotifications, getPendingCourses } from '@/api';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const statCards = [
  { key: 'courses', label: '总课程数', icon: BookOpen, color: 'bg-blue-500', initial: 8 },
  { key: 'teachers', label: '总教师数', icon: Users, color: 'bg-emerald-500', initial: 5 },
  { key: 'classrooms', label: '总教室数', icon: Building2, color: 'bg-violet-500', initial: 10 },
  { key: 'week', label: '当前周次', icon: Calendar, color: 'bg-amber-500', initial: 1 },
];

interface Notification {
  id: number;
  message: string;
  time: string;
  is_read?: boolean;
}

export default function Dashboard() {
  const { currentWeek, courses, teachers, classrooms, fetchCourses, fetchTeachers, fetchClassrooms } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const stats = {
    courses: courses.length || statCards[0].initial,
    teachers: teachers.length || statCards[1].initial,
    classrooms: classrooms.length || statCards[2].initial,
    week: currentWeek || statCards[3].initial,
  };

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
    fetchClassrooms();
    getNotifications().then(setNotifications).catch(() => {});
    getPendingCourses().then((data) => setPendingCount(data.length)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', card.color)}>
                <Icon className="text-white" size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats[card.key as keyof typeof stats]}</div>
                <div className="text-sm text-gray-500">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-amber-500" />
          <h2 className="text-base font-semibold text-gray-800">近期通知</h2>
        </div>
        {notifications.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">暂无通知</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'flex items-start gap-3 py-3 px-2 rounded-md',
                  !n.is_read && 'bg-amber-50'
                )}
              >
                {!n.is_read && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', !n.is_read ? 'text-gray-800 font-medium' : 'text-gray-600')}>
                    {n.message}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                  <Clock size={12} />
                  {n.time}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={18} className="text-orange-500" />
          <h2 className="text-base font-semibold text-gray-800">待排课程</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-orange-500">{pendingCount}</span>
          <span className="text-sm text-gray-500">门课程尚未排课，请及时处理</span>
        </div>
      </div>
    </div>
  );
}
