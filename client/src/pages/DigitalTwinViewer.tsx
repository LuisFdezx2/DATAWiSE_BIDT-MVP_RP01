import { useState, useEffect, useMemo } from "react";
import { ThreeViewer, type Measurement } from "@/components/ThreeViewer";
import { VisibilityControlPanel } from "@/components/VisibilityControlPanel";
import { MeasurementTool } from "@/components/MeasurementTool";
import type { IfcElement } from "@/services/ifcGeometryLoader";
import { useIfcModel } from "@/contexts/IfcModelContext";
import { useComparison } from "@/contexts/ComparisonContext";
import { ComparisonLegend } from "@/components/ComparisonLegend";
import { SensorPanel } from "@/components/SensorPanel";
import { CommentsPanel } from "@/components/CommentsPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Box,
  Eye,
  Layers,
  Activity,
  Network,
  Bell,
  Zap,
  Thermometer,
  AlertTriangle,
  Wrench,
  Leaf,
  BarChart3,
  Gauge,
  FlaskConical,
  TrendingUp,
  Camera,
} from "lucide-react";

export default function DigitalTwinViewer() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedElement, setSelectedElement] = useState<IfcElement | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set());
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [clearMeasurements, setClearMeasurements] = useState(false);
  const [captureScreenshot, setCaptureScreenshot] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const { currentModel, modelMetadata } = useIfcModel();
  const { comparisonData, isComparisonMode, filters, setScreenshot3D } = useComparison();

  // Leer parámetro highlight de URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightParam = params.get('highlight');
    if (highlightParam) {
      setHighlightedNodeId(highlightParam);
    }
  }, []);

  // Cargar modelo automáticamente si existe en el contexto
  useEffect(() => {
    if (currentModel && currentModel.elements.length > 0) {
      setShowViewer(true);
    }
  }, [currentModel]);

  // Calcular tipos de elementos y contadores
  const { elementTypes, elementCountsByType } = useMemo(() => {
    if (!currentModel || !currentModel.elements) {
      return { elementTypes: [], elementCountsByType: {} };
    }

    const counts: Record<string, number> = {};
    currentModel.elements.forEach((element) => {
      const type = element.type;
      counts[type] = (counts[type] || 0) + 1;
    });

    const types = Object.keys(counts).sort();
    return { elementTypes: types, elementCountsByType: counts };
  }, [currentModel]);

  // Inicializar tipos visibles cuando cambia el modelo
  useEffect(() => {
    if (elementTypes.length > 0) {
      setVisibleTypes(new Set(elementTypes));
    }
  }, [elementTypes]);

  const visualizationNodes = [
    { id: "fragment", name: "Fragment Loading", icon: Box },
    { id: "lod", name: "Level of Detail", icon: Eye },
    { id: "nav", name: "Navigation Tools", icon: Layers },
  ];

  const realtimeNodes = [
    { id: "sensor", name: "Sensor Data", icon: Activity },
    { id: "context", name: "Context Broker", icon: Network },
    { id: "alerts", name: "Live Alerts", icon: Bell },
  ];

  const wp8Nodes = [
    { id: "energy", name: "Energy Forecast", icon: Zap },
    { id: "thermal", name: "Thermal Comfort", icon: Thermometer },
    { id: "risk", name: "Risk Assessment", icon: AlertTriangle },
  ];

  const wp10Nodes = [
    { id: "maintenance", name: "Predictive Maintenance", icon: Wrench },
    { id: "sustainability", name: "Sustainability KPIs", icon: Leaf },
    { id: "readiness", name: "Smart Readiness", icon: BarChart3 },
  ];

  const modules = [
    {
      id: "realtime",
      title: "Real-Time",
      subtitle: "Live Sensors",
      icon: Gauge,
    },
    {
      id: "energy",
      title: "Energy",
      subtitle: "Forecast",
      icon: Zap,
    },
    {
      id: "comfort",
      title: "Comfort",
      subtitle: "Analysis",
      icon: FlaskConical,
    },
    {
      id: "predictive",
      title: "Predictive",
      subtitle: "Maintenance",
      icon: Wrench,
    },
    {
      id: "sustainability",
      title: "Sustainability",
      subtitle: "KPIs",
      icon: Leaf,
    },
    {
      id: "smart",
      title: "Smart",
      subtitle: "Readiness",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-11 items-center justify-between border-b bg-background px-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 hover:bg-muted rounded p-1 transition-colors"
          >
            <img src="/datawise-logo.png" alt="DATAWiSE" className="h-5" />
          </button>
          <div className="flex gap-1 text-xs">
            <button className="px-2 py-1 hover:bg-muted rounded transition-colors">
              File
            </button>
            <button className="px-2 py-1 hover:bg-muted rounded transition-colors">
              Edit
            </button>
            <button className="px-2 py-1 hover:bg-muted rounded transition-colors">
              View
            </button>
            <button className="px-2 py-1 hover:bg-muted rounded transition-colors">
              Help
            </button>
          </div>
        </div>

        <Tabs defaultValue="viewer" className="flex-1 max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="processor" className="text-xs" asChild>
              <a href="/processor">BIM Data Processor</a>
            </TabsTrigger>
            <TabsTrigger value="viewer" className="text-xs">
              Digital Twin Viewer
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          {isComparisonMode && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs"
              onClick={() => setCaptureScreenshot(true)}
            >
              <Camera className="w-3 h-3 mr-1" />
              Capturar Vista
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-[#7fb069] hover:bg-[#6fa055] text-white"
          >
            ▶ Run
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-56 border-r bg-background flex flex-col">
            <Tabs defaultValue="nodes" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4 rounded-none border-b h-9">
                <TabsTrigger value="nodes" className="text-xs">
                  Nodes
                </TabsTrigger>
                <TabsTrigger value="sensors" className="text-xs">
                  Sensores
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs">
                  Comentarios
                </TabsTrigger>
                <TabsTrigger value="presets" className="text-xs">
                  Presets
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="nodes"
                className="flex-1 overflow-y-auto mt-0 p-3 space-y-4"
              >
                {/* VISIBILITY CONTROLS */}
                {showViewer && elementTypes.length > 0 && (
                  <div className="pb-4 border-b">
                    <VisibilityControlPanel
                      elementTypes={elementTypes}
                      elementCountsByType={elementCountsByType}
                      onVisibilityChange={setVisibleTypes}
                    />
                  </div>
                )}

                {/* 3D VISUALIZATION */}
                <div>
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 tracking-wider">
                    3D VISUALIZATION
                  </h3>
                  <div className="space-y-0.5">
                    {visualizationNodes.map((node) => (
                      <button
                        key={node.id}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                      >
                        <node.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate text-left">{node.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* REAL-TIME DATA */}
                <div>
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 tracking-wider">
                    REAL-TIME DATA
                  </h3>
                  <div className="space-y-0.5">
                    {realtimeNodes.map((node) => (
                      <button
                        key={node.id}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                      >
                        <node.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate text-left">{node.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WP8 ANALYTICS */}
                <div>
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 tracking-wider">
                    WP8 ANALYTICS
                  </h3>
                  <div className="space-y-0.5">
                    {wp8Nodes.map((node) => (
                      <button
                        key={node.id}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                      >
                        <node.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate text-left">{node.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WP10 SERVICES */}
                <div>
                  <h3 className="text-[10px] font-semibold text-muted-foreground mb-2 tracking-wider">
                    WP10 SERVICES
                  </h3>
                  <div className="space-y-0.5">
                    {wp10Nodes.map((node) => (
                      <button
                        key={node.id}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
                      >
                        <node.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate text-left">{node.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="sensors"
                className="flex-1 overflow-y-auto mt-0 p-3"
              >
                <SensorPanel elementId={selectedElement?.expressId} />
              </TabsContent>

              <TabsContent
                value="comments"
                className="flex-1 overflow-y-auto mt-0 p-3"
              >
                <CommentsPanel 
                  elementId={selectedElement?.expressId} 
                  modelId={(modelMetadata as any)?.id}
                />
              </TabsContent>

              <TabsContent
                value="presets"
                className="flex-1 overflow-y-auto mt-0 p-3"
              >
                <p className="text-xs text-muted-foreground text-center py-8">
                  No presets available
                </p>
              </TabsContent>
            </Tabs>
          </aside>
        )}

        {/* Main Area */}
        <main className="flex-1 relative bg-muted/20 overflow-hidden">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <img
              src="/datawise-logo.png"
              alt=""
              className="w-2/3 max-w-3xl opacity-[0.08] select-none"
            />
          </div>

          {/* 3D Viewer */}
          {showViewer && (
            <div className="absolute inset-0 z-20">
              <ThreeViewer
                className="w-full h-full"
                model={currentModel || undefined}
                visibleTypes={visibleTypes}
                onElementSelected={setSelectedElement}
                measurementMode={measurementMode}
                onMeasurementComplete={(measurement) => {
                  setMeasurements([...measurements, measurement]);
                  setClearMeasurements(false);
                }}
                clearMeasurements={clearMeasurements}
                highlightedNodeId={highlightedNodeId}
                comparisonMode={isComparisonMode}
                comparisonChanges={comparisonData ? {
                  added: comparisonData.added,
                  removed: comparisonData.removed,
                  modified: comparisonData.modified,
                } : undefined}
                comparisonFilters={isComparisonMode ? filters : undefined}
                captureScreenshot={captureScreenshot}
                onScreenshotReady={(dataUrl) => {
                  setScreenshot3D(dataUrl);
                  setCaptureScreenshot(false);
                }}
              />
              
              {/* Comparison Legend */}
              {isComparisonMode && comparisonData && (
                <ComparisonLegend
                  addedCount={comparisonData.statistics.addedCount}
                  removedCount={comparisonData.statistics.removedCount}
                  modifiedCount={comparisonData.statistics.modifiedCount}
                />
              )}

              {/* Measurement Tool */}
              <MeasurementTool
                isActive={measurementMode}
                onToggle={() => setMeasurementMode(!measurementMode)}
                measurements={measurements}
                onClearMeasurements={() => {
                  setMeasurements([]);
                  setClearMeasurements(true);
                  setTimeout(() => setClearMeasurements(false), 100);
                }}
              />
              
              {/* Model Info Badge */}
              {modelMetadata && (
                <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg z-40">
                  <div className="text-sm">
                    <p className="font-semibold mb-1">{modelMetadata.fileName || 'IFC Model'}</p>
                    <p className="text-xs text-muted-foreground">Schema: {modelMetadata.schema}</p>
                    {modelMetadata.statistics && (
                      <p className="text-xs text-muted-foreground">
                        {modelMetadata.statistics.totalElements} elements
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Properties Panel */}
          {selectedElement && (
            <div className="absolute right-0 top-0 bottom-8 w-80 bg-background border-l border-border p-4 overflow-y-auto z-30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Element Properties</h3>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Box className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Basic Information</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Type:</span> {selectedElement.type}</p>
                    {selectedElement.name && (
                      <p><span className="text-muted-foreground">Name:</span> {selectedElement.name}</p>
                    )}
                    {selectedElement.globalId && (
                      <p><span className="text-muted-foreground">Global ID:</span> {selectedElement.globalId}</p>
                    )}
                    <p><span className="text-muted-foreground">Express ID:</span> {selectedElement.expressId}</p>
                  </div>
                </div>

                {/* Dimensiones y Áreas */}
                {selectedElement.properties && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Dimensiones y Áreas</h4>
                    <div className="text-sm space-y-1">
                      {selectedElement.properties.Width && (
                        <p>
                          <span className="text-muted-foreground">Ancho:</span>{" "}
                          {Number(selectedElement.properties.Width).toFixed(2)} m
                        </p>
                      )}
                      {selectedElement.properties.Height && (
                        <p>
                          <span className="text-muted-foreground">Alto:</span>{" "}
                          {Number(selectedElement.properties.Height).toFixed(2)} m
                        </p>
                      )}
                      {selectedElement.properties.Length && (
                        <p>
                          <span className="text-muted-foreground">Largo:</span>{" "}
                          {Number(selectedElement.properties.Length).toFixed(2)} m
                        </p>
                      )}
                      {selectedElement.properties.Area && (
                        <p>
                          <span className="text-muted-foreground">Área:</span>{" "}
                          {Number(selectedElement.properties.Area).toFixed(2)} m²
                        </p>
                      )}
                      {selectedElement.properties.Volume && (
                        <p>
                          <span className="text-muted-foreground">Volumen:</span>{" "}
                          {Number(selectedElement.properties.Volume).toFixed(2)} m³
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedElement.properties && Object.keys(selectedElement.properties).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Otras Propiedades</h4>
                    <div className="text-sm space-y-1 max-h-60 overflow-y-auto">
                      {Object.entries(selectedElement.properties)
                        .filter(([key]) => !['Width', 'Height', 'Length', 'Area', 'Volume'].includes(key))
                        .map(([key, value]) => (
                          <p key={key}>
                            <span className="text-muted-foreground">{key}:</span> {String(value)}
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full p-12">
            {/* Icon */}
            <div className="mb-8 p-8 rounded-2xl bg-muted/50 backdrop-blur-sm">
              <Box className="h-16 w-16 text-[#7fb069]" strokeWidth={1.5} />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold mb-4">Digital Twin Viewer</h1>

            {/* Description */}
            <p className="text-sm text-muted-foreground text-center max-w-2xl mb-12">
              Load a BIM model to visualize the 3D digital twin with real-time
              sensor data and analytics overlays from WP8 and WP10 modules.
            </p>

            {/* Load Model Button */}
            <Button
              size="lg"
              className="mb-8 bg-[#7fb069] hover:bg-[#6fa055] text-white"
              onClick={() => setShowViewer(true)}
            >
              <Box className="mr-2 h-5 w-5" />
              Load Demo Model
            </Button>

            {/* Module Cards */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
              {modules.map((module) => (
                <button
                  key={module.id}
                  className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 bg-card hover:bg-accent transition-colors"
                >
                  <module.icon className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">{module.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {module.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 h-8 border-t bg-background/95 backdrop-blur-sm flex items-center justify-between px-3 text-[10px] text-muted-foreground z-20">
            <div className="flex items-center gap-2">
              <span>DATAWiSE v2.0.0</span>
              <span className="text-muted-foreground/50">•</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#7fb069]" />
                <span>Connected to DSP</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
