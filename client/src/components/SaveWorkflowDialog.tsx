import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface SaveWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string) => Promise<void>;
  defaultName?: string;
  defaultDescription?: string;
  mode?: 'save' | 'edit';
}

/**
 * Diálogo para guardar o editar un workflow personalizado
 */
export function SaveWorkflowDialog({
  open,
  onOpenChange,
  onSave,
  defaultName = '',
  defaultDescription = '',
  mode = 'save',
}: SaveWorkflowDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    // Validar nombre
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(name.trim(), description.trim());
      // Limpiar y cerrar
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(defaultName);
    setDescription(defaultDescription);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'save' ? 'Guardar Workflow' : 'Editar Workflow'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'save'
              ? 'Guarda tu configuración de nodos para reutilizarla más tarde'
              : 'Modifica el nombre y descripción de tu workflow'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nombre */}
          <div className="grid gap-2">
            <Label htmlFor="workflow-name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="workflow-name"
              placeholder="Ej: Validación IDS + bSDD"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Descripción */}
          <div className="grid gap-2">
            <Label htmlFor="workflow-description">Descripción</Label>
            <Textarea
              id="workflow-description"
              placeholder="Describe qué hace este workflow..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#7fb069] hover:bg-[#6fa055] text-white"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'save' ? 'Guardar' : 'Actualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
