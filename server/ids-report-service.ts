/**
 * Servicio de generación de reportes de validación IDS
 * Exporta resultados en JSON y genera resúmenes ejecutivos
 */

import type { IDSValidationReport, SpecificationResult, ValidationResult } from './ids-validation-service';

export interface ReportSummary {
  title: string;
  subtitle: string;
  generatedAt: Date;
  modelInfo: {
    id?: number;
    name?: string;
    totalElements: number;
  };
  overallCompliance: {
    rate: number;
    passed: number;
    failed: number;
    total: number;
  };
  specificationSummaries: SpecificationSummary[];
  topFailures: FailureSummary[];
  recommendations: string[];
}

export interface SpecificationSummary {
  name: string;
  description?: string;
  complianceRate: number;
  passed: number;
  failed: number;
  total: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface FailureSummary {
  requirementType: string;
  requirementName: string;
  failureCount: number;
  affectedElements: number;
  commonIssue: string;
}

/**
 * Genera un resumen ejecutivo del reporte de validación
 */
export function generateReportSummary(report: IDSValidationReport): ReportSummary {
  const specificationSummaries = report.specificationResults.map(spec => ({
    name: spec.name,
    description: spec.description,
    complianceRate: spec.complianceRate,
    passed: spec.passed,
    failed: spec.failed,
    total: spec.totalApplicable,
    status: getComplianceStatus(spec.complianceRate),
  }));

  const topFailures = analyzeTopFailures(report.elementResults);
  const recommendations = generateRecommendations(report);

  return {
    title: 'IDS Validation Report',
    subtitle: report.modelName || 'IFC Model Validation',
    generatedAt: report.validationDate,
    modelInfo: {
      id: report.modelId,
      name: report.modelName,
      totalElements: report.totalElements,
    },
    overallCompliance: {
      rate: report.complianceRate,
      passed: report.passedElements,
      failed: report.failedElements,
      total: report.validatedElements,
    },
    specificationSummaries,
    topFailures,
    recommendations,
  };
}

/**
 * Determina el estado de cumplimiento basado en el porcentaje
 */
function getComplianceStatus(rate: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (rate >= 95) return 'excellent';
  if (rate >= 80) return 'good';
  if (rate >= 60) return 'fair';
  return 'poor';
}

/**
 * Analiza los fallos más comunes
 */
function analyzeTopFailures(elementResults: ValidationResult[]): FailureSummary[] {
  const failureMap = new Map<string, {
    count: number;
    elements: Set<number>;
    type: string;
    messages: string[];
  }>();

  // Agrupar fallos por tipo y nombre de requisito
  for (const result of elementResults) {
    for (const failure of result.failures) {
      const key = `${failure.requirementType}:${failure.requirementName}`;
      
      if (!failureMap.has(key)) {
        failureMap.set(key, {
          count: 0,
          elements: new Set(),
          type: failure.requirementType,
          messages: [],
        });
      }

      const entry = failureMap.get(key)!;
      entry.count++;
      entry.elements.add(result.elementId);
      entry.messages.push(failure.message);
    }
  }

  // Convertir a array y ordenar por frecuencia
  const failures = Array.from(failureMap.entries()).map(([key, data]) => {
    const [requirementType, requirementName] = key.split(':');
    
    // Encontrar el mensaje más común
    const messageCounts = new Map<string, number>();
    for (const msg of data.messages) {
      messageCounts.set(msg, (messageCounts.get(msg) || 0) + 1);
    }
    const commonIssue = Array.from(messageCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Multiple issues';

    return {
      requirementType,
      requirementName,
      failureCount: data.count,
      affectedElements: data.elements.size,
      commonIssue,
    };
  });

  // Retornar los 10 fallos más frecuentes
  return failures.sort((a, b) => b.failureCount - a.failureCount).slice(0, 10);
}

/**
 * Genera recomendaciones basadas en los resultados
 */
function generateRecommendations(report: IDSValidationReport): string[] {
  const recommendations: string[] = [];

  // Recomendación general basada en compliance rate
  if (report.complianceRate < 60) {
    recommendations.push(
      'El modelo tiene un nivel de cumplimiento bajo. Se recomienda revisar los requisitos IDS y actualizar el modelo IFC para cumplir con las especificaciones.'
    );
  } else if (report.complianceRate < 80) {
    recommendations.push(
      'El modelo tiene un nivel de cumplimiento aceptable, pero hay áreas de mejora. Revisar los elementos que no cumplen con los requisitos.'
    );
  } else if (report.complianceRate < 95) {
    recommendations.push(
      'El modelo tiene un buen nivel de cumplimiento. Revisar los pocos elementos que no cumplen para alcanzar la excelencia.'
    );
  } else {
    recommendations.push(
      'Excelente nivel de cumplimiento. El modelo cumple con la mayoría de los requisitos IDS.'
    );
  }

  // Recomendaciones específicas por tipo de fallo
  const failureTypes = new Set<string>();
  for (const result of report.elementResults) {
    for (const failure of result.failures) {
      failureTypes.add(failure.requirementType);
    }
  }

  if (failureTypes.has('property')) {
    recommendations.push(
      'Se detectaron propiedades faltantes o incorrectas. Verificar que todos los property sets requeridos estén completos y con valores correctos.'
    );
  }

  if (failureTypes.has('attribute')) {
    recommendations.push(
      'Se detectaron atributos IFC faltantes o incorrectos. Asegurar que atributos como Name, Description y GlobalId estén correctamente definidos.'
    );
  }

  if (failureTypes.has('material')) {
    recommendations.push(
      'Se detectaron materiales faltantes. Asignar materiales a todos los elementos que lo requieren según las especificaciones.'
    );
  }

  if (failureTypes.has('classification')) {
    recommendations.push(
      'Se detectaron clasificaciones faltantes. Asignar códigos de clasificación (ej: Uniclass, Omniclass) a los elementos según corresponda.'
    );
  }

  // Recomendación sobre especificaciones con bajo cumplimiento
  const poorSpecs = report.specificationResults.filter(s => s.complianceRate < 60);
  if (poorSpecs.length > 0) {
    recommendations.push(
      `Las siguientes especificaciones tienen bajo cumplimiento: ${poorSpecs.map(s => s.name).join(', ')}. Priorizar la corrección de estos requisitos.`
    );
  }

  return recommendations;
}

/**
 * Exporta el reporte completo en formato JSON
 */
export function exportReportAsJSON(report: IDSValidationReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Exporta el resumen del reporte en formato JSON
 */
export function exportSummaryAsJSON(summary: ReportSummary): string {
  return JSON.stringify(summary, null, 2);
}

/**
 * Genera datos para gráficos de visualización
 */
export interface ChartData {
  complianceBySpecification: {
    labels: string[];
    passed: number[];
    failed: number[];
    rates: number[];
  };
  failuresByType: {
    labels: string[];
    counts: number[];
  };
  complianceOverview: {
    passed: number;
    failed: number;
    total: number;
  };
}

export function generateChartData(report: IDSValidationReport): ChartData {
  // Datos de cumplimiento por especificación
  const complianceBySpecification = {
    labels: report.specificationResults.map(s => s.name),
    passed: report.specificationResults.map(s => s.passed),
    failed: report.specificationResults.map(s => s.failed),
    rates: report.specificationResults.map(s => s.complianceRate),
  };

  // Datos de fallos por tipo
  const failuresByType = new Map<string, number>();
  for (const result of report.elementResults) {
    for (const failure of result.failures) {
      const type = failure.requirementType;
      failuresByType.set(type, (failuresByType.get(type) || 0) + 1);
    }
  }

  const failuresByTypeData = {
    labels: Array.from(failuresByType.keys()),
    counts: Array.from(failuresByType.values()),
  };

  // Datos de resumen general
  const complianceOverview = {
    passed: report.passedElements,
    failed: report.failedElements,
    total: report.validatedElements,
  };

  return {
    complianceBySpecification,
    failuresByType: failuresByTypeData,
    complianceOverview,
  };
}

/**
 * Genera un reporte HTML simple para visualización
 */
export function generateHTMLReport(report: IDSValidationReport, summary: ReportSummary): string {
  const chartData = generateChartData(report);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${summary.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { margin: 0 0 10px 0; color: #2563eb; }
    h2 { color: #1e40af; margin-top: 30px; }
    .subtitle { color: #666; font-size: 1.1em; }
    .meta { color: #888; font-size: 0.9em; margin-top: 10px; }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card h3 { margin: 0 0 10px 0; font-size: 0.9em; color: #666; text-transform: uppercase; }
    .card .value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
    .card .label { color: #888; font-size: 0.9em; }
    .compliance-excellent { color: #10b981; }
    .compliance-good { color: #3b82f6; }
    .compliance-fair { color: #f59e0b; }
    .compliance-poor { color: #ef4444; }
    .spec-list {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .spec-item {
      padding: 15px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .spec-item:last-child { border-bottom: none; }
    .spec-name { font-weight: 500; }
    .spec-stats { display: flex; gap: 20px; align-items: center; }
    .badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 500;
    }
    .badge-excellent { background: #d1fae5; color: #065f46; }
    .badge-good { background: #dbeafe; color: #1e40af; }
    .badge-fair { background: #fed7aa; color: #92400e; }
    .badge-poor { background: #fee2e2; color: #991b1b; }
    .recommendations {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .recommendations h3 { margin-top: 0; color: #1e40af; }
    .recommendations ul { margin: 0; padding-left: 20px; }
    .recommendations li { margin: 10px 0; }
    .failures-table {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    tr:hover { background: #f9fafb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${summary.title}</h1>
    <div class="subtitle">${summary.subtitle}</div>
    <div class="meta">Generated: ${summary.generatedAt.toLocaleString('es-ES')}</div>
    ${summary.modelInfo.name ? `<div class="meta">Model: ${summary.modelInfo.name}</div>` : ''}
  </div>

  <div class="summary-cards">
    <div class="card">
      <h3>Overall Compliance</h3>
      <div class="value compliance-${getComplianceStatus(summary.overallCompliance.rate)}">
        ${summary.overallCompliance.rate.toFixed(1)}%
      </div>
      <div class="label">${summary.overallCompliance.passed} of ${summary.overallCompliance.total} passed</div>
    </div>
    <div class="card">
      <h3>Validated Elements</h3>
      <div class="value">${summary.overallCompliance.total}</div>
      <div class="label">of ${summary.modelInfo.totalElements} total elements</div>
    </div>
    <div class="card">
      <h3>Failed Elements</h3>
      <div class="value" style="color: #ef4444;">${summary.overallCompliance.failed}</div>
      <div class="label">require attention</div>
    </div>
    <div class="card">
      <h3>Specifications</h3>
      <div class="value">${summary.specificationSummaries.length}</div>
      <div class="label">validated</div>
    </div>
  </div>

  <h2>Specifications Results</h2>
  <div class="spec-list">
    ${summary.specificationSummaries.map(spec => `
      <div class="spec-item">
        <div>
          <div class="spec-name">${spec.name}</div>
          ${spec.description ? `<div style="color: #888; font-size: 0.9em;">${spec.description}</div>` : ''}
        </div>
        <div class="spec-stats">
          <span>${spec.passed}/${spec.total}</span>
          <span class="badge badge-${spec.status}">${spec.complianceRate.toFixed(1)}%</span>
        </div>
      </div>
    `).join('')}
  </div>

  ${summary.topFailures.length > 0 ? `
    <h2>Top Failures</h2>
    <div class="failures-table">
      <table>
        <thead>
          <tr>
            <th>Requirement Type</th>
            <th>Requirement Name</th>
            <th>Failure Count</th>
            <th>Affected Elements</th>
            <th>Common Issue</th>
          </tr>
        </thead>
        <tbody>
          ${summary.topFailures.map(failure => `
            <tr>
              <td><span class="badge" style="background: #f3f4f6; color: #374151;">${failure.requirementType}</span></td>
              <td>${failure.requirementName}</td>
              <td>${failure.failureCount}</td>
              <td>${failure.affectedElements}</td>
              <td style="font-size: 0.9em; color: #666;">${failure.commonIssue}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}

  ${summary.recommendations.length > 0 ? `
    <div class="recommendations">
      <h3>Recommendations</h3>
      <ul>
        ${summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
</body>
</html>
  `.trim();
}
