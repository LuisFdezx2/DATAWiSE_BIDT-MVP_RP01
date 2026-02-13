import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUp, Box, BarChart3, Network, ChevronLeft, ChevronRight } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'BIM Data Processor',
    description: 'Procesamiento visual de archivos IFC con flujos de trabajo basados en nodos',
    icon: <FileUp className="h-12 w-12 text-blue-500" />,
    features: [
      'Validación IDS y enriquecimiento bSDD',
      'Generación de knowledge graphs',
      'Cálculo de calidad de datos',
    ],
  },
  {
    title: 'Digital Twin Viewer',
    description: 'Visualización 3D de gemelos digitales con datos en tiempo real',
    icon: <Box className="h-12 w-12 text-purple-500" />,
    features: [
      'Renderizado 3D de alto rendimiento',
      'Integración de datos en tiempo real',
      'Análisis y KPIs de sostenibilidad',
    ],
  },
  {
    title: 'Analytics Dashboard',
    description: 'Métricas clave y tendencias de tus proyectos BIM',
    icon: <BarChart3 className="h-12 w-12 text-[#7fb069]" />,
    features: [
      'KPIs de modelos y elementos',
      'Gráficos de tendencias temporales',
      'Distribución por tipos y schemas',
    ],
  },
  {
    title: 'Knowledge Graph',
    description: 'Explora relaciones espaciales y estructurales entre elementos IFC',
    icon: <Network className="h-12 w-12 text-emerald-500" />,
    features: [
      'Visualización interactiva de grafos',
      'Consultas de nodos conectados',
      'Análisis de caminos y relaciones',
    ],
  },
];

export function WelcomeTutorial() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya vio el tutorial
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenTutorial', 'true');
    }
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Bienvenido a BIM Digital Twin Platform
          </DialogTitle>
          <DialogDescription>
            Descubre las funcionalidades principales de la plataforma
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Indicador de progreso */}
          <div className="flex justify-center gap-2 mb-6">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-12 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-[#7fb069]'
                    : index < currentStep
                    ? 'bg-[#7fb069]/50'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Contenido del paso actual */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                {step.icon}
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
            <p className="text-gray-600 mb-4">{step.description}</p>
            <ul className="text-left max-w-md mx-auto space-y-2">
              {step.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-[#7fb069] mt-1">▸</span>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Controles de navegación */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <div className="text-sm text-gray-500">
              {currentStep + 1} / {tutorialSteps.length}
            </div>

            <Button
              onClick={handleNext}
              className="bg-[#7fb069] hover:bg-[#6fa055] text-white"
            >
              {currentStep === tutorialSteps.length - 1 ? (
                'Comenzar'
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Checkbox "No mostrar de nuevo" */}
          <div className="flex items-center gap-2 mt-6 justify-center">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm text-gray-600 cursor-pointer"
            >
              No mostrar de nuevo
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
