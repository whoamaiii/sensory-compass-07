import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SensoryEntry } from "@/types/student";
import { Eye, Ear, Hand, RotateCcw, Activity } from "lucide-react";

interface SensoryTrackerProps {
  onSensoryAdd: (sensory: Omit<SensoryEntry, 'id' | 'timestamp'>) => void;
  studentId: string;
}

const sensoryTypes = [
  { type: 'visual' as const, label: 'Visual', icon: Eye, description: 'Sight-related' },
  { type: 'auditory' as const, label: 'Auditory', icon: Ear, description: 'Sound-related' },
  { type: 'tactile' as const, label: 'Tactile', icon: Hand, description: 'Touch-related' },
  { type: 'vestibular' as const, label: 'Vestibular', icon: RotateCcw, description: 'Balance/movement' },
  { type: 'proprioceptive' as const, label: 'Proprioceptive', icon: Activity, description: 'Body awareness' },
];

const responses = [
  { type: 'seeking' as const, label: 'Seeking', description: 'Wanting more input' },
  { type: 'avoiding' as const, label: 'Avoiding', description: 'Trying to escape input' },
  { type: 'neutral' as const, label: 'Neutral', description: 'Typical response' },
];

export const SensoryTracker = ({ onSensoryAdd, studentId }: SensoryTrackerProps) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [intensity, setIntensity] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [environment, setEnvironment] = useState('');

  const handleSubmit = () => {
    if (!selectedType || !selectedResponse) return;

    onSensoryAdd({
      studentId,
      sensoryType: selectedType as SensoryEntry['sensoryType'],
      response: selectedResponse as SensoryEntry['response'],
      intensity: intensity as SensoryEntry['intensity'],
      notes: notes.trim() || undefined,
      environment: environment.trim() || undefined,
    });

    // Reset form
    setSelectedType('');
    setSelectedResponse('');
    setIntensity(3);
    setNotes('');
    setEnvironment('');
  };

  return (
    <Card className="font-dyslexia bg-gradient-card border-0">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Track Sensory Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sensory Type Selection */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Sensory Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sensoryTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.type}
                  variant={selectedType === type.type ? "default" : "outline"}
                  className={`h-16 flex items-center gap-3 justify-start font-dyslexia transition-all duration-200 ${
                    selectedType === type.type 
                      ? 'bg-gradient-primary shadow-medium' 
                      : 'hover:scale-105'
                  }`}
                  onClick={() => setSelectedType(type.type)}
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs opacity-70">{type.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Response Type */}
        {selectedType && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Response Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {responses.map((response) => (
                <Button
                  key={response.type}
                  variant={selectedResponse === response.type ? "default" : "outline"}
                  className={`h-16 flex-col gap-1 font-dyslexia transition-all duration-200 ${
                    selectedResponse === response.type 
                      ? 'bg-gradient-primary shadow-medium' 
                      : 'hover:scale-105'
                  }`}
                  onClick={() => setSelectedResponse(response.type)}
                >
                  <span className="font-medium">{response.label}</span>
                  <span className="text-xs opacity-70">{response.description}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Intensity Scale */}
        {selectedResponse && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              Intensity Level: {intensity}/5
            </h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <Button
                  key={level}
                  variant={intensity === level ? "default" : "outline"}
                  size="sm"
                  className={`w-12 h-12 rounded-full font-dyslexia ${
                    intensity === level ? 'bg-gradient-primary' : ''
                  }`}
                  onClick={() => setIntensity(level)}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Environment */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Environment (Optional)</h3>
          <input
            type="text"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            placeholder="e.g., Classroom, Playground, Library..."
            className="w-full px-3 py-2 border border-border rounded-lg font-dyslexia bg-input focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Notes (Optional)</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional observations about the sensory response..."
            className="font-dyslexia bg-input border-border focus:ring-ring"
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={!selectedType || !selectedResponse}
          className="w-full font-dyslexia bg-gradient-primary hover:opacity-90 transition-all duration-200"
        >
          Record Sensory Input
        </Button>
      </CardContent>
    </Card>
  );
};