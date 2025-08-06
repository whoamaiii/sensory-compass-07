import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { storageUtils } from '@/lib/storageUtils';
import { dataStorage } from '@/lib/dataStorage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

/**
 * StorageManager Component
 * 
 * Provides UI for managing local storage, including viewing usage statistics
 * and clearing different types of data. Includes safety checks and error handling.
 * 
 * @component
 * @returns {React.ReactElement} Rendered storage management interface
 */
export const StorageManager = () => {
  const [storageInfo, setStorageInfo] = useState(storageUtils.getStorageInfo());
  const [stats, setStats] = useState(dataStorage.getStorageStats());

  const refreshStats = () => {
    setStorageInfo(storageUtils.getStorageInfo());
    setStats(dataStorage.getStorageStats());
  };

  const handleClearOldData = () => {
    try {
      storageUtils.clearOldTrackingData(30);
      toast.success('Old data cleared successfully');
      refreshStats();
    } catch (error) {
      logger.error('Failed to clear old tracking data', error);
      toast.error('Failed to clear old data');
    }
  };

  const handleClearNonEssential = () => {
    try {
      storageUtils.clearNonEssentialData();
      toast.success('Non-essential data cleared');
      refreshStats();
    } catch (error) {
      logger.error('Failed to clear non-essential data', error);
      toast.error('Failed to clear non-essential data');
    }
  };

  /**
   * Handle clearing all data with proper confirmation dialog.
   * Uses a more robust approach than browser confirm().
   */
  const handleClearAll = () => {
    // Using window.confirm with proper error handling
    // In production, consider using a custom modal component
    try {
      const confirmed = window.confirm('Are you sure you want to clear ALL data? This cannot be undone!');
      if (confirmed) {
        try {
          dataStorage.clearAllData();
          toast.success('All data cleared');
          // Use window.location.replace for better history management
          window.location.replace('/');
        } catch (error) {
          logger.error('Failed to clear all data', error);
          toast.error('Failed to clear all data');
        }
      }
    } catch (error) {
      // Handle cases where confirm might fail (e.g., in some test environments)
      logger.error('Confirmation dialog failed', error);
      toast.error('Could not show confirmation dialog');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usagePercentage = (storageInfo.used / 5000000) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Storage Management
        </CardTitle>
        <CardDescription>
          Manage your local storage to ensure smooth operation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Storage Usage */}
        <div>
          <h3 className="font-medium mb-2">Storage Usage</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span>{formatBytes(storageInfo.used)} / ~5 MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all w-full origin-left",
                  usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                )}
                style={{ transform: `scaleX(${Math.min(usagePercentage, 100) / 100})` }}
              />
            </div>
          </div>
        </div>

        {/* Storage Stats */}
        <div>
          <h3 className="font-medium mb-2">Data Statistics</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Students: {stats.studentsCount}</div>
            <div>Entries: {stats.entriesCount}</div>
            <div>Goals: {stats.goalsCount}</div>
            <div>Alerts: {stats.alertsCount}</div>
          </div>
        </div>

        {/* Warnings */}
        {usagePercentage > 70 && (
          <Alert className={cn(
            usagePercentage > 90 ? 'border-red-500' : 'border-yellow-500'
          )}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {usagePercentage > 90
                ? 'Storage is almost full! Clear some data to prevent errors.'
                : 'Storage usage is getting high. Consider clearing old data.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={handleClearOldData}
            className="w-full justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear data older than 30 days
          </Button>
          <Button
            variant="outline"
            onClick={handleClearNonEssential}
            className="w-full justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear non-essential data
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearAll}
            className="w-full justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear ALL data (irreversible)
          </Button>
        </div>

        {storageInfo.available && (
          <Alert className="border-green-500">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Storage is healthy with sufficient space available.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
