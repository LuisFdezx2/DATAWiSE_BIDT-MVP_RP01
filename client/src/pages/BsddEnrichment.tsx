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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Sparkles,
  Database,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  Link2,
  Info,
  ChevronRight
} from 'lucide-react';
import { Link } from 'wouter';

export default function BsddEnrichment() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id) : 0;

  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedDomainUri, setSelectedDomainUri] = useState<string | undefined>(undefined);
  const [isEnriching, setIsEnriching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Query para obtener modelos IFC del proyecto
  const { data: ifcModels, isLoading: loadingModels } = trpc.ifc.listSavedModels.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // Query para obtener dominios bSDD
  const { data: domains, isLoading: loadingDomains } = trpc.bsdd.getDomains.useQuery({
    languageCode: 'en-GB',
  });

  // Query para obtener estadísticas de mapeo
  const { data: mappingStats, refetch: refetchStats } = trpc.bsdd.getMappingStats.useQuery(
    { modelId: selectedModelId! },
    { enabled: selectedModelId !== null }
  );

  // Query para búsqueda de clases
  const { data: searchResults, isLoading: searching } = trpc.bsdd.searchClasses.useQuery(
    {
      searchText: searchQuery,
      domainUri: selectedDomainUri,
    },
    { enabled: searchQuery.length > 2 }
  );

  // Mutation para mapeo automático
  const mapModelMutation = trpc.bsdd.mapModelElements.useMutation({
    onSuccess: (data) => {
      toast.success('Mapeo completado', {
        description: `${data.mappedElements}/${data.totalElements} elementos mapeados`,
      });
      setIsEnriching(false);
      refetchStats();
    },
    onError: (error) => {
      toast.error('Error en mapeo', {
        description: error.message,
      });
      setIsEnriching(false);
    },
  });

  // Ejecutar mapeo automático
  const handleAutoMap = () => {
    if (!selectedModelId) {
      toast.error('Selecciona un modelo IFC');
      return;
    }

    setIsEnriching(true);
    mapModelMutation.mutate({
      modelId: selectedModelId,
      domainUri: selectedDomainUri,
    });
  };

  // Obtener color de tasa de mapeo
  const getMappingRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-blue-600';
    if (rate >= 20) return 'text-yellow-600';
    return 'text-red-600';
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
        <span className="text-foreground font-medium">Enriquecimiento bSDD</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Enriquecimiento bSDD</h1>
        <p className="text-muted-foreground mt-2">
          Enriquece elementos IFC con datos semánticos de buildingSMART Data Dictionary
        </p>
      </div>

      {/* Mensaje informativo */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-medium mb-1">¿Qué es bSDD?</p>
              <p>
                El buildingSMART Data Dictionary es un diccionario global de términos y propiedades
                estándar para la industria de la construcción. El enriquecimiento automático mapea
                elementos IFC a conceptos bSDD, añadiendo definiciones, unidades y propiedades
                estándar que mejoran la interoperabilidad y calidad de los datos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Enriquecimiento</CardTitle>
          <CardDescription>
            Selecciona un modelo IFC y dominio bSDD para enriquecer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de modelo IFC */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Modelo IFC</label>
            <Select
              value={selectedModelId?.toString() || ''}
              onValueChange={(value) => {
                setSelectedModelId(parseInt(value));
              }}
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

          {/* Selector de dominio bSDD */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dominio bSDD (opcional)</label>
            <Select
              value={selectedDomainUri || 'all'}
              onValueChange={(value) => setSelectedDomainUri(value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los dominios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los dominios</SelectItem>
                {loadingDomains ? (
                  <SelectItem value="loading" disabled>Cargando dominios...</SelectItem>
                ) : domains && domains.length > 0 ? (
                  domains.map((domain) => (
                    <SelectItem key={domain.uri} value={domain.uri}>
                      {domain.name} ({domain.version})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No hay dominios disponibles</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Botón de enriquecimiento */}
          <Button
            onClick={handleAutoMap}
            disabled={!selectedModelId || isEnriching}
            className="w-full"
            size="lg"
          >
            {isEnriching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enriqueciendo...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Enriquecer Automáticamente
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Estadísticas de mapeo */}
      {mappingStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tasa de Mapeo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getMappingRateColor(mappingStats.mappingRate)}`}>
                  {mappingStats.mappingRate.toFixed(1)}%
                </div>
                <Progress value={mappingStats.mappingRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Elementos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{mappingStats.totalElements}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  en el modelo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Elementos Mapeados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {mappingStats.mappedElements}
                </div>
                <div className="flex items-center mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-xs text-muted-foreground">con bSDD</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sin Mapear
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-600">
                  {mappingStats.unmappedElements}
                </div>
                <div className="flex items-center mt-1">
                  <XCircle className="h-4 w-4 text-gray-600 mr-1" />
                  <span className="text-xs text-muted-foreground">requieren atención</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs con detalles */}
          <Tabs defaultValue="by-type" className="space-y-4">
            <TabsList>
              <TabsTrigger value="by-type">
                <BarChart3 className="mr-2 h-4 w-4" />
                Por Tipo IFC
              </TabsTrigger>
              <TabsTrigger value="search">
                <Search className="mr-2 h-4 w-4" />
                Buscar Clases
              </TabsTrigger>
            </TabsList>

            {/* Tab de mapeos por tipo */}
            <TabsContent value="by-type">
              <Card>
                <CardHeader>
                  <CardTitle>Mapeos por Tipo IFC</CardTitle>
                  <CardDescription>
                    Distribución de mapeos bSDD por tipo de elemento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(mappingStats.mappingsByType)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{type}</span>
                          </div>
                          <Badge variant="secondary">{count} elementos</Badge>
                        </div>
                      ))}
                    {Object.keys(mappingStats.mappingsByType).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No hay mapeos disponibles. Ejecuta el enriquecimiento automático.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab de búsqueda */}
            <TabsContent value="search">
              <Card>
                <CardHeader>
                  <CardTitle>Buscar Clases bSDD</CardTitle>
                  <CardDescription>
                    Busca clases y conceptos en el buildingSMART Data Dictionary
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar por nombre o código..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" disabled={searching}>
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {searchQuery.length > 2 && searchResults && (
                    <div className="space-y-2">
                      {searchResults.classes.length > 0 ? (
                        searchResults.classes.map((cls) => (
                          <Dialog key={cls.uri}>
                            <DialogTrigger asChild>
                              <Card className="cursor-pointer hover:bg-accent transition-colors">
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold">{cls.name}</h4>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {cls.code}
                                      </p>
                                      {cls.definition && (
                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                          {cls.definition}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="outline">
                                      <Database className="mr-1 h-3 w-3" />
                                      bSDD
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{cls.name}</DialogTitle>
                                <DialogDescription>{cls.code}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                {cls.definition && (
                                  <div>
                                    <h4 className="font-medium mb-2">Definición</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {cls.definition}
                                    </p>
                                  </div>
                                )}
                                {cls.relatedIfcEntityNames && cls.relatedIfcEntityNames.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Entidades IFC Relacionadas</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {cls.relatedIfcEntityNames.map((entity) => (
                                        <Badge key={entity} variant="secondary">
                                          {entity}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-medium mb-2">URI</h4>
                                  <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                                    {cls.uri}
                                  </code>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No se encontraron resultados para "{searchQuery}"
                        </p>
                      )}
                    </div>
                  )}

                  {searchQuery.length <= 2 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Escribe al menos 3 caracteres para buscar
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
