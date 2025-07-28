import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EnvironmentalEntry } from "@/types/student";
import { 
  Thermometer, 
  Sun, 
  Volume2, 
  Users, 
  Cloud, 
  Plus,
  X
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface EnvironmentalTrackerProps {
  onEnvironmentalAdd: (entry: Omit<EnvironmentalEntry, 'id' | 'timestamp'>) => void;
  studentId: string;
}

export const EnvironmentalTracker = ({ onEnvironmentalAdd, studentId }: EnvironmentalTrackerProps) => {
  const { tTracking, tCommon } = useTranslation();
  const [roomTemperature, setRoomTemperature] = useState<number>(22);
  const [lighting, setLighting] = useState<string>('');
  const [noiseLevel, setNoiseLevel] = useState<number>(3);
  const [classroomActivity, setClassroomActivity] = useState<string>('');
  const [weather, setWeather] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<string>('');
  const [specialEvents, setSpecialEvents] = useState<string[]>([]);
  const [newEvent, setNewEvent] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleAddSpecialEvent = () => {
    if (newEvent.trim() && !specialEvents.includes(newEvent.trim())) {
      setSpecialEvents([...specialEvents, newEvent.trim()]);
      setNewEvent('');
    }
  };

  const handleRemoveSpecialEvent = (event: string) => {
    setSpecialEvents(specialEvents.filter(e => e !== event));
  };

  const handleSubmit = () => {
    if (!lighting || !classroomActivity || !weather || !timeOfDay) {
      return; // Could add validation toast here
    }

    const entry: Omit<EnvironmentalEntry, 'id' | 'timestamp'> = {
      roomConditions: {
        temperature: roomTemperature,
        lighting: lighting as any,
        noiseLevel: noiseLevel as any
      },
      weather: { 
        condition: weather as any, 
        temperature: roomTemperature 
      },
      classroom: {
        activity: classroomActivity as any,
        timeOfDay: timeOfDay as any
      },
      notes: notes.trim() || undefined
    };

    onEnvironmentalAdd(entry);
    
    // Reset form
    setRoomTemperature(22);
    setLighting('');
    setNoiseLevel(3);
    setClassroomActivity('');
    setWeather('');
    setTimeOfDay('');
    setSpecialEvents([]);
    setNotes('');
  };

  const isFormValid = lighting && classroomActivity && weather && timeOfDay;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Thermometer className="h-5 w-5 text-primary" />
          {String(tTracking('environmental.title'))}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Temperature */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            {String(tTracking('environmental.temperature'))}: {roomTemperature}°C
          </Label>
          <Slider
            value={[roomTemperature]}
            onValueChange={(value) => setRoomTemperature(value[0])}
            max={30}
            min={15}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>15°C</span>
            <span>30°C</span>
          </div>
        </div>

        {/* Lighting */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Sun className="h-4 w-4" />
            {String(tTracking('environmental.lighting'))}
          </Label>
          <Select value={lighting} onValueChange={setLighting}>
            <SelectTrigger>
              <SelectValue placeholder="Velg belysningstype" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bright">{String(tTracking('environmental.lighting.bright'))}</SelectItem>
              <SelectItem value="normal">{String(tTracking('environmental.lighting.normal'))}</SelectItem>
              <SelectItem value="dim">{String(tTracking('environmental.lighting.dim'))}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Noise Level */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            {String(tTracking('environmental.noiseLevel'))}: {noiseLevel}/5
          </Label>
          <Slider
            value={[noiseLevel]}
            onValueChange={(value) => setNoiseLevel(value[0])}
            max={5}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{String(tTracking('environmental.levels.low'))}</span>
            <span>{String(tTracking('environmental.levels.high'))}</span>
          </div>
        </div>

        {/* Crowd Level */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            {String(tTracking('environmental.crowdLevel'))}
          </Label>
          <Select value={classroomActivity} onValueChange={setClassroomActivity}>
            <SelectTrigger>
              <SelectValue placeholder="Velg folkemengde" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{String(tTracking('environmental.levels.low'))}</SelectItem>
              <SelectItem value="moderate">{String(tTracking('environmental.levels.moderate'))}</SelectItem>
              <SelectItem value="high">{String(tTracking('environmental.levels.high'))}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {String(tTracking('environmental.notes'))}
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={String(tTracking('environmental.notesPlaceholder'))}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!lighting}
          className="w-full"
        >
          {String(tCommon('buttons.save'))} {String(tTracking('environmental.title'))}
        </Button>
      </CardContent>
    </Card>
  );
};