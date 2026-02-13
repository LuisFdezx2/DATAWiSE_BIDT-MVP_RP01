import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Thermometer, Droplets, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SensorPanelProps {
  elementId?: number;
}

const SENSOR_ICONS: Record<string, any> = {
  temperature: Thermometer,
  humidity: Droplets,
  energy: Zap,
  default: Activity,
};

const STATUS_COLORS: Record<string, string> = {
  normal: 'bg-green-500',
  warning: 'bg-yellow-500',
  alert: 'bg-red-500',
};

export function SensorPanel({ elementId }: SensorPanelProps) {
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);
  const { data: sensors, isLoading, refetch } = trpc.iot.getSensorsStatus.useQuery();
  const { data: readings } = trpc.iot.getReadings.useQuery(
    { sensorId: selectedSensorId!, limit: 100 },
    { enabled: selectedSensorId !== null }
  );
  const simulateMutation = trpc.iot.simulateAll.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const filteredSensors = elementId
    ? sensors?.filter(s => s.elementId === elementId)
    : sensors;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sensores IoT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando sensores...</p>
        </CardContent>
      </Card>
    );
  }

  if (!filteredSensors || filteredSensors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sensores IoT
          </CardTitle>
          <CardDescription>
            No hay sensores configurados para este elemento
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sensores IoT ({filteredSensors.length})
            </CardTitle>
            <CardDescription>
              Datos en tiempo real de sensores vinculados
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => simulateMutation.mutate()}
            disabled={simulateMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${simulateMutation.isPending ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredSensors.map((sensor) => {
          const Icon = SENSOR_ICONS[sensor.sensorType] || SENSOR_ICONS.default;
          const statusColor = STATUS_COLORS[sensor.status as string] || STATUS_COLORS.normal;

          return (
            <div key={sensor.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{sensor.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{sensor.sensorType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                  <Badge variant={sensor.status === 'alert' ? 'destructive' : 'secondary'}>
                    {sensor.status}
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start mt-2"
                onClick={() => setSelectedSensorId(selectedSensorId === sensor.id ? null : sensor.id)}
              >
                {selectedSensorId === sensor.id ? 'Ocultar' : 'Ver'} historial
              </Button>

              {selectedSensorId === sensor.id && readings && readings.length > 0 && (
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={readings.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString('es-ES')}
                        formatter={(value: any) => [`${value} ${sensor.unit}`, 'Valor']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {sensor.latestValue !== null && sensor.latestValue !== undefined
                    ? sensor.latestValue
                    : '--'}
                </span>
                <span className="text-sm text-muted-foreground">{sensor.unit}</span>
              </div>

              {sensor.latestTimestamp && (
                <p className="text-xs text-muted-foreground">
                  Última lectura: {new Date(sensor.latestTimestamp).toLocaleString('es-ES')}
                </p>
              )}

              {(sensor.minThreshold !== null || sensor.maxThreshold !== null) && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {sensor.minThreshold !== null && (
                    <p>Mínimo: {sensor.minThreshold} {sensor.unit}</p>
                  )}
                  {sensor.maxThreshold !== null && (
                    <p>Máximo: {sensor.maxThreshold} {sensor.unit}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
