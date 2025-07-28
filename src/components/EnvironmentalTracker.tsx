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

interface EnvironmentalTrackerProps {
  onEnvironmentalAdd: (entry: Omit<EnvironmentalEntry, 'id' | 'timestamp'>) => void;
  studentId: string;
}

export const EnvironmentalTracker = ({ onEnvironmentalAdd, studentId }: EnvironmentalTrackerProps) => {
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
          Environmental Conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Temperature */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Room Temperature: {roomTemperature}°C
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
            Lighting Conditions
          </Label>
          <Select value={lighting} onValueChange={setLighting}>
            <SelectTrigger>
              <SelectValue placeholder="Select lighting type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bright">Bright</SelectItem>
              <SelectItem value="dim">Dim</SelectItem>
              <SelectItem value="natural">Natural</SelectItem>
              <SelectItem value="fluorescent">Fluorescent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Noise Level */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Noise Level: {noiseLevel}/5
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
            <span>Very Quiet</span>
            <span>Very Loud</span>
          </div>
        </div>

        {/* Classroom Activity */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Classroom Activity
          </Label>
          <Select value={classroomActivity} onValueChange={setClassroomActivity}>
            <SelectTrigger>
              <SelectValue placeholder="Select current activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instruction">Teacher Instruction</SelectItem>
              <SelectItem value="transition">Transition</SelectItem>
              <SelectItem value="free-time">Free Time</SelectItem>
              <SelectItem value="testing">Testing/Assessment</SelectItem>
              <SelectItem value="group-work">Group Work</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Weather */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Weather Conditions
          </Label>
          <Select value={weather} onValueChange={setWeather}>
            <SelectTrigger>
              <SelectValue placeholder="Select weather" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sunny">Sunny</SelectItem>
              <SelectItem value="cloudy">Cloudy</SelectItem>
              <SelectItem value="rainy">Rainy</SelectItem>
              <SelectItem value="stormy">Stormy</SelectItem>
              <SelectItem value="snowy">Snowy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time of Day */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Time of Day
          </Label>
          <Select value={timeOfDay} onValueChange={setTimeOfDay}>
            <SelectTrigger>
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Special Events */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Special Events/Circumstances
          </Label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              placeholder="Add special event or circumstance"
              className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-input focus:ring-2 focus:ring-ring focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSpecialEvent()}
            />
            <Button 
              type="button" 
              size="sm" 
              onClick={handleAddSpecialEvent}
              disabled={!newEvent.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {specialEvents.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {specialEvents.map((event, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {event}
                  <button
                    onClick={() => handleRemoveSpecialEvent(event)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Environmental Notes (Optional)
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional observations about the environment..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full"
        >
          Record Environmental Conditions
        </Button>
      </CardContent>
    </Card>
  );
};