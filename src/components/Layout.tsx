import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Building2,
  CalendarClock,
  Grid3X3,
  ArrowLeftRight,
  BarChart3,
  GraduationCap,
  User,
  ChevronDown,
  ClipboardList,
  FileText,
  CalendarCheck,
  Star,
  FolderOpen,
  Bell,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

const navItems = [
  { label: '仪表盘', icon: LayoutDashboard, path: '/' },
  { label: '课程管理', icon: BookOpen, path: '/courses' },
  { label: '教室资源', icon: Building2, path: '/classrooms' },
  { label: '智能排课', icon: CalendarClock, path: '/scheduling' },
  { label: '课程表视图', icon: Grid3X3, path: '/timetable' },
  { label: '调课管理', icon: ArrowLeftRight, path: '/adjustment' },
  { label: '选课中心', icon: ClipboardList, path: '/selection' },
  { label: '考试管理', icon: FileText, path: '/exams' },
  { label: '教室预约', icon: CalendarCheck, path: '/bookings' },
  { label: '教学评价', icon: Star, path: '/evaluation' },
  { label: '资源通知', icon: FolderOpen, path: '/resources' },
  { label: '统计分析', icon: BarChart3, path: '/statistics' },
];

const roleLabels: Record<string, string> = {
  admin: '管理员',
  teacher: '教师',
  student: '学生',
};

const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/courses': '课程管理',
  '/classrooms': '教室资源',
  '/scheduling': '智能排课',
  '/timetable': '课程表视图',
  '/adjustment': '调课管理',
  '/selection': '选课中心',
  '/exams': '考试管理',
  '/bookings': '教室预约',
  '/evaluation': '教学评价',
  '/resources': '资源通知',
  '/statistics': '统计分析',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { viewRole, setViewRole, currentWeek, setCurrentWeek, unreadCount, fetchUnreadCount, allNotifications, fetchAllNotifications, markOneRead, markAllRead } = useAppStore();
  const [roleOpen, setRoleOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => fetchUnreadCount(), 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleNotifToggle = () => {
    if (!notifOpen) {
      fetchAllNotifications();
    }
    setNotifOpen(!notifOpen);
  };

  const pageTitle = pageTitles[location.pathname] || '课程调度系统';

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className="flex flex-col shrink-0"
        style={{ width: 240, backgroundColor: '#1e3a5f' }}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <GraduationCap className="text-white" size={28} />
          <span className="text-white font-bold text-lg">课程调度系统</span>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'text-white font-medium'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
                style={
                  isActive
                    ? {
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        borderLeft: '3px solid #e8723a',
                        paddingLeft: 13,
                      }
                    : { borderLeft: '3px solid transparent' }
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div ref={roleRef} className="relative px-3 pb-4">
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-white/90 text-sm hover:bg-white/10 transition-colors"
          >
            <User size={16} />
            <span className="flex-1 text-left">{roleLabels[viewRole]}</span>
            <ChevronDown
              size={14}
              className={cn('transition-transform', roleOpen && 'rotate-180')}
            />
          </button>
          {roleOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 rounded-md shadow-lg overflow-hidden"
              style={{ backgroundColor: '#2a4f7a' }}
            >
              {(['admin', 'teacher', 'student'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setViewRole(role);
                    setRoleOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                    viewRole === role
                      ? 'text-white font-medium'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <User size={14} />
                  <span>{roleLabels[role]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#f5f7fa' }}>
        <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
          <h1 className="text-lg font-semibold text-gray-800">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <div ref={notifRef} className="relative">
              <button
                onClick={handleNotifToggle}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[480px] overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">通知中心</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllRead()}
                          className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          全部已读
                        </button>
                      )}
                      <Link
                        to="/resources"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-orange-500 hover:text-orange-700 transition-colors"
                      >
                        查看全部
                      </Link>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[400px]">
                    {allNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">暂无通知</div>
                    ) : (
                      allNotifications.slice(0, 10).map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && markOneRead(n.id)}
                          className={cn(
                            'px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors',
                            !n.is_read && 'bg-blue-50/50 border-l-2 border-l-blue-500'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm', !n.is_read ? 'text-gray-800 font-medium' : 'text-gray-600')}>
                                {n.message}
                              </p>
                              <span className="text-xs text-gray-400 mt-1 block">
                                {n.created_at || n.time || ''}
                              </span>
                            </div>
                            {!n.is_read && (
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">当前周次</span>
            <select
              value={currentWeek}
              onChange={(e) => setCurrentWeek(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  第 {w} 周
                </option>
              ))}
            </select>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
