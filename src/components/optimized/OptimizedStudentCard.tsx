import React, { memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Activity } from "lucide-react";
import { Student } from "@/types/student";

interface StudentCardProps {
  student: Student;
  onView: (student: Student) => void;
  onTrack: (student: Student) => void;
}

/**
 * Optimized StudentCard component with React.memo to prevent unnecessary re-renders
 * Only re-renders when student prop or callbacks change
 */
export const OptimizedStudentCard = memo(({ student, onView, onTrack }: StudentCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">{getInitials(student.name)}</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{student.name}</h3>
              <p className="text-sm text-muted-foreground">Grade {student.grade}</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onView(student)}
            className="flex-1"
          >
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTrack(student)}
            className="flex-1"
          >
            <Activity className="h-4 w-4 mr-2" />
            Track
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  // Only re-render if student data actually changed
  return (
    prevProps.student.id === nextProps.student.id &&
    prevProps.student.name === nextProps.student.name &&
    prevProps.student.grade === nextProps.student.grade &&
    prevProps.onView === nextProps.onView &&
    prevProps.onTrack === nextProps.onTrack
  );
});

OptimizedStudentCard.displayName = 'OptimizedStudentCard';