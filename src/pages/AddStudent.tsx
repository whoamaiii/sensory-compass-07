import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Student } from "@/types/student";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSettings } from "@/components/LanguageSettings";
import { analyticsManager } from "@/lib/analyticsManager";
import { dataStorage } from "@/lib/dataStorage";
import { logger } from "@/lib/logger";

const AddStudent = () => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { tStudent, tCommon } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error(String(tStudent('addStudent.form.name.required')));
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

      // Save student using proper dataStorage method
      dataStorage.saveStudent(newStudent);
      
      // Initialize analytics infrastructure only (no mock data generation)
      analyticsManager.initializeStudentAnalytics(newStudent.id);
      
      toast.success(String(tStudent('addStudent.success')));
      navigate('/');
    } catch (error) {
      logger.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add student. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-dyslexia">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="font-dyslexia"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {String(tStudent('addStudent.backToDashboard'))}
            </Button>
            <LanguageSettings />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {String(tStudent('addStudent.title'))}
          </h1>
          <p className="text-muted-foreground">
            {String(tStudent('addStudent.description'))}
          </p>
        </div>

        {/* Form */}
        <Card className="bg-gradient-card border-0 shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="h-5 w-5" />
              {String(tStudent('profile.information'))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name - Required */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {String(tStudent('addStudent.form.name.label'))} *
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={String(tStudent('addStudent.form.name.placeholder'))}
                  className="font-dyslexia bg-input border-border focus:ring-ring"
                  required
                />
              </div>

              {/* Grade - Optional */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {String(tStudent('addStudent.form.grade.label'))}
                </label>
                <Input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder={String(tStudent('addStudent.form.grade.placeholder'))}
                  className="font-dyslexia bg-input border-border focus:ring-ring"
                />
              </div>

              {/* Date of Birth - Optional */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {String(tStudent('addStudent.form.dateOfBirth.label'))}
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
                  {String(tStudent('addStudent.form.notes.label'))}
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={String(tStudent('addStudent.form.notes.placeholder'))}
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
                  {String(tCommon('buttons.cancel'))}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-dyslexia bg-gradient-primary hover:opacity-90 transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      {String(tCommon('status.saving'))}
                    </div>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {String(tCommon('buttons.add'))} {String(tCommon('navigation.students')).slice(0, -1)}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Helper Text */}
        <div className="mt-6 p-4 bg-accent/50 rounded-lg border border-accent">
          <h3 className="font-medium text-accent-foreground mb-2">{String(tStudent('addStudent.helpText'))}</h3>
          <p className="text-sm text-accent-foreground/80">
            {String(tStudent('addStudent.helpText'))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddStudent;
