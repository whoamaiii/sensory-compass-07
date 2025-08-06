import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Eye, EyeOff, Clock, TrendingUp } from "lucide-react";
import { alertSystem, AlertHistoryEntry } from "@/lib/alertSystem";
import { TriggerAlert } from "@/lib/patternAnalysis";
import { toast } from "sonner";
import { logger } from '@/lib/logger';

interface AlertManagerProps {
  studentId?: string;
  showOnlyUnresolved?: boolean;
}

export const AlertManager = ({ studentId, showOnlyUnresolved = false }: AlertManagerProps) => {
  const [alerts, setAlerts] = useState<AlertHistoryEntry[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertHistoryEntry | null>(null);
  const [resolveNotes, setResolveNotes] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const loadAlerts = useCallback(() => {
    let alertList: AlertHistoryEntry[];
    
    if (studentId) {
      alertList = alertSystem.getStudentAlerts(studentId);
    } else {
      alertList = alertSystem.getAllAlerts();
    }

    if (showOnlyUnresolved) {
      alertList = alertList.filter(alert => !alert.resolved);
    }

    // Sort by severity and timestamp
    alertList.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.alert.severity] - severityOrder[a.alert.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.alert.timestamp.getTime() - a.alert.timestamp.getTime();
    });

    setAlerts(alertList);
  }, [studentId, showOnlyUnresolved]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleMarkAsViewed = (alertId: string) => {
    alertSystem.markAlertAsViewed(alertId);
    loadAlerts();
    toast.success('Alert marked as viewed');
  };

  /**
   * Handle alert resolution with proper cleanup and state management.
   * Ensures dialog state is properly reset after resolution.
   */
  const handleResolveAlert = () => {
    if (!selectedAlert) return;
    
    setIsResolving(true);
    
    try {
      alertSystem.resolveAlert(
        selectedAlert.alert.id, 
        'Teacher', // In a real app, this would be the current user
        resolveNotes.trim() || undefined
      );
      
      // Clean up state after successful resolution
      setSelectedAlert(null);
      setResolveNotes('');
      loadAlerts();
      toast.success('Alert resolved successfully');
    } catch (error) {
      logger.error('Failed to resolve alert', error);
      toast.error('Failed to resolve alert. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'concern':
        return <AlertTriangle className="h-4 w-4" />;
      case 'improvement':
        return <TrendingUp className="h-4 w-4" />;
      case 'pattern':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>{showOnlyUnresolved ? 'No unresolved alerts' : 'No alerts to display'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alertEntry) => (
        <Card key={alertEntry.alert.id} className={`transition-all ${
          !alertEntry.viewed ? 'ring-2 ring-primary/20' : ''
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getSeverityIcon(alertEntry.alert.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base font-semibold">
                      {alertEntry.alert.title}
                    </CardTitle>
                    <Badge variant={getSeverityColor(alertEntry.alert.severity) as "default" | "secondary" | "destructive" | "outline" | null | undefined}>
                      {alertEntry.alert.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {alertEntry.alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {alertEntry.alert.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{alertEntry.alert.timestamp.toLocaleDateString()}</span>
                    <span>{alertEntry.alert.dataPoints} data points</span>
                    {alertEntry.resolved && (
                      <Badge variant="outline" className="text-green-600">
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!alertEntry.viewed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsViewed(alertEntry.alert.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {!alertEntry.resolved && (
                  <Dialog 
                    open={selectedAlert?.alert.id === alertEntry.alert.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setSelectedAlert(alertEntry);
                      } else {
                        setSelectedAlert(null);
                        setResolveNotes('');
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        Resolve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Resolve Alert</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Alert Details</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {selectedAlert?.alert.description}
                          </p>
                          
                          {selectedAlert?.alert.recommendations && selectedAlert.alert.recommendations.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {selectedAlert.alert.recommendations.map((rec, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-primary">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Resolution Notes (Optional)
                          </label>
                          <Textarea
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                            placeholder="Describe actions taken or observations..."
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleResolveAlert}
                            disabled={isResolving}
                          >
                            {isResolving ? 'Resolving...' : 'Resolve Alert'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          
          {alertEntry.alert.recommendations && alertEntry.alert.recommendations.length > 0 && (
            <CardContent className="pt-0">
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2 text-foreground">
                  Recommended Actions:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {alertEntry.alert.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {alertEntry.resolved && alertEntry.resolvedNotes && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-green-800 mb-1">
                    Resolution Notes:
                  </h5>
                  <p className="text-sm text-green-700">{alertEntry.resolvedNotes}</p>
                  <p className="text-xs text-green-600 mt-1">
                    Resolved by {alertEntry.resolvedBy} on {alertEntry.resolvedAt?.toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};