import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, GitCompare, Box } from 'lucide-react';

interface Version {
  id: number;
  name: string;
  versionNumber: number;
  createdAt: string;
  elementCount: number;
}

interface VersionGroup {
  baseName: string;
  versions: Version[];
}

interface VersionTimelineProps {
  versionHistory: VersionGroup[];
  onCompare: (oldVersionId: number, newVersionId: number) => void;
  onMultiCompare?: (versionIds: number[]) => void;
}

export function VersionTimeline({ versionHistory, onCompare, onMultiCompare }: VersionTimelineProps) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

  const handleVersionClick = (versionId: number) => {
    if (selectedVersions.includes(versionId)) {
      // Deseleccionar
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
    } else {
      // Seleccionar (máximo 5 para comparación múltiple, 2 para comparación normal)
      const maxSelections = onMultiCompare ? 5 : 2;
      if (selectedVersions.length < maxSelections) {
        setSelectedVersions([...selectedVersions, versionId]);
      } else {
        // Reemplazar la primera selección
        setSelectedVersions([...selectedVersions.slice(1), versionId]);
      }
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2 && !onMultiCompare) {
      // Comparación normal (2 versiones)
      const [v1, v2] = selectedVersions;
      const allVersions = versionHistory.flatMap(group => group.versions);
      const version1 = allVersions.find(v => v.id === v1);
      const version2 = allVersions.find(v => v.id === v2);

      if (version1 && version2) {
        const oldVersion = new Date(version1.createdAt) < new Date(version2.createdAt) ? v1 : v2;
        const newVersion = oldVersion === v1 ? v2 : v1;
        onCompare(oldVersion, newVersion);
      }
    } else if (selectedVersions.length >= 2 && onMultiCompare) {
      // Comparación múltiple (2-5 versiones)
      // Ordenar por fecha de creación
      const allVersions = versionHistory.flatMap(group => group.versions);
      const sortedVersionIds = selectedVersions
        .map(id => allVersions.find(v => v.id === id))
        .filter(v => v !== undefined)
        .sort((a, b) => new Date(a!.createdAt).getTime() - new Date(b!.createdAt).getTime())
        .map(v => v!.id);
      
      onMultiCompare(sortedVersionIds);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historial de Versiones</h2>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona dos versiones para compararlas
          </p>
        </div>
        {selectedVersions.length === 2 && (
          <Button onClick={handleCompare} className="bg-[#7fb069] hover:bg-[#6fa055]">
            <GitCompare className="w-4 h-4 mr-2" />
            Comparar Versiones
          </Button>
        )}
      </div>

      {/* Timeline por grupo de modelos */}
      {versionHistory.map((group) => (
        <Card key={group.baseName} className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Box className="w-5 h-5 text-[#7fb069]" />
            {group.baseName}
          </h3>

          <div className="relative">
            {/* Línea vertical del timeline */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {/* Versiones */}
            <div className="space-y-4">
              {group.versions.map((version, index) => {
                const isSelected = selectedVersions.includes(version.id);
                const isFirst = index === 0;
                const isLast = index === group.versions.length - 1;

                return (
                  <div
                    key={version.id}
                    className="relative pl-14 cursor-pointer"
                    onClick={() => handleVersionClick(version.id)}
                  >
                    {/* Punto en la línea */}
                    <div
                      className={`absolute left-4 top-2 w-5 h-5 rounded-full border-4 ${
                        isSelected
                          ? 'bg-[#7fb069] border-[#7fb069]'
                          : 'bg-white border-gray-300'
                      } transition-colors`}
                    ></div>

                    {/* Contenido de la versión */}
                    <div
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-[#7fb069] bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {version.name}
                            </span>
                            <Badge variant={isLast ? 'default' : 'secondary'}>
                              {isLast ? 'Última versión' : `v${version.versionNumber}`}
                            </Badge>
                            {isSelected && (
                              <Badge className="bg-[#7fb069]">
                                Seleccionada
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(version.createdAt)}
                            </span>
                            <span>
                              {version.elementCount.toLocaleString()} elementos
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ))}

      {versionHistory.length === 0 && (
        <Card className="p-12 text-center">
          <Box className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay versiones disponibles</p>
        </Card>
      )}
    </div>
  );
}
