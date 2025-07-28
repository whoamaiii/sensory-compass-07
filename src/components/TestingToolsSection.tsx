import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MockDataLoader } from "@/components/MockDataLoader";
import { TestingDebugPanel } from "@/components/TestingDebugPanel";
import { Database, Bug, Beaker } from "lucide-react";

/**
 * TestingToolsSection Component
 * Provides easy access to testing and debugging tools
 */
export const TestingToolsSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Testing & Development Tools</h2>
        <p className="text-muted-foreground">
          Tools for testing pattern analysis features and debugging data issues
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mock Data Loader */}
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Mock Data Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Load realistic test data to explore pattern analysis features
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-primary hover:opacity-90">
                  <Database className="h-4 w-4 mr-2" />
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
          </CardContent>
        </Card>

        {/* Debug Panel */}
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              Debug Panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Advanced debugging and data inspection tools
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Bug className="h-4 w-4 mr-2" />
                  Open Debug Panel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Debug & Data Inspection</DialogTitle>
                </DialogHeader>
                <TestingDebugPanel />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Pattern Analysis Testing */}
        <Card className="bg-gradient-card border-0 shadow-soft col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-primary" />
              Pattern Analysis Testing Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To test pattern analysis features effectively:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Data Requirements:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• At least 10 tracking entries for basic patterns</li>
                    <li>• 30+ entries for correlation analysis</li>
                    <li>• 90+ entries for predictive insights</li>
                    <li>• Multiple students for comparative analysis</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Features to Test:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Emotion trend analysis</li>
                    <li>• Sensory correlation matrices</li>
                    <li>• Environmental impact patterns</li>
                    <li>• Anomaly detection alerts</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};