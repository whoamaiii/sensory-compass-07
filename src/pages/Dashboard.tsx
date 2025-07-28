import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Student, TrackingEntry } from "@/types/student";
import { useNavigate } from "react-router-dom";
import { isToday } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { LanguageSettings } from "@/components/LanguageSettings";
import { PremiumStudentCard } from "@/components/PremiumStudentCard";
import { MockDataLoader } from "@/components/MockDataLoader";
import { dataStorage } from "@/lib/dataStorage";

/**
 * Dashboard component - Main landing page with modern glassmorphism design
 * @returns React component displaying students list and tracking statistics
 */
export const Dashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { tDashboard, tCommon } = useTranslation();

  useEffect(() => {
    const loadData = () => {
      try {
        console.log('Dashboard: Loading students...');
        // Use DataStorageManager for consistent data access
        const students = dataStorage.getStudents();
        console.log('Dashboard: Loaded students:', students.length);
        setStudents(students);
      } catch (error) {
        console.error('Dashboard: Error loading students:', error);
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Listen for storage changes to refresh data without page reload
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('sensoryTracker_')) {
        console.log('Dashboard: Storage changed, reloading data');
        loadData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Calculate statistics from all tracking data
   */
  const { todayEntries, totalEntries } = useMemo(() => {
    if (students.length === 0) {
      return { todayEntries: 0, totalEntries: 0 };
    }

    try {
      console.log('Dashboard: Calculating tracking statistics...');
      // Use DataStorageManager for consistent data access
      const allEntries = dataStorage.getTrackingEntries();
      console.log('Dashboard: Total entries found:', allEntries.length);
      
      const todayCount = allEntries.filter(entry => isToday(entry.timestamp)).length;
      console.log('Dashboard: Today entries:', todayCount);
      
      return { 
        todayEntries: todayCount, 
        totalEntries: allEntries.length 
      };
    } catch (error) {
      console.error('Dashboard: Error calculating statistics:', error);
      return { todayEntries: 0, totalEntries: 0 };
    }
  }, [students]);

  const handleAddStudent = () => {
    navigate('/add-student');
  };

  const handleNewEntry = () => {
    if (students.length > 0) {
      navigate(`/track/${students[0].id}`);
    } else {
      navigate('/add-student');
    }
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    console.log('Export report functionality to be implemented');
  };

  const handleViewStudent = (student: Student) => {
    navigate(`/student/${student.id}`);
  };

  const handleTrackStudent = (student: Student) => {
    navigate(`/track/${student.id}`);
  };

  return (
    <div className="main-container min-h-screen relative">
      {/* Animated glow background */}
      <div className="glow-bg"></div>
      
      <div className="relative z-10 min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <header className="flex justify-between items-center mb-16 animate-fade-in">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Sensory<span className="text-primary">Tracker</span> - {String(tDashboard('title')).split(' - ')[1]}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {String(tDashboard('subtitle'))}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow flex items-center justify-center group"
                  >
                    <span className="material-icons-outlined mr-2 text-base transition-transform group-hover:rotate-12">
                      science
                    </span>
                    Load Mock Data
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Mock Data for Testing & Analysis</DialogTitle>
                  </DialogHeader>
                  <MockDataLoader />
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:flex items-center justify-center group"
              >
                <span className="material-icons-outlined mr-2 text-base transition-transform group-hover:rotate-12">
                  help_outline
                </span>
                Hjelp & Støtte
              </Button>
              <LanguageSettings />
            </div>
          </header>

          <main>
            {/* Overview section with buttons */}
            <div 
              className="flex justify-between items-center mb-8 animate-fade-in" 
              style={{ animationDelay: '0.2s' }}
            >
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Oversikt</h2>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={handleExportReport}
                  className="flex items-center justify-center group"
                >
                  <span className="material-icons-outlined mr-2 text-base">file_download</span>
                  Eksporter Rapport
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleNewEntry}
                  size="lg"
                  className="flex items-center justify-center group"
                >
                  <span className="material-icons-outlined mr-2 text-base group-hover:animate-bounce">add</span>
                  Ny Registrering
                </Button>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <Card 
                className="animate-fade-in" 
                style={{ animationDelay: '0.3s' }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {String(tDashboard('stats.totalStudents'))}
                  </h3>
                  <div className="icon-bg p-2 rounded-lg">
                    <span className="material-icons-outlined text-primary">groups</span>
                  </div>
                </div>
                <p className="text-5xl font-bold mt-6 text-foreground animate-number-pop" style={{ animationDelay: '0.4s' }}>
                  <AnimatedCounter value={isLoading ? 0 : students.length} />
                </p>
                <div className="flex items-center text-sm mt-3">
                  <span className="material-icons-outlined text-green-400 text-base mr-1">arrow_upward</span>
                  <span className="text-green-400">12%</span>
                  <span className="ml-1 text-muted-foreground">fra forrige uke</span>
                </div>
              </Card>

              <Card 
                className="animate-fade-in" 
                style={{ animationDelay: '0.4s' }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {String(tDashboard('stats.todaysEntries'))}
                  </h3>
                  <div className="icon-bg p-2 rounded-lg">
                    <span className="material-icons-outlined text-primary">edit_calendar</span>
                  </div>
                </div>
                <p className="text-5xl font-bold mt-6 text-foreground animate-number-pop" style={{ animationDelay: '0.5s' }}>
                  <AnimatedCounter value={isLoading ? 0 : todayEntries} />
                </p>
                <div className="flex items-center text-sm mt-3">
                  <span className="material-icons-outlined text-green-400 text-base mr-1">arrow_upward</span>
                  <span className="text-green-400">8%</span>
                  <span className="ml-1 text-muted-foreground">fra forrige uke</span>
                </div>
              </Card>

              <Card 
                className="animate-fade-in" 
                style={{ animationDelay: '0.5s' }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {String(tDashboard('stats.totalEntries'))}
                  </h3>
                  <div className="icon-bg p-2 rounded-lg">
                    <span className="material-icons-outlined text-primary">bar_chart</span>
                  </div>
                </div>
                <p className="text-5xl font-bold mt-6 text-foreground animate-number-pop" style={{ animationDelay: '0.6s' }}>
                  <AnimatedCounter value={isLoading ? 0 : totalEntries} />
                </p>
                <div className="flex items-center text-sm mt-3">
                  <span className="material-icons-outlined text-red-400 text-base mr-1">arrow_downward</span>
                  <span className="text-red-400">5%</span>
                  <span className="ml-1 text-muted-foreground">fra forrige uke</span>
                </div>
              </Card>
            </div>

            {/* Students section */}
            <div>
              <div 
                className="flex justify-between items-center mb-8 text-foreground animate-fade-in" 
                style={{ animationDelay: '0.6s' }}
              >
                <h2 className="text-3xl font-bold tracking-tight">Elever</h2>
                <Button 
                  variant="default" 
                  onClick={handleAddStudent}
                  size="lg"
                  className="flex items-center justify-center group"
                >
                  <span className="material-icons-outlined mr-2 group-hover:animate-bounce transition-transform">add</span>
                  Legg til elev
                </Button>
              </div>

              {/* Students grid or empty state */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass-card rounded-3xl p-6 animate-pulse">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-muted/50 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-muted/50 rounded mb-2"></div>
                          <div className="h-4 bg-muted/30 rounded w-2/3"></div>
                        </div>
                      </div>
                      <div className="h-2 bg-muted/30 rounded mb-4"></div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="h-12 bg-muted/30 rounded"></div>
                        <div className="h-12 bg-muted/30 rounded"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-muted/30 rounded flex-1"></div>
                        <div className="h-8 bg-muted/30 rounded flex-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                  {students.map((student, index) => (
                    <PremiumStudentCard
                      key={student.id}
                      student={student}
                      onView={handleViewStudent}
                      onTrack={handleTrackStudent}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                  {/* Empty State */}
                  <div className="relative glass-card rounded-3xl p-8 text-center min-h-[400px] flex flex-col justify-center items-center overflow-hidden">
                    {/* Decorative SVG elements */}
                    <div className="absolute top-10 right-10 opacity-10 transition-transform duration-500 hover:scale-110">
                      <svg fill="none" height="100" viewBox="0 0 24 24" width="100" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z" stroke="hsl(var(--primary))" strokeWidth="1.5"></path>
                        <path d="M19.5 17.5714C19.5 19.961 17.2687 21.5 15.4286 21.5C13.5884 21.5 11.8333 20.3571 10.7143 19.2857M4.5 17.5714C4.5 19.961 6.73134 21.5 8.57143 21.5C10.4116 21.5 12.1667 20.3571 13.2857 19.2857M13.2857 19.2857C14.0714 18.5 14.0714 17.2143 13.2857 16.4286M10.7143 19.2857C9.92857 18.5 9.92857 17.2143 10.7143 16.4286M13.2857 16.4286C12.5 15.6429 11.5 15.6429 10.7143 16.4286M12 7.5C10.7143 4.5 8.57143 2.5 6 2.5M12 7.5C13.2857 4.5 15.4286 2.5 18 2.5" stroke="hsl(var(--primary))" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                      </svg>
                    </div>
                    
                    <div className="absolute bottom-10 left-10 opacity-5 -rotate-12 transition-transform duration-500 hover:scale-110 hover:-rotate-6">
                      <svg fill="none" height="120" viewBox="0 0 24 24" width="120" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z" stroke="hsl(var(--primary))" strokeWidth="1.5"></path>
                        <path d="M19.5 17.5714C19.5 19.961 17.2687 21.5 15.4286 21.5C13.5884 21.5 11.8333 20.3571 10.7143 19.2857M4.5 17.5714C4.5 19.961 6.73134 21.5 8.57143 21.5C10.4116 21.5 12.1667 20.3571 13.2857 19.2857M13.2857 19.2857C14.0714 18.5 14.0714 17.2143 13.2857 16.4286M10.7143 19.2857C9.92857 18.5 9.92857 17.2143 10.7143 16.4286M13.2857 16.4286C12.5 15.6429 11.5 15.6429 10.7143 16.4286M12 7.5C10.7143 4.5 8.57143 2.5 6 2.5M12 7.5C13.2857 4.5 15.4286 2.5 18 2.5" stroke="hsl(var(--primary))" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
                      </svg>
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                      <div className="flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-6 border border-primary/20 transition-transform duration-300 hover:scale-110">
                        <span className="material-icons-outlined text-primary text-5xl transition-transform duration-300 group-hover:rotate-6">groups</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground">
                        {String(tDashboard('emptyState.title'))}
                      </h3>
                      <p className="mt-3 max-w-md text-base text-muted-foreground">
                        {String(tDashboard('emptyState.description'))}
                      </p>
                    </div>
                  </div>

                  {/* Mock Data Loader */}
                  <MockDataLoader />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};