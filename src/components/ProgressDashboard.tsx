import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Goal, Student } from "@/types/student";
import type { EChartsOption } from "echarts";
import { EChartContainer } from "@/components/charts/EChartContainer";
import { TrendingUp, Crosshair, Award, Clock, CheckCircle } from "lucide-react";
import { format, differenceInDays, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { OptimizedAnimatedCounter } from "@/components/optimized";

interface ProgressDashboardProps {
  student: Student;
  goals: Goal[];
}

export const ProgressDashboard = ({ student, goals }: ProgressDashboardProps) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    const activeGoals = goals.filter(g => g.status === 'active');
    const achievedGoals = goals.filter(g => g.status === 'achieved');
    const overallProgress = goals.length > 0 
      ? goals.reduce((sum, goal) => sum + goal.currentProgress, 0) / goals.length 
      : 0;

    const onTrackGoals = activeGoals.filter(goal => {
      const daysUntilTarget = differenceInDays(goal.targetDate, new Date());
      const expectedProgress = daysUntilTarget > 0 
        ? Math.max(0, 100 - (daysUntilTarget / differenceInDays(goal.targetDate, goal.createdDate)) * 100)
        : 100;
      return goal.currentProgress >= expectedProgress * 0.8; // 80% of expected progress
    });

    const atRiskGoals = activeGoals.filter(goal => {
      const daysUntilTarget = differenceInDays(goal.targetDate, new Date());
      const expectedProgress = daysUntilTarget > 0 
        ? Math.max(0, 100 - (daysUntilTarget / differenceInDays(goal.targetDate, goal.createdDate)) * 100)
        : 100;
      return goal.currentProgress < expectedProgress * 0.6; // Less than 60% of expected progress
    });

    return {
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      achievedGoals: achievedGoals.length,
      overallProgress,
      onTrackGoals: onTrackGoals.length,
      atRiskGoals: atRiskGoals.length
    };
  }, [goals]);

  // Prepare chart data for progress over time


  const progressChartData = useMemo(() => {
    const allDataPoints: Array<{
      date: Date;
      goalId: string;
      goalTitle: string;
      value: number;
      category: string;
    }> = [];

    goals.forEach(goal => {
      goal.dataPoints.forEach(point => {
        allDataPoints.push({
          date: point.timestamp,
          goalId: goal.id,
          goalTitle: goal.title,
          value: point.value,
          category: goal.category
        });
      });
    });

    // Group by week for chart display
    const now = new Date();
    const startDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    const endDate = endOfMonth(now);
    
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
    
    const result = weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart);
      const weekData = allDataPoints.filter(point => 
        point.date >= weekStart && point.date <= weekEnd
      );

      const avgProgress = weekData.length > 0
        ? weekData.reduce((sum, point) => sum + point.value, 0) / weekData.length
        : 0;

      return {
        week: format(weekStart, 'MMM dd'),
        progress: Math.round(avgProgress),
        dataPoints: weekData.length
      };
    });
    return result;
  }, [goals]);

  // Brief analyzing skeleton to smooth chart updates when goals change
  useEffect(() => {
    setIsAnalyzingTrends(true);
    const t = setTimeout(() => setIsAnalyzingTrends(false), 300);
    return () => clearTimeout(t);
  }, [goals]);

  // Category progress data
  const categoryData = useMemo(() => {
    const categories = ['behavioral', 'academic', 'social', 'sensory', 'communication'];
    return categories.map(category => {
      const categoryGoals = goals.filter(g => g.category === category);
      const avgProgress = categoryGoals.length > 0
        ? categoryGoals.reduce((sum, goal) => sum + goal.currentProgress, 0) / categoryGoals.length
        : 0;
      
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        progress: Math.round(avgProgress),
        count: categoryGoals.length,
        achieved: categoryGoals.filter(g => g.status === 'achieved').length
      };
    }).filter(item => item.count > 0);
  }, [goals]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d'];

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'active': return 'text-blue-600';
      case 'achieved': return 'text-green-600';
      case 'modified': return 'text-yellow-600';
      case 'discontinued': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityGoals = () => {
    const now = new Date();
    return goals
      .filter(g => g.status === 'active')
      .map(goal => ({
        ...goal,
        daysUntilTarget: differenceInDays(goal.targetDate, now),
        urgencyScore: (100 - goal.currentProgress) / Math.max(1, differenceInDays(goal.targetDate, now))
      }))
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 5);
  };


 return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Crosshair className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              <OptimizedAnimatedCounter value={progressMetrics.totalGoals} />
            </div>
            <p className="text-xs text-muted-foreground">
              {progressMetrics.activeGoals} active, {progressMetrics.achievedGoals} achieved
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              <OptimizedAnimatedCounter value={Math.round(progressMetrics.overallProgress)} />%
            </div>
            <Progress value={progressMetrics.overallProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <OptimizedAnimatedCounter value={progressMetrics.onTrackGoals} />
            </div>
            <p className="text-xs text-muted-foreground">
              goals meeting expectations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <OptimizedAnimatedCounter value={progressMetrics.atRiskGoals} />
            </div>
            <p className="text-xs text-muted-foreground">
              goals needing attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="priorities">Priorities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Progress Over Time Chart */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Progress Trends (Last 3 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyzingTrends ? (
                <div aria-label="Loading trends chart" className="h-[300px] w-full">
                  <div className="h-full w-full animate-pulse rounded-md border border-border/50 bg-muted/20" />
                </div>
              ) : (() => {
                const option: EChartsOption = {
                  dataset: { source: progressChartData },
                  grid: { top: 24, right: 16, bottom: 32, left: 40 },
                  xAxis: { type: "category", name: "Week", nameGap: 24 },
                  yAxis: { type: "value", name: "Progress (%)", nameGap: 28, min: 0, max: 100 },
                  tooltip: {
                    trigger: "axis",
                    axisPointer: { type: "line" },
                    valueFormatter: (val) => (typeof val === "number" ? `${Math.round(val)}%` : String(val)),
                  },
                  legend: { show: false },
                  series: [
                    {
                      type: "line",
                      smooth: true,
                      showSymbol: true,
                      symbolSize: 6,
                      encode: { x: "week", y: "progress" },
                      lineStyle: { width: 2 },
                      areaStyle: { opacity: 0.08 },
                    },
                  ],
                };
                return <EChartContainer option={option} height={300} aria-label="Progress trends line chart" />;
              })()}
            </CardContent>
          </Card>

          {/* Recent Goal Activities */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Recent Goal Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {goals
                  .filter(goal => goal.dataPoints.length > 1)
                  .sort((a, b) => {
                    const aLatest = Math.max(...a.dataPoints.map(dp => dp.timestamp.getTime()));
                    const bLatest = Math.max(...b.dataPoints.map(dp => dp.timestamp.getTime()));
                    return bLatest - aLatest;
                  })
                  .slice(0, 5)
                  .map(goal => {
                    const latestPoint = goal.dataPoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
                    return (
                      <div key={goal.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{goal.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Updated {format(latestPoint.timestamp, 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={getStatusColor(goal.status)}>
                            {Math.round(goal.currentProgress)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Goal Completion Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const option: EChartsOption = {
                  dataset: { source: categoryData },
                  grid: { top: 24, right: 16, bottom: 32, left: 40 },
                  xAxis: { type: "category", name: "Category", nameGap: 24 },
                  yAxis: { type: "value", name: "Progress (%)", nameGap: 28, min: 0, max: 100 },
                  tooltip: {
                    trigger: "axis",
                    axisPointer: { type: "shadow" },
                    valueFormatter: (val) => (typeof val === "number" ? `${Math.round(val)}%` : String(val)),
                  },
                  legend: { show: false },
                  series: [
                    {
                      type: "bar",
                      encode: { x: "category", y: "progress" },
                      barWidth: "50%",
                      itemStyle: { borderRadius: [4, 4, 0, 0] },
                    },
                  ],
                };
                return <EChartContainer option={option} height={300} aria-label="Goal completion by category bar chart" />;
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Progress by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const option: EChartsOption = {
                    dataset: {
                      source: categoryData.map((d) => ({ name: d.category, value: d.progress })),
                    },
                    tooltip: {
                      trigger: "item",
                      valueFormatter: (val) => (typeof val === "number" ? `${Math.round(val)}%` : String(val)),
                    },
                    legend: { bottom: 0, type: "scroll" },
                    series: [
                      {
                        type: "pie",
                        radius: ["50%", "70%"],
                        avoidLabelOverlap: true,
                        label: {
                          show: true,
                          formatter: "{b}: {c}%",
                        },
                        encode: { itemName: "name", value: "value" },
                      },
                    ],
                  };
                  return <EChartContainer option={option} height={250} aria-label="Progress by category donut chart" />;
                })()}
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map((category, index) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category.category}</span>
                        <Badge variant="outline">{category.count} goals</Badge>
                      </div>
                      <Progress value={category.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{category.progress}% average progress</span>
                        <span>{category.achieved} achieved</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="priorities" className="space-y-4">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Priority Goals Requiring Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getPriorityGoals().map((goal, index) => (
                  <div key={goal.id} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{goal.title}</h4>
                        <p className="text-sm text-muted-foreground">{goal.category}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={goal.daysUntilTarget < 30 ? "destructive" : "outline"}>
                          {goal.daysUntilTarget > 0 ? `${goal.daysUntilTarget} days left` : 'Overdue'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(goal.currentProgress)}%</span>
                      </div>
                      <Progress value={goal.currentProgress} className="h-2" />
                    </div>
                    {goal.daysUntilTarget < 0 && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        ⚠️ This goal is past its target date and may need review or extension.
                      </div>
                    )}
                    {goal.urgencyScore > 2 && goal.daysUntilTarget > 0 && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        📈 Consider increasing intervention intensity to meet target date.
                      </div>
                    )}
                  </div>
                ))}
                {getPriorityGoals().length === 0 && (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-lg font-medium text-green-600">All goals are on track!</p>
                    <p className="text-muted-foreground">Great work keeping {student.name}'s progress moving forward.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};