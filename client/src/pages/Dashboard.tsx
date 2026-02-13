import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  FileUp,
  Box as BoxIcon,
  FolderOpen,
  Plus,
  ArrowRight,
  Activity,
  Database,
  Loader2,
  Shield,
  BarChart3,
  Network,
  Wifi,
  Package,
} from "lucide-react";

/**
 * Main application dashboard
 * Shows BIM projects and access to main modules
 */
export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: projects, isLoading: projectsLoading } = trpc.bimProjects.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* DATAWiSE watermark background */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="text-[40rem] font-bold text-gray-200/20 select-none whitespace-nowrap">
          DATAWiSE
        </div>
      </div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 relative z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                BIM Digital Twin Platform
              </h1>
              <p className="text-gray-600 mt-2">
                BIM data processing and digital twin visualization
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-600">{user.email}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Main modules */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group bg-white border border-gray-200">
            <Link href="/processor">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                    <FileUp className="w-8 h-8 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-900">BIM Data Processor</CardTitle>
                    <CardDescription className="mt-1 text-gray-600">
                      Visual IFC file processing with node-based workflows
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-[#7fb069] transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span>Real IDS validation against specifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-500" />
                    <span>Semantic enrichment with bSDD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span>Data quality scoring</span>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer group bg-white border border-gray-200">
            <Link href="/viewer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                    <BoxIcon className="w-8 h-8 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-900">Digital Twin Viewer</CardTitle>
                    <CardDescription className="mt-1 text-gray-600">
                      3D visualization of digital twins with real-time data
                    </CardDescription>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-[#7fb069] transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <BoxIcon className="w-4 h-4 text-gray-500" />
                    <span>High-performance 3D rendering</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span>Real-time data integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-500" />
                    <span>Sustainability analysis and KPIs</span>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Recent projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">BIM Projects</h2>
            <Link href="/projects/new">
              <Button className="bg-[#7fb069] hover:bg-[#6fa059] text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>

          {projectsLoading ? (
            <Card className="p-12 bg-white border border-gray-200">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            </Card>
          ) : projects && projects.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-200">
                  <Link href={`/projects/${project.id}`}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded">
                          <FolderOpen className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate text-gray-900">
                            {project.name}
                          </CardTitle>
                          {project.description && (
                            <CardDescription className="mt-1 line-clamp-2 text-gray-600">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-gray-600">
                        Updated:{" "}
                        {new Date(project.updatedAt).toLocaleDateString("en-US")}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 bg-white border border-gray-200">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No projects yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first BIM project to start processing IFC models
                </p>
                <Link href="/projects/new">
                  <Button className="bg-[#7fb069] hover:bg-[#6fa059] text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Project
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Additional tools */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Tools</h2>
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group bg-white border border-gray-200">
              <Link href="/analytics">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                      <BarChart3 className="w-6 h-6 text-gray-700" />
                    </div>
                    <CardTitle className="text-base text-gray-900">Analytics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs text-gray-600">
                    KPI dashboard and system metrics
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* COBie Asset Management */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer group bg-white border border-gray-200">
              <Link href="/cobie">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                      <Package className="w-6 h-6 text-gray-700" />
                    </div>
                    <CardTitle className="text-base text-gray-900">COBie Asset Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs text-gray-600">
                    Import and manage non-geometric COBie asset data
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* Knowledge Graph */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer group bg-white border border-gray-200">
              <Link href="/knowledge-graph">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                      <Network className="w-6 h-6 text-gray-700" />
                    </div>
                    <CardTitle className="text-base text-gray-900">Knowledge Graph</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs text-gray-600">
                    Interactive relationship visualization
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>

            {/* IoT Sensors */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer group bg-white border border-gray-200">
              <Link href="/iot">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                      <Wifi className="w-6 h-6 text-gray-700" />
                    </div>
                    <CardTitle className="text-base text-gray-900">IoT Sensors</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs text-gray-600">
                    Real-time sensor monitoring and alerts
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
