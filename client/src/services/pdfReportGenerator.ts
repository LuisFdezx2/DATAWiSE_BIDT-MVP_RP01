import { jsPDF } from 'jspdf';

interface ComparisonData {
  oldModelName: string;
  newModelName: string;
  statistics: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
  added: Array<{ expressId: number; type: string; globalId?: string }>;
  removed: Array<{ expressId: number; type: string; globalId?: string }>;
  modified: Array<{
    expressId: number;
    type: string;
    globalId?: string;
    propertyChanges?: Array<{ propertyName: string; oldValue: any; newValue: any }>;
  }>;
}

export async function generateComparisonReport(
  comparisonData: ComparisonData,
  screenshot3D?: string // Base64 image data
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Reporte de Comparación de Modelos IFC', margin, yPosition);
  yPosition += 10;

  // Divider line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Model names
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Modelo Anterior: ${comparisonData.oldModelName}`, margin, yPosition);
  yPosition += 7;
  pdf.text(`Modelo Nuevo: ${comparisonData.newModelName}`, margin, yPosition);
  yPosition += 10;

  // Statistics Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumen de Cambios', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  // Statistics table
  const stats = [
    { label: 'Total de Cambios', value: comparisonData.statistics.totalChanges.toString(), color: [100, 100, 100] },
    { label: 'Elementos Añadidos', value: comparisonData.statistics.addedCount.toString(), color: [34, 197, 94] },
    { label: 'Elementos Eliminados', value: comparisonData.statistics.removedCount.toString(), color: [239, 68, 68] },
    { label: 'Elementos Modificados', value: comparisonData.statistics.modifiedCount.toString(), color: [251, 191, 36] },
  ];

  stats.forEach(stat => {
    checkNewPage(8);
    pdf.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
    pdf.text(`• ${stat.label}: ${stat.value}`, margin + 5, yPosition);
    yPosition += 7;
  });

  pdf.setTextColor(0, 0, 0);
  yPosition += 5;

  // 3D Screenshot if provided
  if (screenshot3D) {
    checkNewPage(100);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Visualización 3D', margin, yPosition);
    yPosition += 8;

    try {
      const imgWidth = contentWidth;
      const imgHeight = (imgWidth * 9) / 16; // Aspect ratio 16:9
      
      checkNewPage(imgHeight + 10);
      pdf.addImage(screenshot3D, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error('Error adding screenshot to PDF:', error);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text('(Error al cargar captura 3D)', margin, yPosition);
      yPosition += 10;
    }
  }

  // Detailed Changes Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  checkNewPage(10);
  pdf.text('Detalle de Cambios', margin, yPosition);
  yPosition += 8;

  // Added Elements
  if (comparisonData.added.length > 0) {
    checkNewPage(10);
    pdf.setFontSize(12);
    pdf.setTextColor(34, 197, 94);
    pdf.text(`Elementos Añadidos (${comparisonData.added.length})`, margin, yPosition);
    yPosition += 7;

    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    comparisonData.added.slice(0, 20).forEach(element => {
      checkNewPage(6);
      const text = `• ${element.type} (ID: ${element.expressId})`;
      pdf.text(text, margin + 5, yPosition);
      yPosition += 5;
    });

    if (comparisonData.added.length > 20) {
      checkNewPage(6);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`... y ${comparisonData.added.length - 20} más`, margin + 5, yPosition);
      yPosition += 5;
    }

    yPosition += 5;
  }

  // Removed Elements
  if (comparisonData.removed.length > 0) {
    checkNewPage(10);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(239, 68, 68);
    pdf.text(`Elementos Eliminados (${comparisonData.removed.length})`, margin, yPosition);
    yPosition += 7;

    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    comparisonData.removed.slice(0, 20).forEach(element => {
      checkNewPage(6);
      const text = `• ${element.type} (ID: ${element.expressId})`;
      pdf.text(text, margin + 5, yPosition);
      yPosition += 5;
    });

    if (comparisonData.removed.length > 20) {
      checkNewPage(6);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`... y ${comparisonData.removed.length - 20} más`, margin + 5, yPosition);
      yPosition += 5;
    }

    yPosition += 5;
  }

  // Modified Elements
  if (comparisonData.modified.length > 0) {
    checkNewPage(10);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(251, 191, 36);
    pdf.text(`Elementos Modificados (${comparisonData.modified.length})`, margin, yPosition);
    yPosition += 7;

    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');

    comparisonData.modified.slice(0, 15).forEach(element => {
      checkNewPage(10);
      const text = `• ${element.type} (ID: ${element.expressId})`;
      pdf.text(text, margin + 5, yPosition);
      yPosition += 5;

      if (element.propertyChanges && element.propertyChanges.length > 0) {
        element.propertyChanges.slice(0, 3).forEach(change => {
          checkNewPage(5);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'italic');
          const changeText = `  - ${change.propertyName}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`;
          pdf.text(changeText.substring(0, 80), margin + 10, yPosition);
          yPosition += 4;
        });
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
      }
      yPosition += 2;
    });

    if (comparisonData.modified.length > 15) {
      checkNewPage(6);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`... y ${comparisonData.modified.length - 15} más`, margin + 5, yPosition);
      yPosition += 5;
    }
  }

  // Footer
  const totalPages = (pdf as any).internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    const footerText = `Página ${i} de ${totalPages} | Generado el ${new Date().toLocaleDateString('es-ES')}`;
    pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Download PDF
  const fileName = `comparacion_${comparisonData.oldModelName}_vs_${comparisonData.newModelName}_${new Date().getTime()}.pdf`;
  pdf.save(fileName);
}
