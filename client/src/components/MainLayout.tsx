import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Menu, X } from "lucide-react";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeModule?: "processor" | "viewer";
  onRunClick?: () => void;
}

export default function MainLayout({ children, sidebar, activeModule, onRunClick }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [, setLocation] = useLocation();

  const handleModuleChange = (value: string) => {
    if (value === "processor") {
      setLocation("/processor");
    } else if (value === "viewer") {
      setLocation("/viewer");
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <img 
            src="/datawise-logo.png" 
            alt="DATAWiSE Logo" 
            className="h-8 cursor-pointer"
            onClick={() => setLocation("/")}
          />
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-sm">
              File
            </Button>
            <Button variant="ghost" size="sm" className="text-sm">
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-sm">
              View
            </Button>
            <Button variant="ghost" size="sm" className="text-sm">
              Help
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {activeModule && (
            <Tabs value={activeModule} onValueChange={handleModuleChange}>
              <TabsList className="bg-muted">
                <TabsTrigger value="processor" className="text-sm">BIM Data Processor</TabsTrigger>
                <TabsTrigger value="viewer" className="text-sm">Digital Twin Viewer</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {onRunClick && (
            <Button 
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={onRunClick}
            >
              <Play className="mr-2 h-4 w-4" />
              Run
            </Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar && sidebarOpen && (
          <aside className="w-64 border-r bg-card overflow-y-auto shadow-sm">
            {sidebar}
          </aside>
        )}

        {/* Main Canvas */}
        <main className="flex-1 overflow-hidden bg-muted/30 relative">
          {/* Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <img 
              src="/datawise-logo.png"
              alt=""
              className="w-2/3 max-w-4xl opacity-10 select-none"
            />
          </div>
          
          {/* Content */}
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
