import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Database, Users, Trash2, CheckCircle } from 'lucide-react';
import { loadMockDataToStorage, clearMockDataFromStorage, generateMockStudents, generateAllMockData } from '@/lib/mockDataGenerator';
import { dataStorage } from '@/lib/dataStorage';

/**
 * MockDataLoader Component
 * Provides interface to load/clear mock student data for testing pattern analysis
 */
export const MockDataLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<string>('all');

  const handleLoadMockData = async () => {
    setIsLoading(true);
    setLoadingProgress(0);

    try {
      // Simulate loading progress for better UX
      setLoadingProgress(25);
      
      // Generate and load the data based on selected scenario
      const progressInterval = setInterval(() => {
        setLoadingProgress((oldProgress) => {
          if (oldProgress === 100) {
            clearInterval(progressInterval);
            return 100;
          }
          const diff = Math.random() * 10;
          return Math.min(oldProgress + diff, 100);
        });
      }, 500);

      // Load data based on selected scenario
      if (selectedScenario === 'all') {
        await loadMockDataToStorage();
      } else {
        // Load specific scenario data
        const scenarios: Record<string, 'emma' | 'lars' | 'astrid'> = {
          'emma': 'emma',
          'lars': 'lars',
          'astrid': 'astrid'
        };
        const scenario = scenarios[selectedScenario];
        if (scenario) {
          // Clear existing mock data first
          await clearMockDataFromStorage();

          // Load specific student
          const students = generateMockStudents();
          const selectedStudent = students.find(s => s.name.toLowerCase().includes(scenario));

          if (selectedStudent) {
            dataStorage.saveStudent(selectedStudent);

            // Generate tracking data for the selected student
            const { trackingEntries } = generateAllMockData();
            const studentEntries = trackingEntries.filter(entry => entry.studentId === selectedStudent.id);
            studentEntries.forEach(entry => {
              dataStorage.saveTrackingEntry(entry);
            });
          }
        }
      }
      
      setLoadingProgress(75);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoadingProgress(100);
      
      // Get stats for success message
      const stats = dataStorage.getStorageStats();
      const displayCount = selectedScenario === 'all' ? '3 students' : '1 student';
      
      toast.success('Mock data loaded successfully!', {
        description: `Loaded ${displayCount} with ${stats.entriesCount} tracking entries`,
      });
      
      // Dispatch a custom event to notify other components that mock data has been loaded.
      // This allows for dynamic updates without requiring a full page reload.
      window.dispatchEvent(new CustomEvent('mockDataLoaded'));
      
    } catch (error) {
      toast.error('Failed to load mock data', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleClearMockData = async () => {
    try {
      clearMockDataFromStorage();
      
      toast.success('Mock data cleared successfully!');
      
      // Dispatch a custom event to force a refresh on components that listen for it.
      window.dispatchEvent(new CustomEvent('mockDataLoaded'));
      
    } catch (error) {
      toast.error('Failed to clear mock data', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const mockStudents = generateMockStudents();
  const currentStats = dataStorage.getStorageStats();
  const hasMockData = dataStorage.getStudents().some(s => s.id.startsWith('mock_'));

  return (
    <Card className="bg-gradient-card border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Mock Data for Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Load realistic test data to explore pattern analysis and correlation features.
          Mock data includes 3 students with 3-6 months of tracking data each.
        </div>

        {/* Scenario Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Data Scenario</label>
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger>
              <SelectValue placeholder="Select scenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students (Recommended)</SelectItem>
              <SelectItem value="emma">Emma - Mild Anxiety Patterns</SelectItem>
              <SelectItem value="lars">Lars - Sensory Challenges</SelectItem>
              <SelectItem value="astrid">Astrid - Steady Improvement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Student Preview */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Students to be created:</div>
          <div className="space-y-1">
            {mockStudents.map(student => (
              <div key={student.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{student.name} ({student.grade})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Data Stats */}
        {currentStats.studentsCount > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <div className="text-sm font-medium">Current Data:</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• {currentStats.studentsCount} students</div>
              <div>• {currentStats.entriesCount} tracking entries</div>
              {hasMockData && <div className="text-orange-600">• Contains mock data</div>}
            </div>
          </div>
        )}

        {/* Loading Progress */}
        {isLoading && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Loading mock data...</div>
            <Progress value={loadingProgress} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 bg-gradient-primary hover:opacity-90"
            disabled={isLoading}
            onClick={handleLoadMockData}
          >
            <Database className="h-4 w-4 mr-2" />
            Load Mock Data
          </Button>

          {hasMockData && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all student data and tracking entries. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearMockData} className="bg-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Features This Will Test */}
        <div className="pt-3 border-t border-border">
          <div className="text-sm font-medium mb-2">Features you can test:</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Emotion pattern recognition</div>
            <div>• Sensory input correlations</div>
            <div>• Environmental factor analysis</div>
            <div>• Predictive insights & trends</div>
            <div>• Interactive data visualization</div>
            <div>• Alert system & anomaly detection</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};