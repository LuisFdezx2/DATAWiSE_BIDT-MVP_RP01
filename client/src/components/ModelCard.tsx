import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Box, Calendar, FileCode, Layers, GitCompare } from 'lucide-react';

interface ModelCardProps {
  model: {
    id: number;
    name: string;
    ifcSchema?: string | null;
    elementCount?: number | null;
    createdAt: Date;
    statistics?: {
      totalElements: number;
      elementsByType: Record<string, number>;
    } | null;
  };
  onViewIn3D: (modelId: number) => void;
  onCompare?: (modelId: number) => void;
}

/**
 * Card para mostrar información de un modelo IFC guardado
 */
export function ModelCard({ model, onViewIn3D, onCompare }: ModelCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getElementCount = () => {
    if (model.statistics?.totalElements) {
      return model.statistics.totalElements;
    }
    return model.elementCount || 0;
  };

  const getTopElementTypes = () => {
    if (!model.statistics?.elementsByType) {
      return [];
    }

    return Object.entries(model.statistics.elementsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));
  };

  const topTypes = getTopElementTypes();

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <FileCode className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate" title={model.name}>
                {model.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {model.ifcSchema && (
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full font-medium">
                    {model.ifcSchema}
                  </span>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {getElementCount()} elementos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Element Types */}
        {topTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topTypes.map(({ type, count }) => (
              <span
                key={type}
                className="text-xs px-2 py-1 bg-muted/50 rounded text-muted-foreground"
              >
                {type.replace('Ifc', '')}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(model.createdAt)}
          </span>
          <div className="flex gap-2">
            {onCompare && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onCompare(model.id)}
              >
                <GitCompare className="h-3 w-3 mr-1" />
                Comparar
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 text-xs bg-[#7fb069] hover:bg-[#6fa055] text-white"
              onClick={() => onViewIn3D(model.id)}
            >
              <Box className="h-3 w-3 mr-1" />
              Ver en 3D
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
