import { create } from 'zustand';
import * as api from './api';

interface AppState {
  courses: any[];
  classrooms: any[];
  teachers: any[];
  classes: any[];
  semester: any | null;
  currentWeek: number;
  viewRole: 'admin' | 'teacher' | 'student';
  selectedTeacherId: number | null;
  selectedClassId: number | null;
  selectedClassroomId: number | null;
  notifications: any[];
  adjustments: any[];
  students: any[];
  selectionPeriods: any[];
  exams: any[];
  bookings: any[];
  allNotifications: any[];
  unreadCount: number;

  fetchCourses: () => Promise<void>;
  fetchClassrooms: () => Promise<void>;
  fetchTeachers: () => Promise<void>;
  fetchClasses: () => Promise<void>;
  fetchSemester: () => Promise<void>;
  setCurrentWeek: (week: number) => void;
  setViewRole: (role: 'admin' | 'teacher' | 'student') => void;
  setSelectedTeacherId: (id: number | null) => void;
  setSelectedClassId: (id: number | null) => void;
  setSelectedClassroomId: (id: number | null) => void;
  fetchNotifications: () => Promise<void>;
  fetchAdjustments: () => Promise<void>;
  fetchStudents: () => Promise<void>;
  fetchSelectionPeriods: () => Promise<void>;
  fetchExams: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  fetchAllNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (id: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  courses: [],
  classrooms: [],
  teachers: [],
  classes: [],
  semester: null,
  currentWeek: 1,
  viewRole: 'admin',
  selectedTeacherId: null,
  selectedClassId: null,
  selectedClassroomId: null,
  notifications: [],
  adjustments: [],
  students: [],
  selectionPeriods: [],
  exams: [],
  bookings: [],
  allNotifications: [],
  unreadCount: 0,

  fetchCourses: async () => {
    const courses = await api.getCourses();
    set({ courses });
  },

  fetchClassrooms: async () => {
    const classrooms = await api.getClassrooms();
    set({ classrooms });
  },

  fetchTeachers: async () => {
    const teachers = await api.getTeachers();
    set({ teachers });
  },

  fetchClasses: async () => {
    const classes = await api.getClasses();
    set({ classes });
  },

  fetchSemester: async () => {
    const semester = await api.getCurrentSemester();
    set({ semester });
  },

  setCurrentWeek: (week) => set({ currentWeek: week }),
  setViewRole: (role) => set({ viewRole: role }),
  setSelectedTeacherId: (id) => set({ selectedTeacherId: id }),
  setSelectedClassId: (id) => set({ selectedClassId: id }),
  setSelectedClassroomId: (id) => set({ selectedClassroomId: id }),

  fetchNotifications: async () => {
    const notifications = await api.getNotifications();
    set({ notifications });
  },

  fetchAdjustments: async () => {
    const adjustments = await api.getAdjustments();
    set({ adjustments });
  },

  fetchStudents: async () => {
    const students = await api.getStudents();
    set({ students });
  },

  fetchSelectionPeriods: async () => {
    const selectionPeriods = await api.getSelectionPeriods();
    set({ selectionPeriods });
  },

  fetchExams: async () => {
    const exams = await api.getExams();
    set({ exams });
  },

  fetchBookings: async () => {
    const bookings = await api.getBookings();
    set({ bookings });
  },

  fetchAllNotifications: async () => {
    const data = await api.getAllNotifications();
    const allNotifications = Array.isArray(data) ? data : [];
    set({ allNotifications });
  },

  fetchUnreadCount: async () => {
    try {
      const data = await api.getUnreadNotificationCount();
      set({ unreadCount: data?.count ?? 0 });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  markAllRead: async () => {
    await api.markAllNotificationsRead();
    set((state) => ({
      unreadCount: 0,
      allNotifications: state.allNotifications.map((n: any) => ({ ...n, is_read: 1 })),
    }));
  },

  markOneRead: async (id: number) => {
    await api.markNotificationRead(id);
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
      allNotifications: state.allNotifications.map((n: any) =>
        n.id === id ? { ...n, is_read: 1 } : n
      ),
    }));
  },
}));
