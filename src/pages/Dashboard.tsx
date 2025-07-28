import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student, TrackingEntry } from "@/types/student";
import { Users, TrendingUp, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isToday } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";
import { MockDataLoader } from "@/components/MockDataLoader";
import { AnalyticsStatusIndicator } from "@/components/AnalyticsStatusIndicator";
import { analyticsManager } from "@/lib/analyticsManager";
import { motion } from 'framer-motion';
import { PremiumStatsCard } from "@/components/PremiumStatsCard";
import { PremiumStudentCard } from "@/components/PremiumStudentCard";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { PremiumHeader } from "@/components/PremiumHeader";
import { PremiumEmptyState } from "@/components/PremiumEmptyState";

/**
 * Dashboard component - Main landing page showing student overview and statistics
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
        // Load students from localStorage
        const storedStudents = localStorage.getItem('sensoryTracker_students');
        if (storedStudents) {
          const parsed = JSON.parse(storedStudents);
          setStudents(parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt)
          })));
        }
      } catch (error) {
        // Handle parsing errors gracefully
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Initialize analytics for all existing students
    const initializeAnalytics = async () => {
      await analyticsManager.triggerAnalyticsForAllStudents();
    };
    
    if (!isLoading) {
      initializeAnalytics();
    }
  }, [isLoading]);

  /**
   * Calculate statistics from all tracking data
   */
  const { todayEntries, totalEntries } = useMemo(() => {
    if (students.length === 0) {
      return { todayEntries: 0, totalEntries: 0 };
    }

    let todayCount = 0;
    let totalCount = 0;

    students.forEach(student => {
      try {
        const trackingData = localStorage.getItem(`sensoryTracker_tracking_${student.id}`);
        if (trackingData) {
          const entries: TrackingEntry[] = JSON.parse(trackingData).map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));

          totalCount += entries.length;
          todayCount += entries.filter(entry => isToday(entry.timestamp)).length;
        }
      } catch (error) {
        // Skip invalid entries
      }
    });

    return { todayEntries: todayCount, totalEntries: totalCount };
  }, [students]);

  const handleViewStudent = (student: Student) => {
    navigate(`/student/${student.id}`);
  };

  const handleTrackStudent = (student: Student) => {
    navigate(`/track/${student.id}`);
  };

  const handleAddStudent = () => {
    navigate('/add-student');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background font-dyslexia relative overflow-hidden"
    >
      {/* Decorative background elements */}
      <motion.div
        className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-accent/5 to-primary/5 rounded-full blur-3xl"
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.4, 0.6, 0.4]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Premium Header */}
        <PremiumHeader 
          title={String(tDashboard('title'))}
          subtitle={String(tDashboard('subtitle'))}
        />

        {/* Premium Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <PremiumStatsCard
            title={String(tDashboard('stats.totalStudents'))}
            value={isLoading ? 0 : students.length}
            icon={Users}
            index={0}
            isLoading={isLoading}
            loadingText={String(tCommon('status.loading'))}
            trend={{ value: 12, isPositive: true }}
          />
          
          <PremiumStatsCard
            title={String(tDashboard('stats.todaysEntries'))}
            value={isLoading ? 0 : todayEntries}
            icon={Calendar}
            index={1}
            isLoading={isLoading}
            loadingText={String(tCommon('status.loading'))}
            trend={{ value: 8, isPositive: true }}
          />
          
          <PremiumStatsCard
            title={String(tDashboard('stats.totalEntries'))}
            value={isLoading ? 0 : totalEntries}
            icon={TrendingUp}
            index={2}
            isLoading={isLoading}
            loadingText={String(tCommon('status.loading'))}
            trend={{ value: 5, isPositive: false }}
          />
        </motion.div>

        {/* Analytics Status for All Students */}
        {students.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mb-8"
          >
            <AnalyticsStatusIndicator showDetails={false} />
          </motion.div>
        )}

        {/* Students Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mb-8"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="flex items-center justify-between mb-8"
          >
            <h2 className="text-3xl font-semibold text-foreground flex items-center gap-3">
              <motion.span
                className="w-1 h-8 bg-gradient-primary rounded-full"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, delay: 1.4 }}
              />
              {String(tCommon('navigation.students'))}
            </h2>
          </motion.div>

          {students.length === 0 ? (
            <PremiumEmptyState
              title={String(tDashboard('emptyState.title'))}
              description={String(tDashboard('emptyState.description'))}
              buttonText={String(tDashboard('emptyState.addFirstStudent'))}
              onAddStudent={handleAddStudent}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {students.map((student, index) => (
                <PremiumStudentCard
                  key={student.id}
                  student={student}
                  onView={handleViewStudent}
                  onTrack={handleTrackStudent}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Mock Data Loader - for testing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="mb-8"
        >
          <MockDataLoader />
        </motion.div>

        {/* Premium Quick Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="mb-16"
        >
          <Card className="bg-gradient-calm border-0 shadow-soft overflow-hidden relative group">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              initial={false}
            />
            
            <CardHeader className="relative z-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 2 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-2xl"
                >
                  💡
                </motion.span>
                <CardTitle className="text-foreground text-xl">
                  {String(tDashboard('quickTips.title'))}
                </CardTitle>
              </motion.div>
            </CardHeader>
            
            <CardContent className="relative z-10">
              <motion.ul className="space-y-3">
                {[
                  String(tDashboard('quickTips.tip1')),
                  String(tDashboard('quickTips.tip2')),
                  String(tDashboard('quickTips.tip3'))
                ].map((tip, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 2.2 + (index * 0.1) }}
                    className="flex items-start gap-3 text-foreground"
                  >
                    <motion.span
                      className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.3
                      }}
                    />
                    <span className="leading-relaxed">{tip}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={handleAddStudent} />
    </motion.div>
  );
};