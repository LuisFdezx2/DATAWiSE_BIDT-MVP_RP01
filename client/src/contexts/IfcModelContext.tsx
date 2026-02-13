import { createContext, useContext, useState, ReactNode } from 'react';
import type { IfcModel } from '@/services/ifcGeometryLoader';

interface IfcModelContextType {
  currentModel: IfcModel | null;
  modelMetadata: {
    schema?: string;
    fileUrl?: string;
    fileName?: string;
    statistics?: {
      totalElements: number;
      elementsByType: Record<string, number>;
    };
  } | null;
  setCurrentModel: (model: IfcModel | null, metadata?: any) => void;
  clearModel: () => void;
}

const IfcModelContext = createContext<IfcModelContextType | undefined>(undefined);

export function IfcModelProvider({ children }: { children: ReactNode }) {
  const [currentModel, setModel] = useState<IfcModel | null>(null);
  const [modelMetadata, setMetadata] = useState<IfcModelContextType['modelMetadata']>(null);

  const setCurrentModel = (model: IfcModel | null, metadata?: any) => {
    setModel(model);
    if (metadata) {
      setMetadata(metadata);
    }
  };

  const clearModel = () => {
    setModel(null);
    setMetadata(null);
  };

  return (
    <IfcModelContext.Provider
      value={{
        currentModel,
        modelMetadata,
        setCurrentModel,
        clearModel,
      }}
    >
      {children}
    </IfcModelContext.Provider>
  );
}

export function useIfcModel() {
  const context = useContext(IfcModelContext);
  if (context === undefined) {
    throw new Error('useIfcModel must be used within an IfcModelProvider');
  }
  return context;
}
