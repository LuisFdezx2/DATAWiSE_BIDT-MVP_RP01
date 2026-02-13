import { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download,
  BarChart3,
  FileJson,
  FileCode,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Link } from 'wouter';

interface ValidationReport {
  modelId?: number;
  modelName?: string;
  validationDate: Date;
  totalElements: number;
  validatedElements: number;
  passedElements: number;
  failedElements: number;
  warningCount: number;
  complianceRate: number;
  specificationResults: SpecificationResult[];
  elementResults: ValidationResult[];
}

interface SpecificationResult {
  name: string;
  description?: string;
  totalApplicable: number;
  passed: number;
  failed: number;
  warnings: number;
  complianceRate: number;
}

interface ValidationResult {
  elementId: number;
  elementType: string;
  elementName?: string;
  specificationName: string;
  passed: boolean;
  failures: ValidationFailure[];
  warnings: ValidationWarning[];
}

interface ValidationFailure {
  requirementType: string;
  requirementName: string;
  expected: string;
  actual: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  message: string;
  context?: string;
}

export default function IDSValidation() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id) : 0;

  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [idsFileContent, setIdsFileContent] = useState<string | null>(null);
  const [idsFileName, setIdsFileName] = useState<string>('');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Query para obtener modelos IFC del proyecto
  const { data: ifcModels, isLoading: loadingModels } = trpc.ifc.listSavedModels.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // Query para obtener plantillas IDS predefinidas
  const { data: idsTemplates, isLoading: loadingTemplates } = trpc.ids.getTemplates.useQuery();

  // Mutation para validar
  const validateMutation = trpc.ids.validate.useMutation({
    onSuccess: (data) => {
      setValidationReport(data as ValidationReport);
      toast.success('Validación completada', {
        description: `Tasa de cumplimiento: ${data.complianceRate.toFixed(1)}%`,
      });
      setIsValidating(false);
    },
    onError: (error) => {
      toast.error('Error en validación', {
        description: error.message,
      });
      setIsValidating(false);
    },
  });

  // Mutation para exportar HTML
  const exportHTMLMutation = trpc.ids.exportHTML.useMutation({
    onSuccess: (data) => {
      // Crear blob y descargar
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ids-validation-report-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Reporte HTML exportado');
    },
  });

  // Mutation para exportar JSON
  const exportJSONMutation = trpc.ids.exportJSON.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ids-validation-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Reporte JSON exportado');
    },
  });

  // Manejar selección de plantilla predefinida
  const handleSelectTemplate = (templateId: string) => {
    const template = idsTemplates?.find(t => t.id === templateId);
    if (template) {
      setIdsFileContent(template.xmlContent);
      setIdsFileName(template.name);
      setSelectedTemplateId(templateId);
      toast.success('Plantilla IDS seleccionada', {
        description: template.name,
      });
    }
  };

  // Manejar carga de archivo IDS
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xml') && !file.name.endsWith('.ids')) {
      toast.error('Archivo inválido', {
        description: 'Por favor selecciona un archivo IDS (.xml o .ids)',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setIdsFileContent(content);
      setIdsFileName(file.name);
      setSelectedTemplateId(null);
      toast.success('Archivo IDS cargado', {
        description: file.name,
      });
    };
    reader.readAsText(file);
  };

  // Ejecutar validación
  const handleValidate = () => {
    if (!selectedModelId) {
      toast.error('Selecciona un modelo IFC');
      return;
    }

    if (!idsFileContent) {
      toast.error('Carga un archivo IDS');
      return;
    }

    setIsValidating(true);
    validateMutation.mutate({
      modelId: selectedModelId,
      idsXml: idsFileContent,
    });
  };

  // Exportar reportes
  const handleExportHTML = () => {
    if (!validationReport) return;
    exportHTMLMutation.mutate({ report: validationReport });
  };

  const handleExportJSON = () => {
    if (!validationReport) return;
    exportJSONMutation.mutate({ report: validationReport });
  };

  // Obtener color de compliance
  const getComplianceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-blue-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceStatus = (rate: number) => {
    if (rate >= 95) return 'excellent';
    if (rate >= 80) return 'good';
    if (rate >= 60) return 'fair';
    return 'poor';
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'fair': return 'outline';
      case 'poor': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard">
          <a className="hover:text-foreground transition-colors">Dashboard</a>
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/projects/${projectId}`}>
          <a className="hover:text-foreground transition-colors">Proyecto {projectId}</a>
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Validación IDS</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Validación IDS</h1>
        <p className="text-muted-foreground mt-2">
          Valida modelos IFC contra especificaciones IDS (Information Delivery Specification)
        </p>
      </div>

      {/* Sección de configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Validación</CardTitle>
          <CardDescription>
            Selecciona un modelo IFC y carga un archivo IDS para validar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de modelo IFC */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Modelo IFC</label>
            <Select
              value={selectedModelId?.toString() || ''}
              onValueChange={(value) => setSelectedModelId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un modelo IFC" />
              </SelectTrigger>
              <SelectContent>
                {loadingModels ? (
                  <SelectItem value="loading" disabled>Cargando modelos...</SelectItem>
                ) : ifcModels?.models && ifcModels.models.length > 0 ? (
                  ifcModels.models.map((model) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name} ({model.ifcSchema}) - {model.elementCount} elementos
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No hay modelos IFC disponibles</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Plantillas predefinidas */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Plantillas Predefinidas</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loadingTemplates ? (
                <div className="col-span-2 text-center py-4 text-muted-foreground">
                  Cargando plantillas...
                </div>
              ) : idsTemplates && idsTemplates.length > 0 ? (
                idsTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplateId === template.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleSelectTemplate(template.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {template.category === 'building_codes' && 'Códigos'}
                          {template.category === 'iso_standards' && 'ISO'}
                          {template.category === 'industry_best_practices' && 'Buenas Prácticas'}
                          {template.category === 'custom' && 'Personalizado'}
                        </Badge>
                        {template.region && (
                          <Badge variant="secondary" className="text-xs">
                            {template.region}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-muted-foreground">
                  No hay plantillas disponibles
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O carga tu propio archivo
              </span>
            </div>
          </div>

          {/* Carga de archivo IDS */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Archivo IDS Personalizado</label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('ids-file-input')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {idsFileName || 'Cargar archivo IDS (.xml)'}
              </Button>
              <input
                id="ids-file-input"
                type="file"
                accept=".xml,.ids"
                className="hidden"
                onChange={handleFileUpload}
              />
              {idsFileName && (
                <Badge variant="secondary">
                  <FileText className="mr-1 h-3 w-3" />
                  {idsFileName}
                </Badge>
              )}
            </div>
          </div>

          {/* Botón de validación */}
          <Button
            onClick={handleValidate}
            disabled={!selectedModelId || !idsFileContent || isValidating}
            className="w-full"
            size="lg"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Ejecutar Validación
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados de validación */}
      {validationReport && (
        <>
          {/* Resumen general */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cumplimiento General
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getComplianceColor(validationReport.complianceRate)}`}>
                  {validationReport.complianceRate.toFixed(1)}%
                </div>
                <Progress value={validationReport.complianceRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Elementos Validados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{validationReport.validatedElements}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  de {validationReport.totalElements} totales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Elementos Aprobados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {validationReport.passedElements}
                </div>
                <div className="flex items-center mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-xs text-muted-foreground">sin fallos</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Elementos Fallidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {validationReport.failedElements}
                </div>
                <div className="flex items-center mt-1">
                  <XCircle className="h-4 w-4 text-red-600 mr-1" />
                  <span className="text-xs text-muted-foreground">requieren atención</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs con resultados detallados */}
          <Tabs defaultValue="specifications" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="specifications">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Especificaciones
                </TabsTrigger>
                <TabsTrigger value="failures">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Fallos ({validationReport.failedElements})
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportHTML}
                  disabled={exportHTMLMutation.isPending}
                >
                  <FileCode className="mr-2 h-4 w-4" />
                  Exportar HTML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJSON}
                  disabled={exportJSONMutation.isPending}
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  Exportar JSON
                </Button>
              </div>
            </div>

            {/* Tab de especificaciones */}
            <TabsContent value="specifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resultados por Especificación</CardTitle>
                  <CardDescription>
                    Cumplimiento de cada especificación IDS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {validationReport.specificationResults.map((spec, index) => {
                      const status = getComplianceStatus(spec.complianceRate);
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold">{spec.name}</h4>
                              {spec.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {spec.description}
                                </p>
                              )}
                            </div>
                            <Badge variant={getBadgeVariant(status)}>
                              {spec.complianceRate.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {spec.passed}/{spec.totalApplicable} aprobados
                            </span>
                            {spec.failed > 0 && (
                              <span className="text-red-600">
                                {spec.failed} fallidos
                              </span>
                            )}
                            {spec.warnings > 0 && (
                              <span className="text-yellow-600">
                                {spec.warnings} advertencias
                              </span>
                            )}
                          </div>
                          <Progress value={spec.complianceRate} className="mt-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab de fallos */}
            <TabsContent value="failures">
              <Card>
                <CardHeader>
                  <CardTitle>Elementos con Fallos</CardTitle>
                  <CardDescription>
                    Detalle de elementos que no cumplen con los requisitos IDS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Elemento</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Especificación</TableHead>
                          <TableHead>Fallos</TableHead>
                          <TableHead>Detalles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationReport.elementResults
                          .filter(r => !r.passed)
                          .map((result, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {result.elementName || `#${result.elementId}`}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{result.elementType}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {result.specificationName}
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {result.failures.length}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-md">
                                <div className="space-y-1">
                                  {result.failures.slice(0, 2).map((failure, fIdx) => (
                                    <div key={fIdx} className="text-xs text-muted-foreground">
                                      <span className="font-medium">{failure.requirementName}:</span>{' '}
                                      {failure.message}
                                    </div>
                                  ))}
                                  {result.failures.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{result.failures.length - 2} más...
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
