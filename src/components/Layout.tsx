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
  '/statistics': '统计分析',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { viewRole, setViewRole, currentWeek, setCurrentWeek } = useAppStore();
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
