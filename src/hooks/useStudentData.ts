import { useState, useEffect, useCallback } from 'react';
import {
  Student,
  TrackingEntry,
  EmotionEntry,
  SensoryEntry,
  Goal,
} from '@/types/student';
import { dataStorage } from '@/lib/dataStorage';
import { logger } from '@/lib/logger';

/**
 * @hook useStudentData
 * 
 * A custom hook to fetch and manage all data related to a specific student.
 * This hook centralizes the logic for retrieving a student's profile, tracking entries,
 * emotions, sensory inputs, and goals from data storage.
 *
 * @param {string | undefined} studentId - The ID of the student to fetch data for.
 * 
 * @returns {object} An object containing:
 *  - `student`: The student's profile data.
 *  - `trackingEntries`: All tracking entries for the student.
 *  - `allEmotions`: A flattened array of all emotion entries.
 *  - `allSensoryInputs`: A flattened array of all sensory input entries.
 *  - `goals`: The student's goals.
 *  - `isLoading`: A boolean indicating if the initial data load is in progress.
 *  - `error`: Any error message that occurred during data fetching.
 *  - `reloadGoals`: A function to specifically refetch the student's goals.
 *  - `reloadData`: A function to refetch all of the student's data from storage.
 */
export const useStudentData = (studentId: string | undefined) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [allEmotions, setAllEmotions] = useState<EmotionEntry[]>([]);
  const [allSensoryInputs, setAllSensoryInputs] = useState<SensoryEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches all data for the given studentId from the data storage.
   * This function is wrapped in `useCallback` to ensure it is memoized and
   * doesn't cause unnecessary re-renders when passed as a prop or dependency.
   */
  const loadData = useCallback(() => {
    if (!studentId) {
      setIsLoading(false);
      setError('No student ID provided.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const studentData = dataStorage.getStudentById(studentId);

      if (studentData) {
        setStudent(studentData);
        
        const entries = dataStorage.getEntriesForStudent(studentId);
        setTrackingEntries(entries);

        const emotions = entries.flatMap(entry => entry.emotions);
        const sensoryInputs = entries.flatMap(entry => entry.sensoryInputs);
        
        setAllEmotions(emotions);
        setAllSensoryInputs(sensoryInputs);
        
        const allGoals = dataStorage.getGoals();
        const studentGoals = allGoals.filter(goal => goal.studentId === studentId);
        setGoals(studentGoals);
      } else {
        setError('Student not found.');
      }
    } catch (e) {
      setError('Failed to load student data.');
      logger.error('Failed to load student data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  // Effect to load data when the component mounts or when the studentId changes.
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Specifically reloads the goals for the current student.
   * This is useful after a goal has been updated, added, or deleted.
   */
  const reloadGoals = useCallback(() => {
    if (studentId) {
      const allGoals = dataStorage.getGoals();
      const studentGoals = allGoals.filter(goal => goal.studentId === studentId);
      setGoals(studentGoals);
    }
  }, [studentId]);

  return { 
    student, 
    trackingEntries, 
    allEmotions, 
    allSensoryInputs, 
    goals, 
    isLoading, 
    error,
    reloadGoals,
    reloadData: loadData
  };
}; 