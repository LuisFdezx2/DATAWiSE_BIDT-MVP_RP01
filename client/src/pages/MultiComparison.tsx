import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { MultiVersionComparison } from '@/components/MultiVersionComparison';

export default function MultiComparison() {
  const [, setLocation] = useLocation();
  const [versionIds, setVersionIds] = useState<number[]>([]);

  // Leer IDs de versiones desde URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get('ids');
    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter(id => !isNaN(id));
      setVersionIds(ids);
    }
  }, []);

  // Obtener comparación múltiple
  const { data: comparison, isLoading } = trpc.comparison.compareMultiple.useQuery(
    { modelIds: versionIds },
    { enabled: versionIds.length >= 2 }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/comparison')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Comparación
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comparación Múltiple de Versiones</h1>
            <p className="text-gray-600">Matriz de cambios entre {versionIds.length} versiones</p>
          </div>
        </div>

        {isLoading && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#7fb069] animate-spin mb-4" />
              <p className="text-gray-600">Generando matriz de comparación...</p>
              <p className="text-sm text-gray-400 mt-2">
                Comparando {versionIds.length} versiones ({versionIds.length * (versionIds.length - 1)} comparaciones)
              </p>
            </div>
          </Card>
        )}

        {!isLoading && comparison && (
          <MultiVersionComparison
            versionIds={comparison.versionIds}
            matrix={comparison.matrix}
            heatmap={comparison.heatmap}
            models={comparison.models}
            summary={comparison.summary}
          />
        )}

        {!isLoading && !comparison && versionIds.length < 2 && (
          <Card className="p-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Selecciona al menos 2 versiones
              </h3>
              <p className="text-gray-600">
                Vuelve a la página de comparación y selecciona entre 2 y 5 versiones para comparar
              </p>
              <Button
                className="mt-4 bg-[#7fb069] hover:bg-[#6fa055] text-white"
                onClick={() => setLocation('/comparison')}
              >
                Ir a Comparación
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
