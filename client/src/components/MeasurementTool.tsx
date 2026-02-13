import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ruler, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MeasurementPoint {
  x: number;
  y: number;
  z: number;
}

interface Measurement {
  id: string;
  start: MeasurementPoint;
  end: MeasurementPoint;
  distance: number;
}

interface MeasurementToolProps {
  isActive: boolean;
  onToggle: () => void;
  measurements: Measurement[];
  onClearMeasurements: () => void;
}

export function MeasurementTool({
  isActive,
  onToggle,
  measurements,
  onClearMeasurements,
}: MeasurementToolProps) {
  return (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      {/* Botón de medición */}
      <Button
        variant={isActive ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className={isActive ? "bg-[#7fb069] hover:bg-[#6fa055]" : ""}
      >
        <Ruler className="h-4 w-4 mr-2" />
        {isActive ? "Medición Activa" : "Medir"}
      </Button>

      {/* Indicador de modo activo */}
      {isActive && (
        <Badge variant="secondary" className="w-full justify-center">
          Haz clic en dos puntos para medir
        </Badge>
      )}

      {/* Lista de mediciones */}
      {measurements.length > 0 && (
        <div className="bg-card border rounded-lg p-3 space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Mediciones</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearMeasurements}
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {measurements.map((measurement, index) => (
            <div
              key={measurement.id}
              className="text-sm flex items-center justify-between"
            >
              <span className="text-muted-foreground">Medición {index + 1}:</span>
              <span className="font-mono font-semibold">
                {measurement.distance.toFixed(2)} m
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
