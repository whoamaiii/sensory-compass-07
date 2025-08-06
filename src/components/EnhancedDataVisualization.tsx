
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmotionEntry, SensoryEntry } from '@/types/student';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTheme } from 'next-themes'; // Assuming next-themes for theme management

interface DataPoint {
    date: string;
    [key: string]: number | string;
}

interface EnhancedDataVisualizationProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  studentName: string;
}

const processChartData = (entries: (EmotionEntry | SensoryEntry)[], type: 'emotions' | 'sensory', days: number = 30): DataPoint[] => {
    if (!entries || entries.length === 0) return [];

    const dataMap = new Map<string, DataPoint>();
    const nameKey = type === 'emotions' ? 'emotion' : 'sensoryType';
    const uniqueNames = [...new Set(entries.map(e => e[nameKey]))];

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const dailyData: DataPoint = { date: dateString };
        uniqueNames.forEach(name => { dailyData[name] = 0; });
        dataMap.set(dateString, dailyData);
    }

    entries.forEach(entry => {
        const dateString = new Date(entry.timestamp).toISOString().split('T')[0];
        if (dataMap.has(dateString)) {
            const dayData = dataMap.get(dateString)!;
            const name = entry[nameKey];
            dayData[name] = (dayData[name] as number || 0) + (entry.intensity || 1);
        }
    });

    return Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const EnhancedDataVisualization: React.FC<EnhancedDataVisualizationProps> = ({ emotions, sensoryInputs, studentName }) => {
    const { theme } = useTheme();
    const [dataType, setDataType] = useState<'emotions' | 'sensory'>('emotions');
    const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

    const emotionData = useMemo(() => processChartData(emotions, 'emotions'), [emotions]);
    const sensoryData = useMemo(() => processChartData(sensoryInputs, 'sensory'), [sensoryInputs]);

    const activeData = dataType === 'emotions' ? emotionData : sensoryData;
    const uniqueKeys = activeData.length > 0 ? Object.keys(activeData[0]).filter(k => k !== 'date') : [];

    useEffect(() => {
        setSelectedSeries(uniqueKeys.length > 0 ? uniqueKeys[0] : null);
    }, [dataType, activeData, uniqueKeys]);

    if (activeData.length === 0) {
        return (
            <Card className="p-6 font-sans shadow-lg bg-card">
                <div className="flex justify-center items-center h-full">
                    <div className="text-center text-muted-foreground">
                        <h3 className="text-lg font-semibold">No data to display</h3>
                        <p className="text-sm">There is no {dataType} data available for {studentName}.</p>
                    </div>
                </div>
            </Card>
        );
    }

    const colors = theme === 'dark' 
        ? ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb923c'] 
        : ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f97316'];

    return (
        <Card className="p-6 font-sans shadow-lg bg-card">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-card-foreground">Enhanced Data Insights for {studentName}</h2>
                    <p className="text-muted-foreground">Displaying {dataType}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setDataType('emotions')} variant={dataType === 'emotions' ? 'default' : 'secondary'}>Emotions</Button>
                    <Button onClick={() => setDataType('sensory')} variant={dataType === 'sensory' ? 'default' : 'secondary'}>Sensory</Button>
                </div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={activeData}>
                        <defs>
                            {uniqueKeys.map((key, i) => (
                                <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0}/>
                                </linearGradient>
                            ))}
                        </defs>
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        {uniqueKeys.map((key, i) => (
                            <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} fillOpacity={1} fill={`url(#color${key})`} strokeWidth={2} />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </motion.div>
        </Card>
    );
};

