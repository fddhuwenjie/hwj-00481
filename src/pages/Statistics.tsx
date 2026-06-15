import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Flame, GraduationCap, Building2, Search, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';
import * as api from '@/api';

const DAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
];

const PERIODS = [
  { value: 1, label: '1-2节' },
  { value: 3, label: '3-4节' },
  { value: 5, label: '5-6节' },
  { value: 7, label: '7-8节' },
  { value: 9, label: '9-10节' },
  { value: 11, label: '11-12节' },
];

const HEATMAP_DAYS = ['周一', '周二', '周三', '周四', '周五'];
const HEATMAP_PERIODS = ['1-2节', '3-4节', '5-6节', '7-8节', '9-10节', '11-12节'];

function getBarColor(utilization: number): string {
  if (utilization < 30) return '#ef4444';
  if (utilization <= 70) return '#f59e0b';
  return '#22c55e';
}

function getHeatmapBg(count: number): string {
  if (count === 0) return 'bg-gray-100';
  if (count === 1) return 'bg-blue-100';
  if (count === 2) return 'bg-blue-300';
  return 'bg-blue-500';
}

function getHeatmapText(count: number): string {
  if (count >= 3) return 'text-white';
  if (count >= 2) return 'text-blue-900';
  return 'text-blue-700';
}

export default function Statistics() {
  const [utilizationData, setUtilizationData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[][]>([]);
  const [teacherData, setTeacherData] = useState<any[]>([]);
  const [freeDay, setFreeDay] = useState<number>(1);
  const [freePeriod, setFreePeriod] = useState<number>(1);
  const [freeClassrooms, setFreeClassrooms] = useState<any[]>([]);
  const [freeLoading, setFreeLoading] = useState(false);
  const [utilLoading, setUtilLoading] = useState(false);
  const [heatLoading, setHeatLoading] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);

  const fetchUtilization = useCallback(async () => {
    setUtilLoading(true);
    try {
      const data = await api.getClassroomUtilization();
      const list = Array.isArray(data) ? data : data?.data || data?.classrooms || [];
      setUtilizationData(list);
    } catch {
      setUtilizationData([]);
    } finally {
      setUtilLoading(false);
    }
  }, []);

  const fetchHeatmap = useCallback(async () => {
    setHeatLoading(true);
    try {
      const data = await api.getTimeslotHeatmap();
      const grid: any[][] = HEATMAP_PERIODS.map(() => HEATMAP_DAYS.map(() => ({ count: 0 })));
      const slots = Array.isArray(data) ? data : data?.data || data?.slots || [];
      for (const slot of slots) {
        const dayIdx = (slot.day || slot.day_of_week || 1) - 1;
        const periodVal = slot.period || slot.period_start || 1;
        const periodIdx = [1, 3, 5, 7, 9, 11].indexOf(periodVal);
        if (dayIdx >= 0 && dayIdx < 5 && periodIdx >= 0 && periodIdx < 6) {
          grid[periodIdx][dayIdx] = { count: slot.count || 0 };
        }
      }
      setHeatmapData(grid);
    } catch {
      setHeatmapData(HEATMAP_PERIODS.map(() => HEATMAP_DAYS.map(() => ({ count: 0 }))));
    } finally {
      setHeatLoading(false);
    }
  }, []);

  const fetchTeacherWorkload = useCallback(async () => {
    setTeacherLoading(true);
    try {
      const data = await api.getTeacherWorkload();
      const list = Array.isArray(data) ? data : data?.data || data?.teachers || [];
      setTeacherData(list);
    } catch {
      setTeacherData([]);
    } finally {
      setTeacherLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUtilization();
    fetchHeatmap();
    fetchTeacherWorkload();
  }, [fetchUtilization, fetchHeatmap, fetchTeacherWorkload]);

  const handleSearchFree = async () => {
    setFreeLoading(true);
    try {
      const data = await api.getFreeClassrooms(freeDay, freePeriod);
      setFreeClassrooms(Array.isArray(data) ? data : []);
    } catch {
      setFreeClassrooms([]);
    } finally {
      setFreeLoading(false);
    }
  };

  const chartData = utilizationData.map((item: any) => ({
    code: item.code || item.classroomCode || item.classroom_code,
    utilization: Number(item.utilization || item.utilizationRate || 0).toFixed(1),
    rawUtilization: Number(item.utilization || item.utilizationRate || 0),
  }));

  const maxPeriods = Math.max(...teacherData.map((t: any) => t.weeklyPeriods || t.weekly_periods || 0), 1);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#1e3a5f' }}>
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
              统计分析
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              教室利用率、时段热度、教师课时量及空闲教室查询
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: '#1e3a5f' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                教室利用率
              </h2>
            </div>
            <button
              onClick={fetchUtilization}
              disabled={utilLoading}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ color: '#1e3a5f' }}
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 -mt-0.5 ${utilLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
          <div className="p-6">
            {chartData.length === 0 ? (
              <div className="py-12 text-center text-gray-400">暂无数据</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, '利用率']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <rect key={index} fill={getBarColor(entry.rawUtilization)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">教室编号</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">楼栋</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">类型</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">已用/总时段</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">利用率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {utilizationData.map((item: any, idx: number) => {
                        const util = Number(item.utilization || item.utilizationRate || 0);
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              {item.code || item.classroomCode || item.classroom_code}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">
                              {item.building || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">
                              {item.type || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">
                              {item.usedSlots || item.used_slots || 0}/{item.totalSlots || item.total_slots || 0}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: getBarColor(util) + '1a',
                                  color: getBarColor(util),
                                }}
                              >
                                {util.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5" style={{ color: '#e8723a' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                时段热度
              </h2>
            </div>
            <button
              onClick={fetchHeatmap}
              disabled={heatLoading}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ color: '#1e3a5f' }}
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 -mt-0.5 ${heatLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
          <div className="p-6">
            <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(5, 1fr)` }}>
              <div />
              {HEATMAP_DAYS.map((d) => (
                <div key={d} className="text-center text-sm font-medium text-gray-600 py-2">{d}</div>
              ))}
              {HEATMAP_PERIODS.map((period, pi) => (
                <>
                  <div key={`label-${period}`} className="flex items-center justify-center text-sm text-gray-500 font-medium">
                    {period}
                  </div>
                  {HEATMAP_DAYS.map((_day, di) => {
                    const cell = heatmapData[pi]?.[di];
                    const count = cell?.count || 0;
                    return (
                      <div
                        key={`${pi}-${di}`}
                        className={`rounded-lg flex items-center justify-center py-6 text-sm font-medium ${getHeatmapBg(count)} ${getHeatmapText(count)} transition-colors`}
                      >
                        {count}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-gray-100" />
                <span className="text-xs text-gray-500">0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-blue-100" />
                <span className="text-xs text-gray-500">1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-blue-300" />
                <span className="text-xs text-gray-500">2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-xs text-gray-500">3+</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" style={{ color: '#1e3a5f' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
                教师课时量
              </h2>
            </div>
            <button
              onClick={fetchTeacherWorkload}
              disabled={teacherLoading}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ color: '#1e3a5f' }}
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 -mt-0.5 ${teacherLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
          <div className="p-6">
            {teacherData.length === 0 ? (
              <div className="py-12 text-center text-gray-400">暂无数据</div>
            ) : (
              <>
                <div className="space-y-3">
                  {teacherData.map((teacher: any, idx: number) => {
                    const periods = teacher.weeklyPeriods || teacher.weekly_periods || 0;
                    const pct = (periods / maxPeriods) * 100;
                    const barColor = periods / maxPeriods > 0.7 ? '#e8723a' : '#1e3a5f';
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="w-20 text-sm text-gray-700 font-medium truncate text-right">
                          {teacher.name || teacher.teacherName || teacher.teacher_name}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: barColor }}
                          >
                            {pct > 15 && (
                              <span className="text-xs text-white font-medium">{periods}</span>
                            )}
                          </div>
                        </div>
                        {pct <= 15 && (
                          <span className="text-xs text-gray-500">{periods} 课时</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">姓名</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">职称</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">院系</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">课程数</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">总课时</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">周课时</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {teacherData.map((teacher: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">
                            {teacher.name || teacher.teacherName || teacher.teacher_name}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {teacher.title || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {teacher.department || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {teacher.courseCount || teacher.course_count || 0}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {teacher.totalHours || teacher.total_hours || 0}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: '#1e3a5f1a',
                                color: '#1e3a5f',
                              }}
                            >
                              {teacher.weeklyPeriods || teacher.weekly_periods || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="w-5 h-5" style={{ color: '#1e3a5f' }} />
            <h2 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>
              空闲教室查询
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">星期</label>
                <select
                  value={freeDay}
                  onChange={(e) => setFreeDay(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">节次</label>
                <select
                  value={freePeriod}
                  onChange={(e) => setFreePeriod(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSearchFree}
                disabled={freeLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#e8723a' }}
              >
                {freeLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                查询
              </button>
            </div>

            {freeClassrooms.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                {freeLoading ? '查询中...' : '请选择时段后点击查询'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {freeClassrooms.map((cr: any, idx: number) => (
                  <div
                    key={cr.id || idx}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4" style={{ color: '#1e3a5f' }} />
                      <span className="font-semibold text-gray-800">
                        {cr.code || cr.classroomCode || cr.classroom_code}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>{cr.building || '-'}</div>
                      <div className="flex items-center justify-between">
                        <span>容量：{cr.capacity || '-'}人</span>
                        {cr.type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            {cr.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
