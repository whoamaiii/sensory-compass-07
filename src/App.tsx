import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import "@/lib/analyticsConfigOverride"; // Apply sensitive analytics config in dev mode

const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const AddStudent = lazy(() => import("./pages/AddStudent").then(m => ({ default: m.AddStudent })));
const StudentProfile = lazy(() => import("./pages/StudentProfile").then(m => ({ default: m.StudentProfile })));
const TrackStudent = lazy(() => import("./pages/TrackStudent").then(m => ({ default: m.TrackStudent })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));
const EnvironmentalCorrelationsTest = lazy(() => import("./pages/EnvironmentalCorrelationsTest"));
import { ErrorWrapper } from "./components/ErrorWrapper";

const queryClient = new QueryClient();

const App = () => (
  <ErrorWrapper>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-student" element={<AddStudent />} />
              <Route path="/student/:studentId" element={<StudentProfile />} />
              <Route path="/track/:studentId" element={<TrackStudent />} />
              <Route path="/environmental-correlations-test" element={<EnvironmentalCorrelationsTest />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorWrapper>
);

export { App };
