import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import BimProcessor from "./pages/BimProcessor";
import DigitalTwinViewer from "./pages/DigitalTwinViewer";
import { Analytics } from "./pages/Analytics";
import ModelComparison from '@/pages/ModelComparison';
import MultiComparison from './pages/MultiComparison';
import KnowledgeGraph from './pages/KnowledgeGraph';
import AdminUsers from './pages/AdminUsers';
import { AdminRoute } from './components/AdminRoute';
import { SensorManagement } from './pages/SensorManagement';
import { ApiHealthDashboard } from './pages/ApiHealthDashboard';
import AlertConfiguration from './pages/AlertConfiguration';
import CobieAssetManagement from './pages/CobieAssetManagement';
import GlobalOverview from './pages/GlobalOverview';
import IDSValidation from './pages/IDSValidation';
import BsddEnrichment from './pages/BsddEnrichment';
import ProjectDetail from './pages/ProjectDetail';

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path="/processor" component={BimProcessor} />
      <Route path="/viewer" component={DigitalTwinViewer} />
      <Route path="/analytics" component={Analytics} />
        <Route path="/comparison" component={ModelComparison} />
          <Route path="/multi-comparison" component={MultiComparison} />
          <Route path="/knowledge-graph" component={KnowledgeGraph} />
          <Route path="/sensors" component={SensorManagement} />
          <Route path="/api-health" component={ApiHealthDashboard} />
          <Route path="/alerts" component={AlertConfiguration} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/projects/:id/cobie" component={CobieAssetManagement} />
        <Route path="/projects/:id/ids-validation" component={IDSValidation} />
        <Route path="/projects/:id/bsdd-enrichment" component={BsddEnrichment} />
        <Route path="/global-overview" component={GlobalOverview} />
          <Route path="/admin/users">
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
