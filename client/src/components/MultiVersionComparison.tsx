import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

interface MultiComparisonCell {
  oldVersionId: number;
  newVersionId: number;
  totalChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

interface MultiVersionComparisonProps {
  versionIds: number[];
  matrix: MultiComparisonCell[][];
  heatmap: number[][];
  models: Array<{
    id: number;
    name: string;
    elementCount: number;
  }>;
  summary: {
    totalComparisons: number;
    maxChanges: number;
    minChanges: number;
    avgChanges: number;
  };
}

export function MultiVersionComparison({
  versionIds,
  matrix,
  heatmap,
  models,
  summary,
}: MultiVersionComparisonProps) {
  
  const getHeatmapColor = (intensity: number): string => {
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 0.25) return 'bg-green-200';
    if (intensity < 0.5) return 'bg-yellow-200';
    if (intensity < 0.75) return 'bg-orange-200';
    return 'bg-red-200';
  };

  const exportToCSV = () => {
    // Crear encabezados
    const headers = ['Versión', ...models.map(m => m.name)];
    
    // Crear filas con datos
    const rows = models.map((model, i) => {
      const row = [model.name];
      matrix[i].forEach(cell => {
        row.push(cell.totalChanges.toString());
      });
      return row.join(',');
    });

    // Combinar todo
    const csv = [headers.join(','), ...rows].join('\n');

    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparacion-multiple-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas de resumen */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Comparaciones Totales</div>
          <div className="text-2xl font-bold">{summary.totalComparisons}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Máximo Cambios</div>
          <div className="text-2xl font-bold text-red-600">{summary.maxChanges}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Mínimo Cambios</div>
          <div className="text-2xl font-bold text-green-600">{summary.minChanges}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Promedio Cambios</div>
          <div className="text-2xl font-bold text-blue-600">{Math.round(summary.avgChanges)}</div>
        </Card>
      </div>

      {/* Matriz de comparación con heatmap */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Matriz de Cambios</h3>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border bg-gray-50 text-xs font-medium text-gray-600">
                  Versión Antigua →<br/>Versión Nueva ↓
                </th>
                {models.map(model => (
                  <th key={model.id} className="p-2 border bg-gray-50 text-xs font-medium text-gray-600 max-w-[120px]">
                    <div className="truncate" title={model.name}>
                      {model.name}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {model.elementCount} elementos
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map((rowModel, i) => (
                <tr key={rowModel.id}>
                  <td className="p-2 border bg-gray-50 text-xs font-medium text-gray-600 max-w-[120px]">
                    <div className="truncate" title={rowModel.name}>
                      {rowModel.name}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {rowModel.elementCount} elementos
                    </div>
                  </td>
                  {matrix[i].map((cell, j) => (
                    <td
                      key={`${i}-${j}`}
                      className={`p-2 border text-center ${getHeatmapColor(heatmap[i][j])} transition-colors hover:opacity-80 cursor-pointer`}
                      title={`${models[i].name} → ${models[j].name}\nTotal: ${cell.totalChanges}\n+${cell.addedCount} | -${cell.removedCount} | ~${cell.modifiedCount}`}
                    >
                      {i === j ? (
                        <span className="text-gray-400 text-xs">-</span>
                      ) : (
                        <div className="text-xs">
                          <div className="font-bold">{cell.totalChanges}</div>
                          <div className="text-[10px] text-gray-600">
                            +{cell.addedCount} -{cell.removedCount} ~{cell.modifiedCount}
                          </div>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda del heatmap */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
          <span>Intensidad de cambios:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border"></div>
            <span>Sin cambios</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 border"></div>
            <span>Bajo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-200 border"></div>
            <span>Medio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-200 border"></div>
            <span>Alto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 border"></div>
            <span>Muy Alto</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
