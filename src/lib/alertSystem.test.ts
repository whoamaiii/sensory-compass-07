import { describe, it, expect, beforeEach, vi } from 'vitest';
import { alertSystem, type AlertHistoryEntry } from './alertSystem';
import { dataStorage } from './dataStorage';
import { patternAnalysis, type TriggerAlert } from './patternAnalysis';
import { Student } from '@/types/student';

// Reset and stub dependencies in a safe way
describe('AlertSystem', () => {
  const student: Student = { id: 'student-1', name: 'Test Student', createdAt: new Date() };

  beforeEach(() => {
    vi.restoreAllMocks();
    // Stub dataStorage methods that are actually exported
    vi.spyOn(dataStorage, 'getStudents').mockReturnValue([student]);
    vi.spyOn(dataStorage, 'getTrackingEntriesForStudent').mockReturnValue([]);
    // alertSystem persists alerts in localStorage itself; dataStorage.getAlerts* is unrelated here
    // Clear persisted alerts before each test
    localStorage.removeItem('sensoryTracker_alerts');
  });

  it('should generate alerts for a student', () => {
    const mockAlerts: TriggerAlert[] = [{
      id: 'alert-1', title: 'New Pattern', severity: 'medium', type: 'pattern',
      description: 'test', recommendations: [], timestamp: new Date(), studentId: 'student-1', dataPoints: 5
    }];
    // Spy directly on instance methods
    const paSpy = vi.spyOn(patternAnalysis, 'generateTriggerAlerts').mockReturnValue(mockAlerts);
    const saveSpy = vi.spyOn(alertSystem as unknown as { saveAlerts: (a: TriggerAlert[]) => void }, 'saveAlerts').mockImplementation(() => {});

    alertSystem.generateAlertsForStudent(student, [], [], []);

    expect(paSpy).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalledWith(mockAlerts);
  });

  it('should not generate duplicate alerts', () => {
    // Seed localStorage with an existing recent alert for the student to simulate duplicates window
    const existing: AlertHistoryEntry = {
      alert: {
        id: 'alert-1',
        title: 'Existing Alert',
        studentId: 'student-1',
        severity: 'low',
        type: 'concern',
        description: '',
        recommendations: [],
        // Use a very recent timestamp so it's within frequency window
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        dataPoints: 10
      },
      viewed: false,
      resolved: false
    };
    localStorage.setItem('sensoryTracker_alerts', JSON.stringify([existing]));

    // Because a recent alert exists and is not high severity, the generator short-circuits before calling patternAnalysis
    const paSpy = vi.spyOn(patternAnalysis, 'generateTriggerAlerts').mockReturnValue([{ ...existing.alert, description: 'Updated' } as unknown as TriggerAlert]);
    const saveSpy = vi.spyOn(alertSystem as unknown as { saveAlerts: (a: TriggerAlert[]) => void }, 'saveAlerts').mockImplementation(() => {});

    alertSystem.generateAlertsForStudent(student, [], [], []);

    // No new alerts should be saved
    expect(saveSpy).not.toHaveBeenCalled();
    // And generateTriggerAlerts should not be called due to frequency window guard
    expect(paSpy).not.toHaveBeenCalled();
  });

  it('should retrieve alert history', () => {
    const history: AlertHistoryEntry[] = [
      {
        alert: {
          id: 'a1', studentId: 'student-1', title: 'Test', description: 'Desc',
          severity: 'medium', type: 'pattern', timestamp: new Date(), dataPoints: 1, recommendations: []
        },
        viewed: false, resolved: false
      }
    ];
    localStorage.setItem('sensoryTracker_alerts', JSON.stringify(history));

    const result = alertSystem.getAllAlerts();
    expect(result).toHaveLength(1);
    expect(result[0].alert.studentId).toBe('student-1');
  });

  it('should mark an alert as resolved', () => {
    const alert: AlertHistoryEntry = {
      alert: {
        id: 'a1', studentId: 'student-1', title: 'Test', description: 'Desc',
        severity: 'medium', type: 'pattern', timestamp: new Date(), dataPoints: 1, recommendations: []
      },
      viewed: false, resolved: false
    };
    localStorage.setItem('sensoryTracker_alerts', JSON.stringify([alert]));

    const setItemSpy = vi.spyOn(globalThis.localStorage, 'setItem');

    alertSystem.resolveAlert('a1', 'user-1');

    const savedAlerts = setItemSpy.mock.calls[0][1] as string;
    const parsedAlerts = JSON.parse(savedAlerts);

    expect(parsedAlerts[0].resolved).toBe(true);
    expect(parsedAlerts[0].resolvedBy).toBe('user-1');
  });
});