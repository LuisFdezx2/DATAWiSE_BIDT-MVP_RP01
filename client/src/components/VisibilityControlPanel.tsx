import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Layers } from 'lucide-react';

interface VisibilityControlPanelProps {
  elementTypes: string[];
  elementCountsByType: Record<string, number>;
  onVisibilityChange: (visibleTypes: Set<string>) => void;
  className?: string;
}

/**
 * Panel de control de visibilidad por tipo de elemento IFC
 * Permite mostrar/ocultar categorías específicas de elementos
 */
export function VisibilityControlPanel({
  elementTypes,
  elementCountsByType,
  onVisibilityChange,
  className,
}: VisibilityControlPanelProps) {
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(elementTypes));

  // Notificar cambios al componente padre
  useEffect(() => {
    onVisibilityChange(visibleTypes);
  }, [visibleTypes, onVisibilityChange]);

  const handleToggleType = (type: string) => {
    const newVisibleTypes = new Set(visibleTypes);
    if (newVisibleTypes.has(type)) {
      newVisibleTypes.delete(type);
    } else {
      newVisibleTypes.add(type);
    }
    setVisibleTypes(newVisibleTypes);
  };

  const handleShowAll = () => {
    setVisibleTypes(new Set(elementTypes));
  };

  const handleHideAll = () => {
    setVisibleTypes(new Set());
  };

  // Mapeo de tipos IFC a nombres legibles
  const typeLabels: Record<string, string> = {
    'IfcWall': 'Muros',
    'IfcWallStandardCase': 'Muros Estándar',
    'IfcWindow': 'Ventanas',
    'IfcDoor': 'Puertas',
    'IfcSlab': 'Losas',
    'IfcColumn': 'Columnas',
    'IfcBeam': 'Vigas',
    'IfcSpace': 'Espacios',
    'IfcBuilding': 'Edificio',
    'IfcBuildingStorey': 'Planta',
    'IfcSite': 'Sitio',
    'IfcProject': 'Proyecto',
    'IfcStair': 'Escaleras',
    'IfcRailing': 'Barandillas',
    'IfcRoof': 'Techos',
    'IfcFurnishingElement': 'Mobiliario',
  };

  const getTypeLabel = (type: string): string => {
    return typeLabels[type] || type;
  };

  const totalVisible = Array.from(visibleTypes).reduce(
    (sum, type) => sum + (elementCountsByType[type] || 0),
    0
  );

  const totalElements = Object.values(elementCountsByType).reduce((sum, count) => sum + count, 0);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Visibilidad</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {totalVisible} / {totalElements}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={handleShowAll}
        >
          <Eye className="h-3 w-3 mr-1" />
          Mostrar Todo
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={handleHideAll}
        >
          <EyeOff className="h-3 w-3 mr-1" />
          Ocultar Todo
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {elementTypes.map((type) => {
          const count = elementCountsByType[type] || 0;
          const isVisible = visibleTypes.has(type);

          return (
            <div
              key={type}
              className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1">
                <Checkbox
                  id={`visibility-${type}`}
                  checked={isVisible}
                  onCheckedChange={() => handleToggleType(type)}
                />
                <label
                  htmlFor={`visibility-${type}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {getTypeLabel(type)}
                </label>
              </div>
              <span className="text-xs text-muted-foreground ml-2">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
