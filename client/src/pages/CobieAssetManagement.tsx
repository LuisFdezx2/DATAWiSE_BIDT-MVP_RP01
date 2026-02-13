/**
 * Página de Gestión de Activos COBie
 * 
 * Funcionalidades:
 * - Importación de archivos COBie (.xlsx, .ifc, .xml)
 * - Dashboard de estadísticas de activos
 * - Tabla de componentes/activos
 * - Vinculación con elementos IFC
 */

import { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Upload, Package, FileText, AlertCircle, CheckCircle, Link as LinkIcon, Loader2, Info, ChevronRight, Search, Filter } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Link } from 'wouter';
import { toast } from 'sonner';

export default function CobieAssetManagement() {
  const params = useParams();
  const projectId = parseInt(params.id || '0');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Queries
  const { data: facilities, refetch: refetchFacilities } = trpc.cobie.getFacilities.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );
  
  const { data: components } = trpc.cobie.getComponents.useQuery(
    { facilityId: selectedFacilityId! },
    { enabled: selectedFacilityId !== null }
  );
  
  const { data: stats } = trpc.cobie.getAssetStats.useQuery(
    { facilityId: selectedFacilityId! },
    { enabled: selectedFacilityId !== null }
  );

  const { data: ifcModels } = trpc.ifc.listSavedModels.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );
  
  // Mutations
  const autoLinkMutation = trpc.cobie.autoLink.useMutation({
    onSuccess: (stats) => {
      toast.success(
        `Vinculación completada: ${stats.matchedByGuid + stats.matchedByName} de ${stats.totalComponents} componentes vinculados`,
        {
          description: `Por GUID: ${stats.matchedByGuid}, Por nombre: ${stats.matchedByName}`,
        }
      );
      // Refrescar componentes
      if (selectedFacilityId) {
        refetchFacilities();
      }
    },
    onError: (error) => {
      toast.error('Error en vinculación automática', {
        description: error.message,
      });
    },
  });

  const importMutation = trpc.cobie.importFile.useMutation({
    onSuccess: (result) => {
      toast.success(`COBie importado exitosamente`, {
        description: `${result.summary.components} componentes, ${result.summary.types} tipos, ${result.summary.spaces} espacios`,
      });
      setSelectedFile(null);
      setImporting(false);
      refetchFacilities();
      
      // Seleccionar automáticamente la facility importada
      setSelectedFacilityId(result.facilityId);
      
      // Mostrar warnings si existen
      if (result.validation.warnings.length > 0) {
        toast.warning(`${result.validation.warnings.length} advertencias encontradas`, {
          description: 'Revisa el log para más detalles',
        });
      }
    },
    onError: (error) => {
      toast.error('Error al importar COBie', {
        description: error.message,
      });
      setImporting(false);
    },
  });
  
  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar extensión
      const ext = file.name.toLowerCase().split('.').pop();
      if (!['xlsx', 'xls', 'ifc', 'xml'].includes(ext || '')) {
        toast.error('Formato no soportado', {
          description: 'Solo se aceptan archivos .xlsx, .ifc o .xml',
        });
        return;
      }
      setSelectedFile(file);
    }
  };
  
  // Importar archivo
  const handleImport = async () => {
    if (!selectedFile) return;
    
    setImporting(true);
    
    // Leer archivo como base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const fileData = base64.split(',')[1]; // Remover prefijo data:...;base64,
      
      await importMutation.mutateAsync({
        projectId,
        filename: selectedFile.name,
        fileData,
      });
    };
    reader.readAsDataURL(selectedFile);
  };
  
  // Seleccionar facility
  const handleSelectFacility = (facilityId: number) => {
    setSelectedFacilityId(facilityId);
  };
  
  return (
    <div className="container py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/dashboard">
          <a className="hover:text-foreground transition-colors">Dashboard</a>
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/projects/${projectId}`}>
          <a className="hover:text-foreground transition-colors">Proyecto {projectId}</a>
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Gestión COBie</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestión de Activos COBie</h1>
        <p className="text-muted-foreground">
          Importa y gestiona datos de activos según el estándar COBie
        </p>
      </div>
      
      {/* Botón de importación */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Archivo COBie
          </CardTitle>
          <CardDescription>
            Soporta formatos: Excel (.xlsx), IFC (.ifc), XML (.xml)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls,.ifc,.xml"
              onChange={handleFileSelect}
              className="hidden"
              id="cobie-file-input"
            />
            <label htmlFor="cobie-file-input">
              <Button variant="outline" asChild>
                <span>
                  <FileText className="h-4 w-4 mr-2" />
                  Seleccionar Archivo
                </span>
              </Button>
            </label>
            
            {selectedFile && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedFile.name}
                </span>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? 'Importando...' : 'Importar'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de facilities */}
      {facilities && facilities.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Instalaciones Importadas</CardTitle>
                <CardDescription>
                  Selecciona una instalación para ver sus activos
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {ifcModels && ifcModels.models && ifcModels.models.length > 0 && (
                  <select
                    value={selectedModelId || ''}
                    onChange={(e) => setSelectedModelId(parseInt(e.target.value))}
                    className="px-3 py-1.5 text-sm border rounded-md bg-background"
                  >
                    <option value="">Seleccionar modelo IFC...</option>
                    {ifcModels.models.map((model: any) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.ifcSchema})
                      </option>
                    ))}
                  </select>
                )}
                {selectedModelId && (
                  <Button
                    onClick={() => autoLinkMutation.mutate({ modelId: selectedModelId })}
                    disabled={autoLinkMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    {autoLinkMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Vinculando...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Vincular Automáticamente
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {facilities.map((facility) => (
                <Card
                  key={facility.id}
                  className={`cursor-pointer transition-colors ${
                    selectedFacilityId === facility.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectFacility(facility.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    {facility.description && (
                      <CardDescription className="line-clamp-2">
                        {facility.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {facility.category && <div>Categoría: {facility.category}</div>}
                      {facility.projectPhase && <div>Fase: {facility.projectPhase}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Estadísticas de activos */}
      {selectedFacilityId && stats && (
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Componentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.components}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tipos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.types}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Espacios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.spaces}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sistemas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.systems}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trabajos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.maintenanceJobs}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Mensaje informativo sobre vinculación */}
      {selectedFacilityId && ifcModels && ifcModels.models && ifcModels.models.length > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Vinculación Automática COBie ↔ IFC</p>
                <p className="text-blue-800">
                  Selecciona un modelo IFC y haz clic en "Vincular Automáticamente" para conectar los componentes COBie con sus elementos geométricos correspondientes. 
                  El sistema buscará coincidencias por <strong>GUID</strong> (identificador único) y por <strong>nombre</strong> (similitud fuzzy). 
                  Los componentes vinculados mostrarán un badge verde en la tabla.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabla de componentes */}
      {selectedFacilityId && components && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Components / Assets
                </CardTitle>
                <CardDescription>
                  List of components imported from COBie
                </CardDescription>
              </div>
            </div>
            
            {/* Search and filters */}
            <div className="flex gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Array.from(new Set(components.map(c => c.typeName).filter(Boolean))).map(type => (
                    <SelectItem key={type} value={type!}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="linked">Linked</SelectItem>
                  <SelectItem value="unlinked">Unlinked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {components.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No components in this facility
              </div>
            ) : (() => {
              // Apply filters
              const filtered = components.filter(component => {
                // Search filter
                const matchesSearch = searchQuery === '' || 
                  component.name.toLowerCase().includes(searchQuery.toLowerCase());
                
                // Type filter
                const matchesType = filterType === 'all' || component.typeName === filterType;
                
                // Status filter
                const matchesStatus = filterStatus === 'all' ||
                  (filterStatus === 'linked' && component.ifcGuid) ||
                  (filterStatus === 'unlinked' && !component.ifcGuid);
                
                return matchesSearch && matchesType && matchesStatus;
              });
              
              return filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No components match the filters
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mb-3">
                    Showing {filtered.length} of {components.length} components
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Space</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Identifier</TableHead>
                        <TableHead>IFC Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">
                        {component.name}
                      </TableCell>
                      <TableCell>{component.typeName || '-'}</TableCell>
                      <TableCell>{component.spaceName || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {component.serialNumber || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {component.assetIdentifier || '-'}
                      </TableCell>
                      <TableCell>
                        {component.ifcGuid ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Vinculado</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Sin vincular</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                       ))}
                    </TableBody>
                  </Table>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
      
      {/* Mensaje inicial si no hay facilities */}
      {(!facilities || facilities.length === 0) && !importing && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                No hay datos COBie importados
              </p>
              <p className="text-sm">
                Importa un archivo COBie para comenzar a gestionar activos
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
