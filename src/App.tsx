import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import CompanyDetails from "./pages/CompanyDetails";
import Runs from "./pages/Runs";
import RunDetails from "./pages/RunDetails";
import PocLeads from "./pages/PocLeads";
import CreateRun from "./pages/CreateRun";
import NotFound from "./pages/NotFound";
import PipelineMonitor from "./pages/PipelineMonitor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetails />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/runs/:id" element={<RunDetails />} />
              <Route path="/poc-leads" element={<PocLeads />} />
              <Route path="/create-run" element={<CreateRun />} />
              <Route path="/pipeline" element={<PipelineMonitor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
