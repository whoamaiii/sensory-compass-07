import React, { memo, useMemo, useCallback } from 'react';
import { VirtualScrollArea } from './VirtualScrollArea';
import { PremiumStudentCard } from '../ui/PremiumStudentCard';
import { Student } from '@/types/student';

interface OptimizedStudentListProps {
  students: Student[];
  onViewStudent: (studentId: string) => void;
  onTrackStudent: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
  containerHeight?: number;
  itemHeight?: number;
}

const StudentCardMemo = memo(PremiumStudentCard);

export const OptimizedStudentList: React.FC<OptimizedStudentListProps> = memo(({
  students,
  onViewStudent,
  onTrackStudent,
  onDeleteStudent,
  containerHeight = 600,
  itemHeight = 180
}) => {
  const renderStudent = useCallback(
    (student: Student, index: number) => (
      <StudentCardMemo
        key={student.id}
        student={student}
        index={index}
        onView={() => onViewStudent(student.id)}
        onTrack={() => onTrackStudent(student.id)}
        onDelete={() => onDeleteStudent(student.id)}
      />
    ), [onViewStudent, onTrackStudent, onDeleteStudent]
  );

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No students found</p>
      </div>
    );
  }

  // Use virtual scrolling for large lists
  if (students.length > 20) {
    return (
      <VirtualScrollArea
        items={students}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderStudent}
        className="w-full"
      />
    );
  }

  // For smaller lists, render directly
  return (
    <div className="space-y-4">
      {students.map((student, index) => renderStudent(student, index))}
    </div>
  );
});