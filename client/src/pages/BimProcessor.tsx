import { useCallback, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileUp,
  Filter,
  CheckCircle2,
  Database,
  Network,
  BarChart3,
  Upload,
  Bell,
  Settings,
  FileCode,
  FileJson,
  X,
  Box,
  FileText,
  Play,
  Download,
  FileDown,
  FileBarChart,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { FileUploadDialog } from "@/components/FileUploadDialog";
import { SaveWorkflowDialog } from "@/components/SaveWorkflowDialog";
import { WorkflowExecutor, ExecutionResult } from "@/services/workflowExecutor";
import { trpc } from "@/lib/trpc";
import { Save } from "lucide-react";

const nodeCategories = [
  {
    category: "INPUT",
    items: [
      { id: "ifc-file", name: "IFC File", icon: FileUp, badge: "STEP" },
      { id: "ifc-xml", name: "IFC XML", icon: FileJson },
      { id: "ifc-json", name: "IFC JSON", icon: FileJson },
      { id: "load-dataset", name: "Load Dataset", icon: Database },
      { id: "load-ids", name: "Load IDS", icon: FileCode },
    ],
  },
  {
    category: "PROCESSING",
    items: [
      { id: "filter-elements", name: "Filter Elements", icon: Filter },
      { id: "properties", name: "Properties", icon: Settings },
      { id: "classification", name: "Classification", icon: FileText },
      { id: "validate-ids", name: "Validate IDS", icon: CheckCircle2 },
      { id: "generate-ids", name: "Generate IDS", icon: FileCode },
      { id: "map-bsdd", name: "Map bSDD", icon: Network },
      { id: "build-graph", name: "Build Graph", icon: Network },
      { id: "quality-score", name: "Quality Score", icon: BarChart3 },
    ],
  },
  {
    category: "OUTPUT",
    items: [
      { id: "export-csv", name: "Export CSV", icon: Upload },
      { id: "export-json", name: "Export JSON", icon: Upload },
      { id: "publish-dsp", name: "Publish to DSP", icon: Database },
      { id: "notify", name: "Notify", icon: Bell },
    ],
  },
];

export default function BimProcessor() {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [saveWorkflowDialogOpen, setSaveWorkflowDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [processedFileData, setProcessedFileData] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionResult[]>([]);
  const [lastExecutionData, setLastExecutionData] = useState<any>(null);

  // Mutación para generar reporte PDF
  const generateReportMutation = trpc.reports.generateWorkflowReport.useMutation({
    onSuccess: (data) => {
      // Convertir base64 a blob y descargar
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Report generated successfully');
    },
    onError: (error) => {
      toast.error('Error generating report', {
        description: error.message,
      });
    },
  });
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Mutación para guardar workflow
  const saveWorkflowMutation = trpc.workflows.saveCustom.useMutation({
    onSuccess: () => {
      toast.success('Workflow guardado exitosamente');
      // Refrescar lista de workflows
      customWorkflowsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Error al guardar workflow: ${error.message}`);
    },
  });

  // Query para obtener workflows personalizados
  const customWorkflowsQuery = trpc.workflows.listCustom.useQuery();

  // Mutación para eliminar workflow
  const deleteWorkflowMutation = trpc.workflows.deleteCustom.useMutation({
    onSuccess: () => {
      toast.success('Workflow eliminado exitosamente');
      customWorkflowsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Error al eliminar workflow: ${error.message}`);
    },
  });

  // Mutación para actualizar workflow
  const updateWorkflowMutation = trpc.workflows.updateCustom.useMutation({
    onSuccess: () => {
      toast.success('Workflow actualizado exitosamente');
      customWorkflowsQuery.refetch();
      setEditingWorkflow(null);
    },
    onError: (error) => {
      toast.error(`Error al actualizar workflow: ${error.message}`);
    },
  });

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (nodeType: { id: string; name: string; icon: any }) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: "default",
      data: { label: nodeType.name },
      position: {
        x: Math.random() * 400 + 200,
        y: Math.random() * 300 + 150,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success(`Added ${nodeType.name} node`);
  };

  const onDragStart = (event: React.DragEvent, nodeType: { id: string; name: string; icon: any }) => {
    event.dataTransfer.setData('application/reactflow', nodeType.id);
    event.dataTransfer.setData('label', nodeType.name);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();

    const nodeType = event.dataTransfer.getData('application/reactflow');
    const label = event.dataTransfer.getData('label');

    if (!nodeType) return;

    // Get the position where the node was dropped
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - reactFlowBounds.left - 75,
      y: event.clientY - reactFlowBounds.top - 20,
    };

    // Create a new node
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: 'default',
      position,
      data: { label },
    };

    setNodes((nds) => nds.concat(newNode));
    toast.success(`Added ${label} node`);
  };

  const handleSaveWorkflow = async (name: string, description: string) => {
    if (editingWorkflow) {
      // Modo edición: solo actualizar nombre y descripción
      await updateWorkflowMutation.mutateAsync({
        id: editingWorkflow.id,
        name,
        description,
      });
    } else {
      // Modo guardar nuevo: incluir configuración de nodos
      if (nodes.length === 0) {
        throw new Error('No hay nodos en el canvas para guardar');
      }

      // Serializar configuración de nodos y conexiones
      const flowConfig = JSON.stringify({
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })),
      });

      await saveWorkflowMutation.mutateAsync({
        name,
        description,
        flowConfig,
      });
    }
  };

  const handleEditWorkflow = (workflow: any) => {
    setEditingWorkflow(workflow);
    setSaveWorkflowDialogOpen(true);
  };

  const handleDeleteWorkflow = async (workflowId: number, workflowName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el workflow "${workflowName}"?`)) {
      await deleteWorkflowMutation.mutateAsync({ id: workflowId });
    }
  };

  const loadCustomWorkflow = (workflow: any) => {
    try {
      const config = JSON.parse(workflow.flowConfig);
      setTimeout(() => {
        setNodes(config.nodes || []);
        setEdges(config.edges || []);
        toast.success(`Loaded workflow: ${workflow.name}`);
      }, 100);
    } catch (error) {
      toast.error('Error loading workflow');
    }
  };

  const handleExportWorkflow = () => {
    if (nodes.length === 0) {
      toast.error("No workflow to export", {
        description: "Add nodes to the canvas first",
      });
      return;
    }

    const workflowData = {
      metadata: {
        name: "Exported Workflow",
        description: "Workflow exported from BIM Data Processor",
        exportedAt: new Date().toISOString(),
        version: "1.0",
      },
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    };

    const jsonString = JSON.stringify(workflowData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Workflow exported successfully");
  };

  const handleImportWorkflow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflowData = JSON.parse(event.target?.result as string);
          
          // Validar estructura
          if (!workflowData.nodes || !workflowData.edges) {
            toast.error("Invalid workflow file", {
              description: "The file does not contain valid workflow data",
            });
            return;
          }

          // Cargar nodos y conexiones
          setTimeout(() => {
            setNodes(workflowData.nodes || []);
            setEdges(workflowData.edges || []);
            toast.success("Workflow imported successfully", {
              description: workflowData.metadata?.name || "Imported workflow",
            });
          }, 100);
        } catch (error) {
          toast.error("Error importing workflow", {
            description: "Failed to parse JSON file",
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Mutation for workflow execution
  const executeWorkflowMutation = trpc.workflows.execute.useMutation({
    onSuccess: (data) => {
      const duration = (data.duration / 1000).toFixed(1);
      toast.success("Workflow completed", {
        description: `Completed ${data.summary.completedNodes}/${data.summary.totalNodes} nodes in ${duration}s`,
      });
      
      // Save execution data for report generation
      setLastExecutionData({
        workflowName: "Custom Workflow",
        executedAt: new Date().toISOString(),
        executionTime: data.duration / 1000,
        executionId: data.executionId,
        summary: data.summary,
        errors: data.errors,
      });
    },
    onError: (error) => {
      toast.error("Workflow execution failed", {
        description: error.message,
      });
    },
  });

  const handleRun = async () => {
    if (nodes.length === 0) {
      toast.error("No workflow to execute", {
        description: "Add nodes to the canvas first",
      });
      return;
    }

    setIsExecuting(true);
    setExecutionLogs([]);
    
    toast.info("Executing workflow...", {
      description: `Processing ${nodes.length} nodes`,
    });

    try {
      // First, save the workflow if it doesn't exist
      let workflowId = editingWorkflow?.id;
      
      if (!workflowId) {
        // Create temporary workflow for execution
        const flowConfig = JSON.stringify({
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
          })),
        });

        const saved = await saveWorkflowMutation.mutateAsync({
          name: "Temporary Workflow - " + new Date().toISOString(),
          description: "Auto-saved for execution",
          flowConfig,
        });
        
        workflowId = saved.id;
      }

      // Execute workflow via tRPC
      await executeWorkflowMutation.mutateAsync({
        workflowId,
        config: {
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            data: node.data,
            position: node.position,
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
          })),
        },
      });

    } catch (error) {
      console.error('Workflow execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleFileProcessed = (result: any) => {
    setProcessedFileData(result);
    toast.success("IFC file loaded successfully", {
      description: `Extracted ${result.statistics.totalElements} elements`,
    });
  };

  const handleGenerateReport = () => {
    if (!lastExecutionData) {
      toast.error("No execution data available", {
        description: "Run a workflow first",
      });
      return;
    }

    generateReportMutation.mutate(lastExecutionData);
  };

  const loadPreset = (presetName: string) => {
    // Clear existing nodes and edges
    setNodes([]);
    setEdges([]);

    // Define preset configurations
    const presets: Record<string, { nodes: Node[]; edges: Edge[] }> = {
      "IFC Validation Flow": {
        nodes: [
          {
            id: "1",
            type: "default",
            data: { label: "IFC File" },
            position: { x: 100, y: 200 },
          },
          {
            id: "2",
            type: "default",
            data: { label: "Load IDS" },
            position: { x: 100, y: 300 },
          },
          {
            id: "3",
            type: "default",
            data: { label: "Validate IDS" },
            position: { x: 300, y: 250 },
          },
          {
            id: "4",
            type: "default",
            data: { label: "Export JSON" },
            position: { x: 500, y: 250 },
          },
        ],
        edges: [
          { id: "e1-3", source: "1", target: "3" },
          { id: "e2-3", source: "2", target: "3" },
          { id: "e3-4", source: "3", target: "4" },
        ],
      },
      "Quality Assessment": {
        nodes: [
          {
            id: "1",
            type: "default",
            data: { label: "IFC File" },
            position: { x: 100, y: 200 },
          },
          {
            id: "2",
            type: "default",
            data: { label: "Filter Elements" },
            position: { x: 300, y: 200 },
          },
          {
            id: "3",
            type: "default",
            data: { label: "Properties" },
            position: { x: 500, y: 150 },
          },
          {
            id: "4",
            type: "default",
            data: { label: "Quality Score" },
            position: { x: 500, y: 250 },
          },
          {
            id: "5",
            type: "default",
            data: { label: "Export CSV" },
            position: { x: 700, y: 200 },
          },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2" },
          { id: "e2-3", source: "2", target: "3" },
          { id: "e2-4", source: "2", target: "4" },
          { id: "e3-5", source: "3", target: "5" },
          { id: "e4-5", source: "4", target: "5" },
        ],
      },
      "Graph Mining": {
        nodes: [
          {
            id: "1",
            type: "default",
            data: { label: "IFC File" },
            position: { x: 100, y: 200 },
          },
          {
            id: "2",
            type: "default",
            data: { label: "Map bSDD" },
            position: { x: 300, y: 200 },
          },
          {
            id: "3",
            type: "default",
            data: { label: "Build Graph" },
            position: { x: 500, y: 200 },
          },
          {
            id: "4",
            type: "default",
            data: { label: "Publish to DSP" },
            position: { x: 700, y: 200 },
          },
        ],
        edges: [
          { id: "e1-2", source: "1", target: "2" },
          { id: "e2-3", source: "2", target: "3" },
          { id: "e3-4", source: "3", target: "4" },
        ],
      },
    };

    const preset = presets[presetName];
    if (preset) {
      setTimeout(() => {
        setNodes(preset.nodes);
        setEdges(preset.edges);
        toast.success(`Loaded preset: ${presetName}`);
      }, 100);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </button>
          <img 
            src="/datawise-logo.png" 
            alt="DATAWiSE" 
            className="h-6 cursor-pointer"
            onClick={() => setLocation("/")}
          />
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
              File
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
              Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
              View
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
              Help
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value="processor" className="h-8">
            <TabsList className="bg-muted h-8">
              <TabsTrigger value="processor" className="text-xs h-7 px-4">
                BIM Data Processor
              </TabsTrigger>
              <TabsTrigger 
                value="viewer" 
                className="text-xs h-7 px-4"
                onClick={() => setLocation("/viewer")}
              >
                Digital Twin Viewer
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            size="sm"
            variant="outline"
            className="h-8 px-3"
            onClick={() => setUploadDialogOpen(true)}
          >
            <FileUp className="mr-1.5 h-3.5 w-3.5" />
            Load IFC
          </Button>
               <Button 
            size="sm"
            variant="outline"
            className="h-8 px-4"
            onClick={() => setSaveWorkflowDialogOpen(true)}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
          <Button 
            size="sm"
            variant="outline"
            className="h-8 px-4"
            onClick={handleExportWorkflow}
            disabled={nodes.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button 
            size="sm"
            variant="outline"
            className="h-8 px-4"
            onClick={handleImportWorkflow}
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
          <Button 
            size="sm"
            className="bg-[#7fb069] hover:bg-[#6a9b5a] text-white h-8 px-4"
            onClick={handleRun}
            disabled={isExecuting || nodes.length === 0}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {isExecuting ? "Running..." : "Run"}
          </Button>
          {lastExecutionData && (
            <Button 
              size="sm"
              variant="outline"
              className="h-8 px-4"
              onClick={handleGenerateReport}
              disabled={generateReportMutation.isPending}
            >
              <FileBarChart className="mr-1.5 h-3.5 w-3.5" />
              {generateReportMutation.isPending ? "Generating..." : "Generate Report"}
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-[185px] border-r bg-card flex flex-col">
            <Tabs defaultValue="nodes" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b h-10 bg-transparent">
                <TabsTrigger value="nodes" className="text-xs rounded-none data-[state=active]:bg-muted">
                  Nodes
                </TabsTrigger>
                <TabsTrigger value="presets" className="text-xs rounded-none data-[state=active]:bg-muted">
                  Presets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="nodes" className="flex-1 overflow-y-auto mt-0 p-3 space-y-4">
                {nodeCategories.map((category) => (
                  <div key={category.category}>
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {category.category}
                    </h3>
                    <div className="space-y-0.5">
                      {category.items.map((item) => (
                        <button
                          key={item.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, item)}
                          onClick={() => addNode(item)}
                          className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors cursor-grab active:cursor-grabbing"
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate text-left">{item.name}</span>
                          {item.badge && (
                            <span className="ml-auto text-[9px] bg-muted px-1 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="presets" className="flex-1 overflow-y-auto mt-0 p-3 space-y-3">
                {/* Workflows personalizados */}
                {customWorkflowsQuery.data && customWorkflowsQuery.data.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                      Mis Workflows
                    </h3>
                    {customWorkflowsQuery.data.map((workflow: any) => (
                      <div
                        key={workflow.id}
                        className="w-full rounded-lg border bg-card hover:bg-accent transition-colors relative group"
                      >
                        <button
                          onClick={() => loadCustomWorkflow(workflow)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="font-semibold text-sm">{workflow.name}</h3>
                            <span className="text-[9px] bg-[#7fb069] text-white px-1.5 py-0.5 rounded font-medium">
                              CUSTOM
                            </span>
                          </div>
                          {workflow.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {workflow.description}
                            </p>
                          )}
                        </button>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditWorkflow(workflow);
                            }}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkflow(workflow.id, workflow.name);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="h-px bg-border my-3"></div>
                  </div>
                )}

                {/* Presets predefinidos */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    Presets
                  </h3>
                  <button 
                    onClick={() => loadPreset("IFC Validation Flow")}
                    className="w-full rounded-lg border bg-card p-4 text-left hover:bg-accent transition-colors"
                  >
                    <h3 className="font-semibold text-sm mb-1.5">IFC Validation Flow</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Load, validate, and export IFC models
                    </p>
                  </button>
                  
                  <button 
                    onClick={() => loadPreset("Quality Assessment")}
                    className="w-full rounded-lg border bg-card p-4 text-left hover:bg-accent transition-colors"
                  >
                    <h3 className="font-semibold text-sm mb-1.5">Quality Assessment</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Calculate FAIR data quality scores
                    </p>
                  </button>
                  
                  <button 
                    onClick={() => loadPreset("Graph Mining")}
                    className="w-full rounded-lg border bg-card p-4 text-left hover:bg-accent transition-colors"
                  >
                    <h3 className="font-semibold text-sm mb-1.5">Graph Mining</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Build and query knowledge graphs
                    </p>
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </aside>
        )}

        {/* Main Canvas */}
        <main className="flex-1 relative bg-muted/20">
          {/* IFC Processing Results Panel */}
          {processedFileData && (
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l border-border p-4 overflow-y-auto z-30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">IFC Model Info</h3>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-[#7fb069] hover:bg-[#6fa055] text-white"
                    onClick={() => window.location.href = '/viewer'}
                  >
                    <Box className="h-4 w-4 mr-1" />
                    View in 3D
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProcessedFileData(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Model Information</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Schema:</span> {processedFileData.schema}</p>
                    <p><span className="text-muted-foreground">Total Elements:</span> {processedFileData.statistics?.totalElements || 0}</p>
                  </div>
                </div>

                {processedFileData.statistics?.elementsByType && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Elements by Type</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(processedFileData.statistics.elementsByType).map(([type, count]) => (
                        <p key={type}>
                          <span className="text-muted-foreground">{type}:</span> {count as number}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {processedFileData.elements && processedFileData.elements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Sample Elements ({processedFileData.elements.length})</h4>
                    <div className="text-xs space-y-2">
                      {processedFileData.elements.slice(0, 10).map((element: any, index: number) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <p className="font-medium">{element.type}</p>
                          {element.name && <p className="text-muted-foreground">{element.name}</p>}
                          {element.globalId && <p className="text-muted-foreground text-[10px]">ID: {element.globalId}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <img 
              src="/datawise-logo.png"
              alt=""
              className="w-2/3 max-w-3xl opacity-[0.08] select-none"
            />
          </div>

          {/* Welcome Message when empty */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center max-w-2xl px-8">
                <div className="mb-6">
                  <div className="inline-block p-4 bg-muted/50 rounded-lg mb-4">
                    <Network className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  BIM Data Processor Workspace
                </h2>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                  Drag nodes from the left panel to create your data processing workflow. Connect nodes to define the
                  data flow pipeline for IFC validation, semantic enrichment, and quality assurance.
                </p>
                
                {/* Example workflow */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="flex flex-col items-center gap-2 p-3 bg-card border rounded-lg">
                    <FileUp className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium">Load IFC</span>
                  </div>
                  <div className="h-px w-8 bg-border"></div>
                  <div className="flex flex-col items-center gap-2 p-3 bg-card border rounded-lg">
                    <Filter className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium">Filter</span>
                  </div>
                  <div className="h-px w-8 bg-border"></div>
                  <div className="flex flex-col items-center gap-2 p-3 bg-card border rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium">Validate</span>
                  </div>
                  <div className="h-px w-8 bg-border"></div>
                  <div className="flex flex-col items-center gap-2 p-3 bg-card border rounded-lg">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-medium">Export</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ReactFlow Canvas */}
          <div className="relative z-20 h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
              <Controls className="bg-card border" />
              <MiniMap
                nodeColor={() => "#6366f1"}
                className="bg-card border"
              />
            </ReactFlow>
          </div>
        </main>
      </div>

      {/* File Upload Dialog */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onFileProcessed={handleFileProcessed}
      />

      {/* Save Workflow Dialog */}
      <SaveWorkflowDialog
        open={saveWorkflowDialogOpen}
        onOpenChange={(open) => {
          setSaveWorkflowDialogOpen(open);
          if (!open) setEditingWorkflow(null);
        }}
        onSave={handleSaveWorkflow}
        defaultName={editingWorkflow?.name}
        defaultDescription={editingWorkflow?.description}
        mode={editingWorkflow ? 'edit' : 'save'}
      />

      {/* Footer */}
      <footer className="flex h-7 items-center justify-between border-t bg-muted/30 px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>DATAWiSE v2.0.0</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#7fb069]"></div>
            <span>Connected to DSP</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="hover:text-foreground transition-colors">+</button>
          <button className="hover:text-foreground transition-colors">−</button>
          <button className="hover:text-foreground transition-colors">⛶</button>
          <button className="hover:text-foreground transition-colors">🔒</button>
        </div>
      </footer>
    </div>
  );
}
