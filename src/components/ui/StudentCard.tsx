import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Student } from "@/types/student";
import { Calendar, FileText, TrendingUp } from "lucide-react";

interface StudentCardProps {
  student: Student;
  onView: (student: Student) => void;
  onTrack: (student: Student) => void;
}

export const StudentCard = ({ student, onView, onTrack }: StudentCardProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="font-dyslexia transition-all duration-300 hover:shadow-medium hover:scale-[1.02] bg-gradient-card border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3" role="presentation">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-lg" aria-hidden="true">
            {getInitials(student.name)}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              {student.name}
            </CardTitle>
            {student.grade && (
              <Badge variant="secondary" className="mt-1">
                Grade {student.grade}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Added {student.createdAt.toLocaleDateString()}</span>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onView(student)}
            className="flex-1 font-dyslexia"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Profile
          </Button>
          <Button 
            size="sm" 
            onClick={() => onTrack(student)}
            className="flex-1 font-dyslexia bg-gradient-primary hover:opacity-90"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Track Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};