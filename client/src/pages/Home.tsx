import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ModelCard } from '@/components/ModelCard';
import { WelcomeTutorial } from '@/components/WelcomeTutorial';
import { trpc } from "@/lib/trpc";
import { useIfcModel } from "@/contexts/IfcModelContext";
import { useLocation } from "wouter";
import { 
  FileUp, 
  Box, 
  Database, 
  Loader2,
  FolderOpen,
  Search,
  X,
  BarChart3,
  Network,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { setCurrentModel } = useIfcModel();
  const utils = trpc.useUtils();

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [schemaFilter, setSchemaFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Get saved models
  const { data: modelsData, isLoading: modelsLoading } = trpc.ifc.listSavedModels.useQuery(
    {},
    { enabled: isAuthenticated }
  );

  const handleCompare = (modelId: number) => {
    // Navigate to comparison page with selected model
    setLocation(`/comparison?model=${modelId}`);
  };

  const handleViewIn3D = async (modelId: number) => {
    try {
      // Get model from DB using utils.fetch
      const result = await utils.ifc.getSavedModel.fetch({ modelId });
      
      if (result.success && result.model) {
        const model = result.model;
        
        // Convert DB elements to IfcModel format
        const ifcModel = {
          elements: model.elements.map(el => ({
            expressId: el.expressId,
            type: el.ifcType,
            name: el.name || undefined,
            globalId: el.globalId || undefined,
            properties: el.properties || undefined,
          })),
        };

        // Save to context
        setCurrentModel(ifcModel, {
          schema: model.ifcSchema,
          fileUrl: model.ifcFileUrl,
          fileName: model.name,
          statistics: model.statistics,
        });

        // Navigate to viewer
        setLocation('/viewer');
      }
    } catch (error) {
      console.error('Error loading model:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const models = modelsData?.models || [];

  // Filtering logic
  const filteredModels = useMemo(() => {
    let filtered = [...models];

    // Text search filter (file name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(model =>
        model.name.toLowerCase().includes(query)
      );
    }

    // IFC schema filter
    if (schemaFilter !== "all") {
      filtered = filtered.filter(model => model.ifcSchema === schemaFilter);
    }

    // Date range filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(model => {
        const modelDate = new Date(model.createdAt);
        return modelDate >= filterDate;
      });
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "most_elements":
        filtered.sort((a, b) => (b.elementCount || 0) - (a.elementCount || 0));
        break;
      case "least_elements":
        filtered.sort((a, b) => (a.elementCount || 0) - (b.elementCount || 0));
        break;
      case "name_asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return filtered;
  }, [models, searchQuery, schemaFilter, dateFilter, sortBy]);

  const hasActiveFilters = searchQuery || schemaFilter !== "all" || dateFilter !== "all" || sortBy !== "newest";

  const clearFilters = () => {
    setSearchQuery("");
    setSchemaFilter("all");
    setDateFilter("all");
    setSortBy("newest");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <WelcomeTutorial />
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/datawise-logo.png" alt="DATAWiSE" className="h-8" />
            <div>
              <h1 className="text-xl font-bold">BIM Digital Twin Platform</h1>
              <p className="text-xs text-muted-foreground">
                BIM data processing and digital twin visualization
              </p>
            </div>
          </div>
          {isAuthenticated && user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user.name}</span>
            </div>
          )}
        </div>
      </header>

      <main className="container py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* BIM Data Processor Card */}
            <a
              href="/processor"
              className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FileUp className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">BIM Data Processor</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Visual IFC file processing with node-based workflows
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Real IDS validation against specifications
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Semantic enrichment with bSDD
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Data quality scoring
                    </li>
                  </ul>
                </div>
              </div>
            </a>

            {/* Digital Twin Viewer Card */}
            <a
              href="/viewer"
              className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Box className="h-8 w-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Digital Twin Viewer</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    3D visualization of digital twins with real-time data
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      High-performance 3D rendering
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Real-time data integration
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Sustainability analysis and KPIs
                    </li>
                  </ul>
                </div>
              </div>
            </a>

            {/* Analytics Dashboard Card */}
            <a
              href="/analytics"
              className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Analytics Dashboard</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Key metrics and trends from your BIM projects
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Model and element KPIs
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Temporal trend charts
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Data quality insights
                    </li>
                  </ul>
                </div>
              </div>
            </a>

            {/* Knowledge Graph Card */}
            <a
              href="/knowledge-graph"
              className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Network className="h-8 w-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">Knowledge Graph</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Interactive relationship visualization between BIM elements
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Spatial and functional relationships
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Interactive graph exploration
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-xs">▸</span>
                      Dependency analysis
                    </li>
                  </ul>
                </div>
              </div>
            </a>
          </div>
        </section>

        {/* Saved Models Section */}
        {isAuthenticated && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Saved Models</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse and manage your processed IFC models
                </p>
              </div>
              <Button onClick={() => setLocation('/processor')}>
                <FileUp className="mr-2 h-4 w-4" />
                Process New Model
              </Button>
            </div>

            {/* Filters and Search */}
            <div className="bg-card rounded-lg border p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Schema Filter */}
                <Select value={schemaFilter} onValueChange={setSchemaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="IFC Schema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schemas</SelectItem>
                    <SelectItem value="IFC2X3">IFC2X3</SelectItem>
                    <SelectItem value="IFC4">IFC4</SelectItem>
                    <SelectItem value="IFC4X3">IFC4X3</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Filter */}
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="most_elements">Most Elements</SelectItem>
                    <SelectItem value="least_elements">Least Elements</SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Active filters: {filteredModels.length} of {models.length} models
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-xs"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>

            {/* Models Grid */}
            {modelsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredModels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    onViewIn3D={handleViewIn3D}
                    onCompare={handleCompare}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {hasActiveFilters ? 'No models match your filters' : 'No models yet'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? 'Try adjusting your search criteria'
                    : 'Process your first IFC file to get started'}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => setLocation('/processor')}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Process IFC File
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {/* Not authenticated message */}
        {!isAuthenticated && (
          <section className="text-center py-12">
            <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Welcome to BIM Digital Twin Platform</h3>
            <p className="text-muted-foreground mb-6">
              Sign in to access your models and start processing BIM data
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
