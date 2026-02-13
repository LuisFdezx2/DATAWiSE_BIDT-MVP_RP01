import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ElementChange {
  expressId: number;
  type: string;
  globalId?: string;
  name?: string;
  changeType: 'added' | 'removed' | 'modified';
  propertyChanges?: Array<{
    propertyName: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface ComparisonData {
  oldModelId: number;
  newModelId: number;
  added: ElementChange[];
  removed: ElementChange[];
  modified: ElementChange[];
  statistics: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

interface ComparisonContextType {
  comparisonData: ComparisonData | null;
  setComparisonData: (data: ComparisonData | null) => void;
  isComparisonMode: boolean;
  filters: {
    showAdded: boolean;
    showRemoved: boolean;
    showModified: boolean;
  };
  setFilters: (filters: { showAdded: boolean; showRemoved: boolean; showModified: boolean }) => void;
  screenshot3D: string | null;
  setScreenshot3D: (screenshot: string | null) => void;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [screenshot3D, setScreenshot3D] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    showAdded: true,
    showRemoved: true,
    showModified: true,
  });

  const isComparisonMode = comparisonData !== null;

  return (
    <ComparisonContext.Provider
      value={{
        comparisonData,
        setComparisonData,
        isComparisonMode,
        filters,
        setFilters,
        screenshot3D,
        setScreenshot3D,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}
