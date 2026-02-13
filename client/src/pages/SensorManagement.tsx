import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, Wifi, WifiOff, Activity, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfigureSensorDialog } from "@/components/ConfigureSensorDialog";

/**
 * Página de Gestión de Sensores IoT
 * 
 * Permite a los usuarios:
 * - Ver lista de todos los sensores del proyecto
 * - Ver estado de configuración de API (activa/fallback/no configurada)
 * - Configurar APIs externas para cada sensor
 * - Validar conexión en tiempo real
 */

export function SensorManagement() {
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  
  // Obtener lista de proyectos
  const { data: projects } = trpc.bimProjects.list.useQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Obtener sensores del proyecto seleccionado
  const { data: sensors, isLoading, refetch } = trpc.iot.listSensorsByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: selectedProjectId !== null }
  );

  const handleConfigureSensor = (sensorId: number) => {
    setSelectedSensorId(sensorId);
    setIsConfigDialogOpen(true);
  };

  const handleConfigSaved = () => {
    refetch();
    toast.success('Configuración de sensor guardada');
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>No hay proyectos disponibles. Crea un proyecto primero.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Sensores IoT</h1>
        <p className="text-muted-foreground mt-2">
          Configura APIs externas para obtener datos reales de sensores
        </p>
      </div>

      {/* Selector de Proyecto */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Proyecto:</label>
          <select
            value={selectedProjectId?.toString() || ''}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="">Selecciona un proyecto</option>
            {projects.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Lista de Sensores */}
      {selectedProjectId && (
        <>
          {isLoading ? (
            <Card>
              <CardContent className="p-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#7fb069]" />
                </div>
              </CardContent>
            </Card>
          ) : sensors && sensors.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sensors.map((sensor: any) => (
                <SensorCard
                  key={sensor.id}
                  sensor={sensor}
                  onConfigure={() => handleConfigureSensor(sensor.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>No hay sensores en este proyecto.</p>
                  <p className="text-sm mt-2">Los sensores se crean automáticamente al cargar modelos IFC.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal de Configuración */}
      {selectedSensorId && (
        <ConfigureSensorDialog
          sensorId={selectedSensorId}
          open={isConfigDialogOpen}
          onOpenChange={setIsConfigDialogOpen}
          onSaved={handleConfigSaved}
        />
      )}
    </div>
  );
}

/**
 * Componente de tarjeta de sensor individual
 */
function SensorCard({ sensor, onConfigure }: { sensor: any; onConfigure: () => void }) {
  const hasApiConfig = sensor.apiUrl && sensor.apiType;
  const isActive = hasApiConfig && sensor.status === 'active';
  const isFallback = hasApiConfig && sensor.status !== 'active';
  const isNotConfigured = !hasApiConfig;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{sensor.name}</CardTitle>
            <CardDescription className="mt-1">
              {sensor.sensorType} • {sensor.unit}
            </CardDescription>
          </div>
          <ApiStatusBadge
            isActive={isActive}
            isFallback={isFallback}
            isNotConfigured={isNotConfigured}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Información del Sensor */}
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo:</span>
            <span className="font-medium">{sensor.sensorType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unidad:</span>
            <span className="font-medium">{sensor.unit}</span>
          </div>
          {sensor.minThreshold !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Umbral mín:</span>
              <span className="font-medium">{sensor.minThreshold}</span>
            </div>
          )}
          {sensor.maxThreshold !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Umbral máx:</span>
              <span className="font-medium">{sensor.maxThreshold}</span>
            </div>
          )}
        </div>

        {/* Estado de API */}
        {hasApiConfig && (
          <div className="pt-2 border-t text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo API:</span>
              <span className="font-medium uppercase">{sensor.apiType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">URL:</span>
              <span className="font-medium text-xs truncate max-w-[150px]" title={sensor.apiUrl}>
                {sensor.apiUrl}
              </span>
            </div>
          </div>
        )}

        {/* Botón de Configuración */}
        <Button
          onClick={onConfigure}
          variant="outline"
          className="w-full mt-2"
        >
          <Settings className="mr-2 h-4 w-4" />
          {hasApiConfig ? 'Editar Configuración' : 'Configurar API'}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Badge de estado de API
 */
function ApiStatusBadge({
  isActive,
  isFallback,
  isNotConfigured,
}: {
  isActive: boolean;
  isFallback: boolean;
  isNotConfigured: boolean;
}) {
  if (isActive) {
    return (
      <Badge className="bg-green-500 hover:bg-green-600 text-white">
        <Wifi className="mr-1 h-3 w-3" />
        API Activa
      </Badge>
    );
  }

  if (isFallback) {
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
        <Activity className="mr-1 h-3 w-3" />
        Fallback
      </Badge>
    );
  }

  if (isNotConfigured) {
    return (
      <Badge variant="secondary">
        <WifiOff className="mr-1 h-3 w-3" />
        Sin API
      </Badge>
    );
  }

  return null;
}
