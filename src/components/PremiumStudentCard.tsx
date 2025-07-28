import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Student } from "@/types/student";
import { motion } from 'framer-motion';
import { User, GraduationCap, Trash2 } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useTranslation } from "@/hooks/useTranslation";
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';
import { dataStorage } from '@/lib/dataStorage';
import { toast } from 'sonner';

interface PremiumStudentCardProps {
  student: Student;
  onView: (student: Student) => void;
  onTrack: (student: Student) => void;
  onDelete?: (student: Student) => void;
  index: number;
}

export const PremiumStudentCard = ({ 
  student, 
  onView, 
  onTrack, 
  onDelete,
  index 
}: PremiumStudentCardProps) => {
  const { tDashboard } = useTranslation();

  const handleDeleteStudent = async () => {
    try {
      dataStorage.deleteStudent(student.id);
      toast.success(`${student.name} has been deleted successfully`);
      
      // Trigger storage event to refresh Dashboard
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sensoryTracker_students',
        newValue: JSON.stringify(dataStorage.getStudents())
      }));
      
      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(student);
      }
    } catch (error) {
      toast.error('Failed to delete student', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // Mock progress data - in real app this would come from tracking data
  const progressPercentage = Math.floor(Math.random() * 100);
  const isActiveToday = Math.random() > 0.5;
  const entriesThisWeek = Math.floor(Math.random() * 10);
  
  // Get last tracking date (mock for now)
  const lastTracked = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
  const lastTrackedText = isToday(lastTracked) 
    ? "I dag" 
    : format(lastTracked, 'dd. MMM', { locale: nb });

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.08,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="group"
    >
      <Card className="relative overflow-hidden bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-500">
        {/* Background gradient animation */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          initial={false}
        />
        
        {/* Active indicator */}
        {isActiveToday && (
          <motion.div
            className="absolute top-4 right-4 w-3 h-3 bg-positive rounded-full"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity
            }}
          />
        )}
        
        <CardContent className="relative z-10 p-6">
          {/* Header with Avatar and Basic Info */}
          <div className="flex items-start gap-4 mb-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <motion.div
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                whileHover={{ scale: 1.2 }}
              >
                <span className="material-icons-outlined text-white text-xs">person</span>
              </motion.div>
            </motion.div>
            
            <div className="flex-1">
              <motion.h3 
                className="font-semibold text-lg text-foreground mb-1"
                layoutId={`student-name-${student.id}`}
              >
                {student.name}
              </motion.h3>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="material-icons-outlined text-sm">school</span>
                <span>
                  {student.grade 
                    ? String(tDashboard('studentCard.grade')).replace('{{grade}}', student.grade.toString())
                    : String(tDashboard('studentCard.noGrade'))
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Datainnsamling</span>
              <span className="text-xs font-medium text-primary">{progressPercentage}%</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2 bg-muted/50"
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <div className="text-lg font-bold text-primary">{entriesThisWeek}</div>
              <div className="text-xs text-muted-foreground">Denne uken</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <div className="text-sm font-medium text-foreground">{lastTrackedText}</div>
              <div className="text-xs text-muted-foreground">Sist sporet</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative z-20 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                console.log('View button clicked for student:', student.name);
                onView(student);
              }}
              className="flex-1 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200"
            >
              <span className="material-icons-outlined text-sm mr-1">visibility</span>
              {String(tDashboard('studentCard.viewProfile'))}
            </Button>
            
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Track button clicked for student:', student.name);
                onTrack(student);
              }}
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-200"
            >
              <span className="material-icons-outlined text-sm mr-1">trending_up</span>
              {String(tDashboard('studentCard.trackNow'))}
            </Button>
            
            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/40"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Student</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {student.name}? This will permanently delete all their tracking data, goals, and associated records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteStudent}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Student
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>

        {/* Subtle shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 -skew-x-12 pointer-events-none"
          animate={{
            x: [-100, 300],
            transition: {
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 3
            }
          }}
        />
      </Card>
    </motion.div>
  );
};