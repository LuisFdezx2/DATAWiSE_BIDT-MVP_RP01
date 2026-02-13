import { useParams, Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileCheck,
  Database,
  Sparkles,
  FileBarChart,
  ArrowRight,
  Calendar,
  Folder,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id) : 0;

  // Datos del proyecto (simplificado)
  const project = projectId > 0 ? {
    id: projectId,
    name: `Proyecto ${projectId}`,
    description: 'Proyecto BIM con herramientas de procesamiento y validación',
    createdAt: new Date().toISOString(),
  } : null;
  const loadingProject = false;

  // Query para obtener modelos IFC del proyecto
  const { data: ifcModels, isLoading: loadingModels } = trpc.ifc.listSavedModels.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // Estadísticas simplificadas (se cargarán al acceder a cada herramienta)
  const cobieStats = null;

  if (loadingProject) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-900">Proyecto no encontrado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tools = [
    {
      title: 'Gestión de Activos COBie',
      description: 'Gestiona datos COBie y vincula componentes con elementos IFC geométricos',
      icon: FileBarChart,
      path: `/projects/${projectId}/cobie`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      stats: undefined,
    },
    {
      title: 'Validación IDS',
      description: 'Valida modelos IFC contra especificaciones IDS estándar',
      icon: FileCheck,
      path: `/projects/${projectId}/ids-validation`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      stats: ifcModels?.models?.length ? `${ifcModels.models.length} modelos disponibles` : undefined,
    },
    {
      title: 'Enriquecimiento bSDD',
      description: 'Enriquece elementos IFC con datos semánticos de buildingSMART Data Dictionary',
      icon: Sparkles,
      path: `/projects/${projectId}/bsdd-enrichment`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      stats: ifcModels?.models?.length ? `${ifcModels.models.length} modelos disponibles` : undefined,
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard">
          <a className="hover:text-foreground transition-colors">Dashboard</a>
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* Header del proyecto */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-2">{project.description}</p>
            )}
          </div>
          <Badge variant="outline" className="text-sm">
            <Folder className="mr-1 h-3 w-3" />
            Proyecto BIM
          </Badge>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Creado {new Date(project.createdAt).toLocaleDateString('es-ES')}</span>
          </div>
          {ifcModels?.models && (
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>{ifcModels.models.length} modelo{ifcModels.models.length !== 1 ? 's' : ''} IFC</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Modelos IFC del proyecto */}
      {loadingModels ? (
        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : ifcModels?.models && ifcModels.models.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Modelos IFC</CardTitle>
            <CardDescription>
              Modelos procesados disponibles en este proyecto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ifcModels.models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{model.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{model.ifcSchema}</span>
                      <span>•</span>
                      <span>{model.elementCount} elementos</span>
                      <span>•</span>
                      <span>Procesado {new Date(model.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    <Database className="mr-1 h-3 w-3" />
                    IFC
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay modelos IFC procesados en este proyecto</p>
            <p className="text-sm mt-1">Procesa un archivo IFC para comenzar</p>
          </CardContent>
        </Card>
      )}

      {/* Herramientas disponibles */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Herramientas Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Link key={tool.path} href={tool.path}>
              <a className="block h-full">
                <Card className="h-full hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-3`}>
                      <tool.icon className={`h-6 w-6 ${tool.color}`} />
                    </div>
                    <CardTitle className="text-lg">{tool.title}</CardTitle>
                    <CardDescription className="min-h-[40px]">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {tool.stats ? (
                        <span className="text-sm text-muted-foreground">{tool.stats}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Disponible</span>
                      )}
                      <Button variant="ghost" size="sm" className="gap-2">
                        Abrir
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      </div>


    </div>
  );
}
