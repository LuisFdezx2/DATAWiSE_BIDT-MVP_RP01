import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { toast } from "sonner";

/**
 * Diálogo de Configuración de Sensor IoT
 * 
 * Permite configurar la API externa de un sensor:
 * - URL del endpoint
 * - Tipo de API (HTTP/MQTT)
 * - API Key para autenticación
 * - Topic MQTT (solo para MQTT)
 * - Validación en tiempo real
 * - Preview de última lectura
 */

interface ConfigureSensorDialogProps {
  sensorId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ConfigureSensorDialog({
  sensorId,
  open,
  onOpenChange,
  onSaved,
}: ConfigureSensorDialogProps) {
  const [apiUrl, setApiUrl] = useState('');
  const [apiType, setApiType] = useState<'http' | 'mqtt'>('http');
  const [apiKey, setApiKey] = useState('');
  const [mqttTopic, setMqttTopic] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<any>(null);

  // Obtener configuración actual del sensor
  const { data: sensorConfig, isLoading: isLoadingConfig } = trpc.iot.getSensorConfig.useQuery(
    { sensorId },
    { enabled: open }
  );

  // Mutation para guardar configuración
  const saveMutation = trpc.iot.updateSensorConfig.useMutation({
    onSuccess: () => {
      toast.success('Configuración guardada exitosamente');
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });

  // Mutation para probar conexión
  const testMutation = trpc.iot.testConnection.useMutation({
    onSuccess: (data) => {
      setTestStatus('success');
      setTestResult(data);
      toast.success('Conexión exitosa');
    },
    onError: (error) => {
      setTestStatus('error');
      setTestResult({ error: error.message });
      toast.error(`Error de conexión: ${error.message}`);
    },
  });

  // Cargar configuración existente
  useEffect(() => {
    if (sensorConfig) {
      setApiUrl(sensorConfig.apiUrl || '');
      setApiType((sensorConfig.apiType as 'http' | 'mqtt') || 'http');
      setApiKey(sensorConfig.apiKey || '');
      setMqttTopic(sensorConfig.mqttTopic || '');
    }
  }, [sensorConfig]);

  // Resetear estado al cerrar
  useEffect(() => {
    if (!open) {
      setTestStatus('idle');
      setTestResult(null);
    }
  }, [open]);

  const handleTestConnection = () => {
    if (!apiUrl) {
      toast.error('Ingresa una URL primero');
      return;
    }

    setTestStatus('testing');
    testMutation.mutate({
      apiUrl,
      apiType,
      apiKey: apiKey || undefined,
      mqttTopic: apiType === 'mqtt' ? mqttTopic : undefined,
    });
  };

  const handleSave = () => {
    if (!apiUrl) {
      toast.error('La URL es requerida');
      return;
    }

    if (apiType === 'mqtt' && !mqttTopic) {
      toast.error('El topic MQTT es requerido');
      return;
    }

    saveMutation.mutate({
      sensorId,
      apiUrl,
      apiType,
      apiKey: apiKey || undefined,
      mqttTopic: apiType === 'mqtt' ? mqttTopic : undefined,
    });
  };

  const handleRemoveConfig = () => {
    // Cambiar a simulador para eliminar configuración de API
    saveMutation.mutate({
      sensorId,
      apiUrl: '',
      apiType: 'simulator',
      apiKey: '',
      mqttTopic: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configurar API de Sensor</DialogTitle>
          <DialogDescription>
            Configura la API externa para obtener datos reales del sensor.
            Deja los campos vacíos para usar el simulador.
          </DialogDescription>
        </DialogHeader>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#7fb069]" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Tipo de API */}
            <div className="space-y-2">
              <Label htmlFor="apiType">Tipo de API</Label>
              <Select value={apiType} onValueChange={(value) => setApiType(value as 'http' | 'mqtt')}>
                <SelectTrigger id="apiType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP/REST</SelectItem>
                  <SelectItem value="mqtt">MQTT</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {apiType === 'http' ? 'API REST que retorna JSON con el valor del sensor' : 'Broker MQTT para recibir mensajes en tiempo real'}
              </p>
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="apiUrl">
                {apiType === 'http' ? 'URL del Endpoint' : 'URL del Broker MQTT'}
              </Label>
              <Input
                id="apiUrl"
                placeholder={apiType === 'http' ? 'https://api.example.com/sensor/123' : 'mqtt://broker.example.com:1883'}
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (opcional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Tu API key para autenticación"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se enviará en el header Authorization: Bearer [key]
              </p>
            </div>

            {/* MQTT Topic (solo para MQTT) */}
            {apiType === 'mqtt' && (
              <div className="space-y-2">
                <Label htmlFor="mqttTopic">Topic MQTT</Label>
                <Input
                  id="mqttTopic"
                  placeholder="sensors/temperature/room1"
                  value={mqttTopic}
                  onChange={(e) => setMqttTopic(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Topic al que suscribirse para recibir lecturas
                </p>
              </div>
            )}

            {/* Botón de Prueba */}
            <div className="pt-2">
              <Button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing' || !apiUrl}
                variant="outline"
                className="w-full"
              >
                {testStatus === 'testing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando conexión...
                  </>
                ) : (
                  <>
                    <Wifi className="mr-2 h-4 w-4" />
                    Probar Conexión
                  </>
                )}
              </Button>
            </div>

            {/* Resultado de Prueba */}
            {testStatus === 'success' && testResult && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Conexión exitosa
                    </p>
                    {testResult.value !== undefined && (
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Última lectura: <span className="font-mono">{testResult.value}</span>
                        {testResult.unit && ` ${testResult.unit}`}
                      </p>
                    )}
                    {testResult.timestamp && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {new Date(testResult.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {testStatus === 'error' && testResult && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900 dark:text-red-100">
                      Error de conexión
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {testResult.error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {sensorConfig?.apiUrl && (
            <Button
              onClick={handleRemoveConfig}
              variant="destructive"
              disabled={saveMutation.isPending}
            >
              Eliminar Configuración
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !apiUrl}
            className="bg-[#7fb069] hover:bg-[#6a9959] text-white"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
