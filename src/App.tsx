import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const AddStudent = lazy(() => import("./pages/AddStudent"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const TrackStudent = lazy(() => import("./pages/TrackStudent"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { ErrorWrapper } from "./components/ErrorWrapper";

const queryClient = new QueryClient();

const App = () => (
  <ErrorWrapper>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-student" element={<AddStudent />} />
              <Route path="/student/:studentId" element={<StudentProfile />} />
              <Route path="/track/:studentId" element={<TrackStudent />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorWrapper>
);

export default App;
