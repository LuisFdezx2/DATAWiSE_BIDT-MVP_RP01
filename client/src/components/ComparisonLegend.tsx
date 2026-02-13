import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Edit, Eye, EyeOff } from 'lucide-react';
import { useComparison } from '@/contexts/ComparisonContext';

interface ComparisonLegendProps {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

export function ComparisonLegend({ addedCount, removedCount, modifiedCount }: ComparisonLegendProps) {
  const { filters, setFilters } = useComparison();

  const toggleFilter = (filterName: 'showAdded' | 'showRemoved' | 'showModified') => {
    setFilters({
      ...filters,
      [filterName]: !filters[filterName],
    });
  };

  return (
    <Card className="absolute top-4 right-4 p-4 bg-white/95 backdrop-blur-sm shadow-lg z-10">
      <h3 className="text-sm font-semibold mb-3 text-gray-900">Leyenda de Comparación</h3>
      <div className="space-y-2">
        {/* Añadidos */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-400 border border-green-600"></div>
          <Plus className="w-3 h-3 text-green-600" />
          <span className="text-xs text-gray-700 flex-1">Añadidos ({addedCount})</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleFilter('showAdded')}
            title={filters.showAdded ? 'Ocultar añadidos' : 'Mostrar añadidos'}
          >
            {filters.showAdded ? (
              <Eye className="w-3 h-3 text-green-600" />
            ) : (
              <EyeOff className="w-3 h-3 text-gray-400" />
            )}
          </Button>
        </div>

        {/* Eliminados */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-400 border border-red-600"></div>
          <Minus className="w-3 h-3 text-red-600" />
          <span className="text-xs text-gray-700 flex-1">Eliminados ({removedCount})</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleFilter('showRemoved')}
            title={filters.showRemoved ? 'Ocultar eliminados' : 'Mostrar eliminados'}
          >
            {filters.showRemoved ? (
              <Eye className="w-3 h-3 text-red-600" />
            ) : (
              <EyeOff className="w-3 h-3 text-gray-400" />
            )}
          </Button>
        </div>

        {/* Modificados */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-600"></div>
          <Edit className="w-3 h-3 text-yellow-600" />
          <span className="text-xs text-gray-700 flex-1">Modificados ({modifiedCount})</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleFilter('showModified')}
            title={filters.showModified ? 'Ocultar modificados' : 'Mostrar modificados'}
          >
            {filters.showModified ? (
              <Eye className="w-3 h-3 text-yellow-600" />
            ) : (
              <EyeOff className="w-3 h-3 text-gray-400" />
            )}
          </Button>
        </div>
      </div>

      {/* Botón para resetear filtros */}
      {(!filters.showAdded || !filters.showRemoved || !filters.showModified) && (
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setFilters({ showAdded: true, showRemoved: true, showModified: true })}
          >
            Mostrar Todos
          </Button>
        </div>
      )}
    </Card>
  );
}
