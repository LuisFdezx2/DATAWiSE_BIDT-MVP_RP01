import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface CriticalChange {
  expressId: number;
  type: string;
  globalId?: string;
  name?: string;
  changeType: 'added' | 'removed' | 'modified';
  severity: 'high' | 'medium' | 'low';
  description: string;
  propertyChanges?: Array<{
    propertyName: string;
    oldValue: any;
    newValue: any;
  }>;
}

interface CriticalChangesAlertProps {
  criticalChanges: CriticalChange[];
  summary: {
    totalCritical: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}

export function CriticalChangesAlert({ criticalChanges, summary }: CriticalChangesAlertProps) {
  if (summary.totalCritical === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-600">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500">Media</Badge>;
      case 'low':
        return <Badge className="bg-yellow-500">Baja</Badge>;
      default:
        return <Badge>Desconocida</Badge>;
    }
  };

  return (
    <Card className={`p-6 border-2 ${summary.highSeverity > 0 ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
      <div className="flex items-start gap-4">
        <AlertTriangle className={`w-8 h-8 ${summary.highSeverity > 0 ? 'text-red-600' : 'text-orange-600'} flex-shrink-0 mt-1`} />
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ⚠️ Cambios Críticos Detectados en Elementos Estructurales
          </h3>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-2 bg-white rounded border">
              <div className="text-2xl font-bold text-gray-900">{summary.totalCritical}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center p-2 bg-white rounded border border-red-200">
              <div className="text-2xl font-bold text-red-600">{summary.highSeverity}</div>
              <div className="text-xs text-gray-600">Alta Severidad</div>
            </div>
            <div className="text-center p-2 bg-white rounded border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{summary.mediumSeverity}</div>
              <div className="text-xs text-gray-600">Media Severidad</div>
            </div>
            <div className="text-center p-2 bg-white rounded border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{summary.lowSeverity}</div>
              <div className="text-xs text-gray-600">Baja Severidad</div>
            </div>
          </div>

          {summary.highSeverity > 0 && (
            <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded">
              <p className="text-sm text-red-800 font-medium">
                Se han detectado {summary.highSeverity} cambios de alta severidad en elementos estructurales críticos (muros, columnas, vigas, losas). 
                Se ha enviado una notificación al propietario del proyecto.
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Cambios Críticos:</h4>
            {criticalChanges.slice(0, 10).map((change, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${getSeverityColor(change.severity)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityBadge(change.severity)}
                      <span className="text-xs font-mono text-gray-600">
                        {change.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{change.description}</p>
                    {change.globalId && (
                      <p className="text-xs text-gray-600 mt-1">
                        GlobalId: {change.globalId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {criticalChanges.length > 10 && (
              <p className="text-xs text-gray-600 text-center py-2">
                +{criticalChanges.length - 10} cambios críticos más...
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
