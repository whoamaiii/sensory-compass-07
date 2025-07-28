import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { AddStudent } from "./pages/AddStudent";
import { StudentProfile } from "./pages/StudentProfile";
import { TrackStudent } from "./pages/TrackStudent";
import NotFound from "./pages/NotFound";
import { ErrorWrapper } from "./components/ErrorWrapper";

const queryClient = new QueryClient();

const App = () => (
  <ErrorWrapper>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-student" element={<AddStudent />} />
            <Route path="/student/:studentId" element={<StudentProfile />} />
            <Route path="/track/:studentId" element={<TrackStudent />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorWrapper>
);

export default App;
