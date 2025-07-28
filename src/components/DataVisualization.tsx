import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { EmotionEntry, SensoryEntry } from "@/types/student";
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface DataVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  studentName: string;
  showTimeFilter?: boolean;
  selectedRange?: string;
}

export const DataVisualization = ({ emotions, sensoryInputs, studentName, showTimeFilter = false, selectedRange }: DataVisualizationProps) => {
  // Process emotion data for charts
  const emotionData = emotions.reduce((acc, emotion) => {
    const date = emotion.timestamp.toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing[emotion.emotion] = (existing[emotion.emotion] || 0) + emotion.intensity;
      existing.count = (existing.count || 0) + 1;
    } else {
      acc.push({
        date,
        [emotion.emotion]: emotion.intensity,
        count: 1
      });
    }
    return acc;
  }, [] as any[]);

  // Process sensory data
  const sensoryData = sensoryInputs.reduce((acc, sensory) => {
    const existing = acc.find(item => item.type === sensory.sensoryType);
    if (existing) {
      existing[sensory.response] = (existing[sensory.response] || 0) + 1;
      existing.total = (existing.total || 0) + 1;
    } else {
      acc.push({
        type: sensory.sensoryType,
        [sensory.response]: 1,
        total: 1
      });
    }
    return acc;
  }, [] as any[]);

  // Emotion distribution for pie chart
  const emotionDistribution = emotions.reduce((acc, emotion) => {
    acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(emotionDistribution).map(([emotion, count]) => ({
    name: emotion,
    value: count,
  }));

  const emotionColors = {
    happy: '#10B981',
    calm: '#06B6D4',
    excited: '#8B5CF6',
    sad: '#3B82F6',
    anxious: '#F59E0B',
    angry: '#EF4444',
  };

  if (emotions.length === 0 && sensoryInputs.length === 0) {
    return (
      <Card className="font-dyslexia bg-gradient-card border-0">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No data to display yet</p>
            <p className="text-sm">Start tracking emotions and sensory inputs to see visualizations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 font-dyslexia">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Data Insights for {studentName}
        </h2>
        <p className="text-muted-foreground">
          {selectedRange && `${selectedRange} • `}
          Tracking {emotions.length} emotions and {sensoryInputs.length} sensory inputs
        </p>
      </div>

      {/* Emotion Trends */}
      {emotions.length > 0 && (
        <Card className="bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Emotion Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emotionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                {Object.keys(emotionColors).map((emotion) => (
                  <Line
                    key={emotion}
                    type="monotone"
                    dataKey={emotion}
                    stroke={emotionColors[emotion as keyof typeof emotionColors]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Distribution */}
        {pieData.length > 0 && (
          <Card className="bg-gradient-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Emotion Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={emotionColors[entry.name as keyof typeof emotionColors] || '#8884d8'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sensory Responses */}
        {sensoryData.length > 0 && (
          <Card className="bg-gradient-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sensory Response Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sensoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="seeking" fill="#10B981" name="Seeking" />
                  <Bar dataKey="avoiding" fill="#EF4444" name="Avoiding" />
                  <Bar dataKey="neutral" fill="#6B7280" name="Neutral" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};