import { describe, it, expect, beforeEach } from 'vitest';
import { dataStorage } from './dataStorage';
import { Student, Goal, EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('DataStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Re-initialize the storage for each test.
    // This is a simplified approach. In a real scenario, you might have a more robust way to reset the singleton.
    dataStorage['storageIndex'] = { students: {}, trackingEntries: {}, goals: {}, interventions: {}, alerts: {}, lastUpdated: new Date() };
  });

  it('should save and retrieve a student', () => {
    const student: Student = { id: '1', name: 'John Doe', grade: '5', createdAt: new Date() };
    dataStorage.saveStudent(student);
    const students = dataStorage.getStudents();
    expect(students).toHaveLength(1);
    expect(students[0]).toEqual(student);
  });

  it('should update an existing student', () => {
    const student1: Student = { id: '1', name: 'John Doe', grade: '5', createdAt: new Date() };
    const student2: Student = { ...student1, name: 'Johnathan Doe', grade: '6' };
    dataStorage.saveStudent(student1);
    dataStorage.saveStudent(student2);
    const students = dataStorage.getStudents();
    expect(students).toHaveLength(1);
    // lastUpdated will be different, so we don't compare the whole object
    expect(students[0].name).toEqual(student2.name);
  });

  it('should save and retrieve a goal', () => {
    const goal: Goal = {
      id: 'g1',
      studentId: '1',
      title: 'Improve Reading',
      description: '',
      category: 'academic',
      status: 'active',
      currentProgress: 20,
      targetValue: 100,
      createdDate: new Date(),
      targetDate: new Date(),
      updatedAt: new Date(),
      measurableObjective: 'Read 10 pages per day',
      progress: 20
    };
    dataStorage.saveGoal(goal);
    const goals = dataStorage.getGoals();
    expect(goals).toHaveLength(1);
    expect(goals[0].id).toEqual(goal.id);
  });

  it('should save and retrieve a tracking entry', () => {
    const emotionEntry: EmotionEntry = { id: 'e1', studentId: '1', timestamp: new Date(), emotion: 'happy', intensity: 4, triggers: [], context: '' };
    
    const sensoryEntry: SensoryEntry = { id: 's1', studentId: '1', timestamp: new Date(), sensoryType: 'auditory', response: 'seeking', context: '' };
    
    const trackingEntry: TrackingEntry = {
      id: 't1',
      studentId: '1',
      timestamp: new Date(),
      emotions: [emotionEntry],
      sensoryInputs: [sensoryEntry],
    };
    dataStorage.saveTrackingEntry(trackingEntry);
    const entries = dataStorage.getTrackingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toEqual(trackingEntry.id);
  });

  it('should save and retrieve a tracking entry', () => {
    const trackingEntry: TrackingEntry = {
      id: 't1',
      studentId: '1',
      timestamp: new Date(),
      emotions: [],
      sensoryInputs: [],
    };
    dataStorage.saveTrackingEntry(trackingEntry);
    const entries = dataStorage.getTrackingEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toEqual(trackingEntry.id);
  });
});