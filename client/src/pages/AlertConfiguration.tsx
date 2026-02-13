import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, Plus, Trash2, Edit, AlertTriangle } from 'lucide-react';

export default function AlertConfiguration() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);

  // Queries
  const { data: projects = [] } = trpc.bimProjects.list.useQuery();
  const { data: alerts = [], refetch: refetchAlerts } = trpc.iot.getAlertConfigurations.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  );
  const { data: alertHistory = [] } = trpc.iot.getAlertHistory.useQuery(
    { projectId: selectedProject!, limit: 50 },
    { enabled: !!selectedProject }
  );

  // Mutations
  const createAlert = trpc.iot.createAlertConfiguration.useMutation({
    onSuccess: () => {
      toast.success('Alerta creada exitosamente');
      refetchAlerts();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Error al crear alerta: ${error.message}`);
    },
  });

  const updateAlert = trpc.iot.updateAlertConfiguration.useMutation({
    onSuccess: () => {
      toast.success('Alerta actualizada exitosamente');
      refetchAlerts();
      setIsDialogOpen(false);
      setEditingAlert(null);
    },
    onError: (error) => {
      toast.error(`Error al actualizar alerta: ${error.message}`);
    },
  });

  const deleteAlert = trpc.iot.deleteAlertConfiguration.useMutation({
    onSuccess: () => {
      toast.success('Alerta eliminada exitosamente');
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(`Error al eliminar alerta: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      projectId: selectedProject!,
      name: formData.get('name') as string,
      alertType: formData.get('alertType') as 'critical_sensor' | 'low_success_rate' | 'high_latency',
      threshold: parseInt(formData.get('threshold') as string),
      webhookUrl: formData.get('webhookUrl') as string || undefined,
      notifyOwner: formData.get('notifyOwner') === 'on',
      enabled: formData.get('enabled') === 'on',
    };

    if (editingAlert) {
      updateAlert.mutate({ id: editingAlert.id, ...data });
    } else {
      createAlert.mutate(data);
    }
  };

  const handleEdit = (alert: any) => {
    setEditingAlert(alert);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta alerta?')) {
      deleteAlert.mutate({ id });
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      critical_sensor: 'Sensor Crítico',
      low_success_rate: 'Baja Tasa de Éxito',
      high_latency: 'Alta Latencia',
    };
    return labels[type] || type;
  };

  const getAlertTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      critical_sensor: 'destructive',
      low_success_rate: 'secondary',
      high_latency: 'default',
    };
    return variants[type] || 'default';
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Configuración de Alertas
          </h1>
          <p className="text-muted-foreground mt-2">
            Configura alertas automáticas para sensores IoT críticos
          </p>
        </div>
      </div>

      {/* Selector de proyecto */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Proyecto</CardTitle>
          <CardDescription>Elige el proyecto para configurar alertas</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProject?.toString() || ''}
            onValueChange={(value) => setSelectedProject(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProject && (
        <>
          {/* Lista de alertas configuradas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Alertas Configuradas</CardTitle>
                <CardDescription>Gestiona las reglas de alertas activas</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingAlert(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Alerta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>
                        {editingAlert ? 'Editar Alerta' : 'Nueva Alerta'}
                      </DialogTitle>
                      <DialogDescription>
                        Configura una nueva regla de alerta para sensores IoT
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Ej: Alerta de temperatura crítica"
                          defaultValue={editingAlert?.name}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="alertType">Tipo de Alerta</Label>
                        <Select name="alertType" defaultValue={editingAlert?.alertType || 'critical_sensor'} required>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical_sensor">Sensor Crítico</SelectItem>
                            <SelectItem value="low_success_rate">Baja Tasa de Éxito</SelectItem>
                            <SelectItem value="high_latency">Alta Latencia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="threshold">Umbral</Label>
                        <Input
                          id="threshold"
                          name="threshold"
                          type="number"
                          placeholder="Ej: 70 (para % o ms)"
                          defaultValue={editingAlert?.threshold}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          Para tasa de éxito: porcentaje mínimo (0-100).
                          Para latencia: milisegundos máximos.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="webhookUrl">URL del Webhook (opcional)</Label>
                        <Input
                          id="webhookUrl"
                          name="webhookUrl"
                          type="url"
                          placeholder="https://ejemplo.com/webhook"
                          defaultValue={editingAlert?.webhookUrl}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="notifyOwner"
                          name="notifyOwner"
                          defaultChecked={editingAlert?.notifyOwner ?? true}
                        />
                        <Label htmlFor="notifyOwner">Notificar al propietario</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enabled"
                          name="enabled"
                          defaultChecked={editingAlert?.enabled ?? true}
                        />
                        <Label htmlFor="enabled">Alerta habilitada</Label>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="submit">
                        {editingAlert ? 'Actualizar' : 'Crear'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay alertas configuradas para este proyecto</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Umbral</TableHead>
                      <TableHead>Webhook</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.name}</TableCell>
                        <TableCell>
                          <Badge variant={getAlertTypeBadgeVariant(alert.alertType)}>
                            {getAlertTypeLabel(alert.alertType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alert.threshold}
                          {alert.alertType === 'high_latency' ? 'ms' : '%'}
                        </TableCell>
                        <TableCell>
                          {alert.webhookUrl ? (
                            <Badge variant="outline">Configurado</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.enabled ? 'default' : 'secondary'}>
                            {alert.enabled ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(alert)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Historial de alertas */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Alertas</CardTitle>
              <CardDescription>Últimas 50 alertas enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              {alertHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No se han enviado alertas aún</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Mensaje</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Webhook</TableHead>
                      <TableHead>Notificación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.sentAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getAlertTypeBadgeVariant(entry.alertType)}>
                            {getAlertTypeLabel(entry.alertType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {entry.message}
                        </TableCell>
                        <TableCell>
                          {entry.triggerValue} / {entry.threshold}
                        </TableCell>
                        <TableCell>
                          {entry.webhookSent ? (
                            <Badge variant="default">Enviado</Badge>
                          ) : (
                            <Badge variant="secondary">No enviado</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.ownerNotified ? (
                            <Badge variant="default">Notificado</Badge>
                          ) : (
                            <Badge variant="secondary">No notificado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
