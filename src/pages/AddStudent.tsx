import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Student } from "@/types/student";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const AddStudent = () => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a student name');
      return;
    }

    setIsLoading(true);

    try {
      const newStudent: Student = {
        id: crypto.randomUUID(),
        name: name.trim(),
        grade: grade.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date(),
      };

      // Load existing students
      const storedStudents = localStorage.getItem('sensoryTracker_students');
      const students = storedStudents ? JSON.parse(storedStudents) : [];
      
      // Add new student
      students.push(newStudent);
      
      // Save to localStorage
      localStorage.setItem('sensoryTracker_students', JSON.stringify(students));
      
      toast.success(`${name} has been added successfully!`);
      navigate('/');
    } catch (error) {
      toast.error('Failed to add student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-dyslexia">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mb-4 font-dyslexia"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Add New Student
          </h1>
          <p className="text-muted-foreground">
            Create a profile to start tracking sensory and emotional data
          </p>
        </div>

        {/* Form */}
        <Card className="bg-gradient-card border-0 shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="h-5 w-5" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name - Required */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Student Name *
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter student's full name"
                  className="font-dyslexia bg-input border-border focus:ring-ring"
                  required
                />
              </div>

              {/* Grade - Optional */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Grade Level (Optional)
                </label>
                <Input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., 3rd Grade, Pre-K, etc."
                  className="font-dyslexia bg-input border-border focus:ring-ring"
                />
              </div>

              {/* Date of Birth - Optional */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date of Birth (Optional)
                </label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="font-dyslexia bg-input border-border focus:ring-ring"
                />
              </div>

              {/* Notes - Optional */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Notes (Optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about the student's needs, preferences, or background..."
                  className="font-dyslexia bg-input border-border focus:ring-ring"
                  rows={4}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1 font-dyslexia"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-dyslexia bg-gradient-primary hover:opacity-90 transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Adding...
                    </div>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Student
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Helper Text */}
        <div className="mt-6 p-4 bg-accent/50 rounded-lg border border-accent">
          <h3 className="font-medium text-accent-foreground mb-2">Getting Started</h3>
          <p className="text-sm text-accent-foreground/80">
            Once you add a student, you'll be able to track their emotions and sensory responses 
            throughout the day. The more data you collect, the better insights you'll get about 
            patterns and triggers.
          </p>
        </div>
      </div>
    </div>
  );
};