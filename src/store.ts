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
}));
