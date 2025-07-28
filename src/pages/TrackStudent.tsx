import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmotionTracker } from "@/components/EmotionTracker";
import { SensoryTracker } from "@/components/SensoryTracker";
import { EnvironmentalTracker } from "@/components/EnvironmentalTracker";
import { Student, EmotionEntry, SensoryEntry, TrackingEntry, EnvironmentalEntry } from "@/types/student";
import { ArrowLeft, Save, User } from "lucide-react";
import { toast } from "sonner";

export const TrackStudent = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [emotions, setEmotions] = useState<Omit<EmotionEntry, 'id' | 'timestamp'>[]>([]);
  const [sensoryInputs, setSensoryInputs] = useState<Omit<SensoryEntry, 'id' | 'timestamp'>[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<Omit<EnvironmentalEntry, 'id' | 'timestamp'> | null>(null);
  const [generalNotes, setGeneralNotes] = useState('');

  useEffect(() => {
    if (!studentId) return;

    // Load student data
    const storedStudents = localStorage.getItem('sensoryTracker_students');
    if (storedStudents) {
      const students = JSON.parse(storedStudents);
      const foundStudent = students.find((s: Student) => s.id === studentId);
      if (foundStudent) {
        setStudent({
          ...foundStudent,
          createdAt: new Date(foundStudent.createdAt)
        });
      } else {
        toast.error('Student not found');
        navigate('/');
      }
    }
  }, [studentId, navigate]);

  const handleEmotionAdd = (emotion: Omit<EmotionEntry, 'id' | 'timestamp'>) => {
    setEmotions([...emotions, emotion]);
    toast.success('Emotion recorded!');
  };

  const handleSensoryAdd = (sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => {
    setSensoryInputs([...sensoryInputs, sensory]);
    toast.success('Sensory input recorded!');
  };

  const handleEnvironmentalAdd = (environmental: Omit<EnvironmentalEntry, 'id' | 'timestamp'>) => {
    setEnvironmentalData(environmental);
    toast.success('Environmental conditions recorded!');
  };

  const handleSaveSession = () => {
    if (!student) return;
    
    if (emotions.length === 0 && sensoryInputs.length === 0) {
      toast.error('Please record at least one emotion or sensory input');
      return;
    }

    const timestamp = new Date();
    
    // Create the tracking entry
    const trackingEntry: TrackingEntry = {
      id: crypto.randomUUID(),
      studentId: student.id,
      timestamp,
      emotions: emotions.map(e => ({
        ...e,
        id: crypto.randomUUID(),
        timestamp
      })),
      sensoryInputs: sensoryInputs.map(s => ({
        ...s,
        id: crypto.randomUUID(),
        timestamp
      })),
      environmentalData: environmentalData ? {
        ...environmentalData,
        id: crypto.randomUUID(),
        timestamp
      } : undefined,
      generalNotes: generalNotes.trim() || undefined
    };

    // Save to localStorage
    const storedEntries = localStorage.getItem('sensoryTracker_entries');
    const entries = storedEntries ? JSON.parse(storedEntries) : [];
    entries.push(trackingEntry);
    localStorage.setItem('sensoryTracker_entries', JSON.stringify(entries));

    toast.success('Tracking session saved successfully!');
    navigate(`/student/${student.id}`);
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading student...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-dyslexia">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/student/${student.id}`)}
            className="mb-4 font-dyslexia"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
              {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Tracking Session
              </h1>
              <p className="text-lg text-muted-foreground">
                {student.name}
              </p>
            </div>
          </div>
          
          <p className="text-muted-foreground">
            Record emotions and sensory responses for this session
          </p>
        </div>

        {/* Session Summary */}
        <div className="mb-6 p-4 bg-primary-soft rounded-lg border border-primary/20">
          <div className="flex items-center gap-4 text-sm text-primary-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{emotions.length} emotions recorded</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{sensoryInputs.length} sensory inputs recorded</span>
            </div>
          </div>
        </div>

        {/* Tracking Forms */}
        <div className="space-y-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <EmotionTracker 
              onEmotionAdd={handleEmotionAdd}
              studentId={student.id}
            />
            <SensoryTracker 
              onSensoryAdd={handleSensoryAdd}
              studentId={student.id}
            />
          </div>
          
          {/* Environmental Tracking */}
          <div className="w-full">
            <EnvironmentalTracker 
              onEnvironmentalAdd={handleEnvironmentalAdd}
              studentId={student.id}
            />
          </div>
        </div>

        {/* General Notes */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Session Notes (Optional)
          </h3>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Any general observations about this session, environmental factors, or overall mood..."
            className="w-full p-4 border border-border rounded-lg font-dyslexia bg-input focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        {/* Save Session */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/student/${student.id}`)}
            className="flex-1 font-dyslexia"
          >
            Cancel Session
          </Button>
          <Button
            onClick={handleSaveSession}
            disabled={emotions.length === 0 && sensoryInputs.length === 0}
            className="flex-1 font-dyslexia bg-gradient-primary hover:opacity-90 transition-all duration-200"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Session
          </Button>
        </div>
      </div>
    </div>
  );
};