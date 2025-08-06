import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html, Box, Sphere } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmotionEntry, SensoryEntry, TrackingEntry } from '@/types/student';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Eye, RotateCcw, ZoomIn, ZoomOut, Move3d } from 'lucide-react';
import * as THREE from 'three';

interface Visualization3DProps {
  emotions: EmotionEntry[];
  sensoryInputs: SensoryEntry[];
  trackingEntries: TrackingEntry[];
  correlationData?: {
    x: string;
    y: string;
    z: string;
    correlation: number;
  }[];
}

interface DataPoint3D {
  id: string;
  x: number;
  y: number;
  z: number;
  label: string;
  category: 'emotion' | 'sensory' | 'environmental';
  intensity?: number;
  timestamp: Date;
  metadata: Record<string, string | number>;
}

interface TooltipProps {
  point: DataPoint3D;
  onClose: () => void;
}

// Tooltip component for data points
const Tooltip3D: React.FC<TooltipProps> = ({ point, onClose }) => {
  return (
    <Html>
      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="capitalize">
            {point.category}
          </Badge>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>
        <p className="font-medium">{point.label}</p>
        <div className="text-sm text-muted-foreground mt-1 space-y-1">
          <p>X: {point.x.toFixed(2)}</p>
          <p>Y: {point.y.toFixed(2)}</p>
          <p>Z: {point.z.toFixed(2)}</p>
          {point.intensity && <p>Intensity: {point.intensity}</p>}
        </div>
      </div>
    </Html>
  );
};

// Data point component
const DataPoint: React.FC<{
  position: [number, number, number];
  color: string;
  size: number;
  point: DataPoint3D;
  onHover: (point: DataPoint3D | null) => void;
  isHighlighted: boolean;
}> = ({ position, color, size, point, onHover, isHighlighted }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = hovered || isHighlighted ? 1.5 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
      
      if (hovered) {
        meshRef.current.rotation.y += 0.02;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(point);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
      }}
    >
      <sphereGeometry args={[size, 32, 16]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={hovered || isHighlighted ? 0.5 : 0.2}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
};

// Axis labels
const AxisLabels: React.FC<{ xLabel: string; yLabel: string; zLabel: string }> = ({ 
  xLabel, 
  yLabel, 
  zLabel 
}) => {
  const size = 5;
  
  return (
    <>
      {/* X Axis */}
      <Text
        position={[size + 0.5, 0, 0]}
        fontSize={0.5}
        color="var(--foreground)"
        anchorX="left"
      >
        {xLabel}
      </Text>
      <mesh position={[size / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.02, size, 0.02]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Y Axis */}
      <Text
        position={[0, size + 0.5, 0]}
        fontSize={0.5}
        color="var(--foreground)"
        anchorX="center"
      >
        {yLabel}
      </Text>
      <mesh position={[0, size / 2, 0]}>
        <boxGeometry args={[0.02, size, 0.02]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>

      {/* Z Axis */}
      <Text
        position={[0, 0, size + 0.5]}
        fontSize={0.5}
        color="var(--foreground)"
        anchorX="center"
      >
        {zLabel}
      </Text>
      <mesh position={[0, 0, size / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.02, size, 0.02]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
    </>
  );
};

// Camera controls component
const CameraControls: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const { camera } = useThree();
  
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          camera.position.set(10, 10, 10);
          camera.lookAt(0, 0, 0);
          onReset();
        }}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const Visualization3D: React.FC<Visualization3DProps> = ({
  emotions,
  sensoryInputs,
  trackingEntries,
  correlationData
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint3D | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<DataPoint3D | null>(null);
  const [xAxis, setXAxis] = useState<string>('emotionIntensity');
  const [yAxis, setYAxis] = useState<string>('sensoryResponse');
  const [zAxis, setZAxis] = useState<string>('time');
  const [colorBy, setColorBy] = useState<string>('category');
  const [pointSize, setPointSize] = useState<number>(0.2);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Process data into 3D points
  const dataPoints = useMemo((): DataPoint3D[] => {
    const points: DataPoint3D[] = [];
    
    // Create a map of timestamps to aggregate data
    const timeMap = new Map<string, {
      emotions: EmotionEntry[];
      sensory: SensoryEntry[];
      tracking: TrackingEntry;
    }>();

    // Aggregate data by timestamp
    trackingEntries.forEach(entry => {
      const key = entry.timestamp.toISOString();
      const relatedEmotions = emotions.filter(e => 
        Math.abs(e.timestamp.getTime() - entry.timestamp.getTime()) < 3600000 // Within 1 hour
      );
      const relatedSensory = sensoryInputs.filter(s =>
        Math.abs(s.timestamp.getTime() - entry.timestamp.getTime()) < 3600000
      );
      
      timeMap.set(key, {
        emotions: relatedEmotions,
        sensory: relatedSensory,
        tracking: entry
      });
    });

    // Convert to 3D points
    timeMap.forEach((data, key) => {
      const avgEmotionIntensity = data.emotions.length > 0
        ? data.emotions.reduce((sum, e) => sum + e.intensity, 0) / data.emotions.length
        : 5;
      
      const sensorySeeking = data.sensory.filter(s => s.response.includes('seeking')).length;
      const sensoryAvoiding = data.sensory.filter(s => s.response.includes('avoiding')).length;
      const sensoryScore = sensorySeeking - sensoryAvoiding;
      
      const timeValue = new Date(key).getTime() / 1000 / 3600; // Convert to hours
      
      points.push({
        id: `tracking-${key}`,
        x: xAxis === 'emotionIntensity' ? avgEmotionIntensity : 
           xAxis === 'sensoryResponse' ? sensoryScore :
           xAxis === 'time' ? timeValue : 0,
        y: yAxis === 'emotionIntensity' ? avgEmotionIntensity :
           yAxis === 'sensoryResponse' ? sensoryScore :
           yAxis === 'time' ? timeValue : 0,
        z: zAxis === 'emotionIntensity' ? avgEmotionIntensity :
           zAxis === 'sensoryResponse' ? sensoryScore :
           zAxis === 'time' ? timeValue : 0,
        label: `Session ${new Date(key).toLocaleDateString()}`,
        category: 'environmental',
        intensity: avgEmotionIntensity,
        timestamp: new Date(key),
        metadata: {
          emotions: data.emotions.length,
          sensory: data.sensory.length,
          avgIntensity: avgEmotionIntensity,
          sensoryScore
        }
      });
    });

    // Normalize coordinates to -5 to 5 range
    const normalize = (values: number[]) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      return values.map(v => ((v - min) / range) * 10 - 5);
    };

    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    const zValues = points.map(p => p.z);

    const normalizedX = normalize(xValues);
    const normalizedY = normalize(yValues);
    const normalizedZ = normalize(zValues);

    points.forEach((point, i) => {
      point.x = normalizedX[i];
      point.y = normalizedY[i];
      point.z = normalizedZ[i];
    });

    return points;
  }, [emotions, sensoryInputs, trackingEntries, xAxis, yAxis, zAxis]);

  // Filter points based on category
  const filteredPoints = useMemo(() => {
    if (filterCategory === 'all') return dataPoints;
    return dataPoints.filter(p => p.category === filterCategory);
  }, [dataPoints, filterCategory]);

  // Get color for data point
  const getPointColor = (point: DataPoint3D): string => {
    if (colorBy === 'category') {
      switch (point.category) {
        case 'emotion': return '#10B981';
        case 'sensory': return '#3B82F6';
        case 'environmental': return '#F59E0B';
        default: return '#6B7280';
      }
    } else if (colorBy === 'intensity' && point.intensity) {
      const intensity = point.intensity / 10;
      return `hsl(${120 - intensity * 120}, 70%, 50%)`;
    }
    return '#6B7280';
  };

  const axisOptions = [
    { value: 'emotionIntensity', label: 'Emotion Intensity' },
    { value: 'sensoryResponse', label: 'Sensory Response' },
    { value: 'time', label: 'Time' }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          3D Correlation Visualization
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">X Axis</label>
              <Select value={xAxis} onValueChange={setXAxis}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {axisOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Y Axis</label>
              <Select value={yAxis} onValueChange={setYAxis}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {axisOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Z Axis</label>
              <Select value={zAxis} onValueChange={setZAxis}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {axisOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Color By</label>
              <Select value={colorBy} onValueChange={setColorBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="intensity">Intensity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Filter Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="emotion">Emotions</SelectItem>
                  <SelectItem value="sensory">Sensory</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">
                Point Size: {pointSize.toFixed(2)}
              </label>
              <Slider
                value={[pointSize]}
                onValueChange={([value]) => setPointSize(value)}
                min={0.1}
                max={0.5}
                step={0.05}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* 3D Visualization */}
        <div className="relative w-full h-[600px] bg-gray-50 rounded-lg overflow-hidden">
          <Canvas
            camera={{ position: [10, 10, 10], fov: 50 }}
            className="w-full h-full"
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            {/* Grid helper */}
            <gridHelper args={[20, 20, 0x888888, 0xcccccc]} />
            
            {/* Axes */}
            <AxisLabels 
              xLabel={axisOptions.find(o => o.value === xAxis)?.label || ''}
              yLabel={axisOptions.find(o => o.value === yAxis)?.label || ''}
              zLabel={axisOptions.find(o => o.value === zAxis)?.label || ''}
            />
            
            {/* Data points */}
            {filteredPoints.map((point) => (
              <DataPoint
                key={point.id}
                position={[point.x, point.y, point.z]}
                color={getPointColor(point)}
                size={pointSize}
                point={point}
                onHover={setHoveredPoint}
                isHighlighted={selectedPoint?.id === point.id}
              />
            ))}
            
            {/* Tooltip */}
            {hoveredPoint && !selectedPoint && (
              <Tooltip3D 
                point={hoveredPoint} 
                onClose={() => setHoveredPoint(null)} 
              />
            )}
            
            {/* Selected point tooltip */}
            {selectedPoint && (
              <Tooltip3D 
                point={selectedPoint} 
                onClose={() => setSelectedPoint(null)} 
              />
            )}
            
            {/* Controls */}
            <OrbitControls 
              enableDamping
              dampingFactor={0.05}
              enablePan
              panSpeed={0.5}
              rotateSpeed={0.5}
              zoomSpeed={0.5}
              minDistance={5}
              maxDistance={50}
            />
            
            <CameraControls onReset={() => {
              setHoveredPoint(null);
              setSelectedPoint(null);
            }} />
          </Canvas>
          
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <h4 className="font-medium text-sm mb-2">Legend</h4>
            <div className="space-y-1">
              {colorBy === 'category' && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span className="text-xs">Emotions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                    <span className="text-xs">Sensory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                    <span className="text-xs">Environmental</span>
                  </div>
                </>
              )}
              {colorBy === 'intensity' && (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-3 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded" />
                  <span className="text-xs">Low → High</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="text-xs space-y-1">
              <p>Points: {filteredPoints.length}</p>
              <p>Total Sessions: {trackingEntries.length}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};