import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import type { SampleResult } from '@/lib/resultsService';

// Translation keys for PDF report
const TRANSLATIONS = {
  en: {
    header: {
      title: 'COCOA QUALITY EVALUATION REPORT',
      subtitle: 'Professional Technical Assessment',
      generated: 'Generated',
      reportId: 'Report ID'
    },
    sections: {
      executiveSummary: 'Executive Summary',
      performanceOverview: 'Performance Overview',
      performanceRadarChart: 'Performance Radar Chart',
      physicalEvaluation: 'Physical Evaluation',
      physicalEvaluationDetails: 'Physical Evaluation Details',
      sensoryEvaluation: 'Sensory Evaluation',
      sensoryEvaluationSummary: 'Sensory Evaluation Summary',
      detailedSensoryAttributes: 'Detailed Sensory Attributes',
      evaluationSummaryNotes: 'Evaluation Summary & Notes',
      overallAssessment: 'Overall Assessment',
      additionalNotes: 'Additional Notes',
      notesComments: 'Notes and Comments'
    },
    fields: {
      contestName: 'Contest Name',
      participant: 'Participant',
      sampleName: 'Sample Name',
      submissionDate: 'Submission Date',
      evaluationDate: 'Evaluation Date',
      overallScore: 'Overall Score',
      ranking: 'Ranking',
      awards: 'Awards',
      none: 'None',
      finalGrade: 'Final Grade',
      awardsReceived: 'Awards Received',
      judgeComments: 'Judge Comments',
      physicalEvaluationNotes: 'Physical Evaluation Notes',
      appearance: 'Appearance',
      aroma: 'Aroma',
      defects: 'Defects',
      moisture: 'Moisture',
      overallPhysical: 'Overall Physical',
      overallSensoryScore: 'Overall Sensory Score',
      notes: 'Notes',
      noAdditionalNotes: 'No additional notes provided',
      evaluationInformation: 'Evaluation Information',
      physicalProperties: 'Physical Properties',
      fermentationAnalysis: 'Fermentation Analysis',
      qualityAssessment: 'Quality Assessment',
      finalAssessment: 'Final Assessment',
      pageOf: 'Page {current} of {total}',
      generatedAt: 'Generated'
    },
    grades: {
      excellent: 'Excellent (A+)',
      veryGood: 'Very Good (A)',
      goodBPlus: 'Good (B+)',
      goodB: 'Good (B)',
      fairCPlus: 'Fair (C+)',
      fairC: 'Fair (C)',
      belowAverage: 'Below Average (D)',
      poor: 'Poor (F)'
    },
    chart: {
      performanceOverview: 'Performance Overview',
      radarChartVisualization: 'Radar chart visualization',
      availableInFullReport: 'available in full report',
      couldNotBeRendered: '(Radar chart could not be rendered)'
    }
  },
  es: {
    header: {
      title: 'Informe de Evaluación de Calidad de Cacao',
      subtitle: 'Evaluación Técnica Profesional',
      generated: 'Generado',
      reportId: 'ID del Informe'
    },
    sections: {
      executiveSummary: 'Resumen Ejecutivo',
      performanceOverview: 'Resumen de Rendimiento',
      performanceRadarChart: 'Gráfico de Rendimiento Radial',
      physicalEvaluation: 'Evaluación Física',
      physicalEvaluationDetails: 'Detalles de Evaluación Física',
      sensoryEvaluation: 'Evaluación Sensorial',
      sensoryEvaluationSummary: 'Resumen de Evaluación Sensorial',
      detailedSensoryAttributes: 'Atributos Sensoriales Detallados',
      evaluationSummaryNotes: 'Resumen de Evaluación y Notas',
      overallAssessment: 'Evaluación General',
      additionalNotes: 'Notas Adicionales',
      notesComments: 'Notas y Comentarios'
    },
    fields: {
      contestName: 'Nombre del Concurso',
      participant: 'Participante',
      sampleName: 'Nombre de la Muestra',
      submissionDate: 'Fecha de Envío',
      evaluationDate: 'Fecha de Evaluación',
      overallScore: 'Puntuación General',
      ranking: 'Clasificación',
      awards: 'Premios',
      none: 'Ninguno',
      finalGrade: 'Calificación Final',
      awardsReceived: 'Premios Recibidos',
      judgeComments: 'Comentarios del Juez',
      physicalEvaluationNotes: 'Notas de Evaluación Física',
      appearance: 'Apariencia',
      aroma: 'Aroma',
      defects: 'Defectos',
      moisture: 'Humedad',
      overallPhysical: 'Físico General',
      overallSensoryScore: 'Puntuación Sensorial General',
      notes: 'Notas',
      noAdditionalNotes: 'No se proporcionaron notas adicionales',
      evaluationInformation: 'Información de Evaluación',
      physicalProperties: 'Propiedades Físicas',
      fermentationAnalysis: 'Análisis de Fermentación',
      qualityAssessment: 'Evaluación de Calidad',
      finalAssessment: 'Evaluación Final',
      pageOf: 'Página {current} de {total}',
      generatedAt: 'Generado'
    },
    grades: {
      excellent: 'Excelente (A+)',
      veryGood: 'Muy Bueno (A)',
      goodBPlus: 'Bueno (B+)',
      goodB: 'Bueno (B)',
      fairCPlus: 'Regular (C+)',
      fairC: 'Regular (C)',
      belowAverage: 'Por Debajo del Promedio (D)',
      poor: 'Pobre (F)'
    },
    chart: {
      performanceOverview: 'Resumen de Rendimiento',
      radarChartVisualization: 'Visualización de gráfico radial',
      availableInFullReport: 'disponible en el informe completo',
      couldNotBeRendered: '(No se pudo renderizar el gráfico radial)'
    }
  }
};

// Professional PDF constants
const A4_WIDTH = 210; // mm
const A4_HEIGHT = 297; // mm
const MARGIN_X = 20; // Increased margins for professional look
const MARGIN_Y = 25;

// Professional color scheme
const COLORS = {
  primary: '#2C3E50',      // Dark blue-gray for headers
  secondary: '#34495E',    // Medium blue-gray for subheaders
  accent: '#E74C3C',       // Red for important values
  text: '#2C3E50',         // Dark text
  lightText: '#7F8C8D',    // Gray text
  border: '#BDC3C7',       // Light gray borders
  background: '#F8F9FA',   // Very light background
  success: '#27AE60',      // Green for good scores
  warning: '#F39C12',      // Orange for average scores
  danger: '#E74C3C'        // Red for poor scores
};

export type PhysicalEvalFallback = {
  appearance: number;
  aroma: number;
  defects: number;
  moisture: number;
  overall: number;
  notes: string;
};

type SensoryAttributesTree = Record<string, { value?: number; total?: number; children?: Record<string, number> }>;

export async function generateParticipantReport(params: {
  result: SampleResult;
  radarChartNode?: HTMLElement | null;
  physicalEvalFallback?: PhysicalEvalFallback;
  physicalRawDetails?: Record<string, any> | null;
  sensoryAttributes?: SensoryAttributesTree | null;
  language?: 'en' | 'es';
}): Promise<void> {
  const { result, radarChartNode, physicalEvalFallback, physicalRawDetails, sensoryAttributes, language = 'en' } = params;
  const t = TRANSLATIONS[language];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let x = MARGIN_X;
  let y = MARGIN_Y;
  const contentWidth = A4_WIDTH - MARGIN_X * 2;

  // ================================
  // PAGE 1: HEADER & EXECUTIVE SUMMARY
  // ================================
  
  // Professional header with company branding
  drawHeader(doc, result, x, y, contentWidth, t);
  y += 35;

  // Executive summary table
  y = drawExecutiveSummary(doc, result, x, y, contentWidth, t);

  // Performance overview with centered score
  y = drawPerformanceOverview(doc, result, x, y, contentWidth, t);

  // Centered radar chart
  if (radarChartNode) {
    y = await drawCenteredRadarChart(doc, radarChartNode, x, y, contentWidth, t);
  }

  // ================================
  // PAGE 2: PHYSICAL EVALUATION
  // ================================
  doc.addPage();
  x = MARGIN_X;
  y = MARGIN_Y;

  drawSectionHeader(doc, t.sections.physicalEvaluation, x, y);
  y += 15;

  const physical = result.physicalEvaluation || physicalEvalFallback;
  if (physical) {
    // Physical evaluation summary table
    y = drawPhysicalSummaryTable(doc, physical, x, y, contentWidth, t);
    
    // Detailed physical evaluation data
    if (physicalRawDetails) {
      y = drawPhysicalDetailsTable(doc, physicalRawDetails, x, y, contentWidth, t);
    }
  }

  // ================================
  // PAGE 3: SENSORY EVALUATION
  // ================================
  doc.addPage();
  x = MARGIN_X;
  y = MARGIN_Y;

  drawSectionHeader(doc, t.sections.sensoryEvaluation, x, y);
  y += 15;

  // Sensory evaluation summary
  y = drawSensorySummaryTable(doc, result.sensoryEvaluation, x, y, contentWidth, t);

  // Detailed sensory attributes
  if (sensoryAttributes && Object.keys(sensoryAttributes).length) {
    y = drawSensoryAttributesTable(doc, sensoryAttributes, x, y, contentWidth, t);
  }

  // ================================
  // PAGE 4: CONCLUSION & NOTES
  // ================================
  doc.addPage();
  x = MARGIN_X;
  y = MARGIN_Y;

  drawSectionHeader(doc, t.sections.evaluationSummaryNotes, x, y);
  y += 15;

  // Overall assessment
  y = drawOverallAssessment(doc, result, x, y, contentWidth, t);

  // Judge comments and notes
  if (result.judgeComments || (physical && physical.notes)) {
    y = drawNotesSection(doc, result, physical, x, y, contentWidth, t);
  }

  // Footer with generation info
  drawFooter(doc, result, t);

  // Save the document
  const safeName = (result.sampleName || 'Report').replace(/[^a-z0-9_-]+/gi, '_');
  doc.save(`Professional_Evaluation_Report_${safeName}.pdf`);
}

// ================================
// HELPER FUNCTIONS
// ================================

function drawHeader(doc: jsPDF, result: SampleResult, x: number, y: number, width: number, t: any): void {
  // Company header background
  doc.setFillColor(COLORS.background);
  doc.rect(x, y - 5, width, 30, 'F');
  
  // Calculate center position for proper alignment
  const centerX = x + width / 2;
  
  // Company name/title - properly centered
  doc.setTextColor(COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(t.header.title, centerX, y + 8, { align: 'center' });

  // Report type - properly centered
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.secondary);
  doc.text(t.header.subtitle, centerX, y + 14, { align: 'center' });
  
  // Separator line
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(x, y + 18, x + width, y + 18);
  
  // Report metadata
  doc.setFontSize(10);
  doc.setTextColor(COLORS.lightText);
  doc.text(`${t.header.generated}: ${new Date().toLocaleDateString()}`, x, y + 22);
  doc.text(`${t.header.reportId}: ${result.id || 'N/A'}`, x + width - 30, y + 22, { align: 'right' });
}

function drawExecutiveSummary(doc: jsPDF, result: SampleResult, x: number, y: number, width: number, t: any): number {
  drawSectionHeader(doc, t.sections.executiveSummary, x, y);
  y += 12;

  // Create executive summary table
  const tableData = [
    [t.fields.contestName, result.contestName],
    [t.fields.participant, result.participantName],
    [t.fields.sampleName, result.sampleName || 'N/A'],
    [t.fields.submissionDate, result.submissionDate],
    [t.fields.evaluationDate, result.evaluationDate],
    [t.fields.overallScore, `${result.overallScore.toFixed(1)}/10`],
    [t.fields.ranking, result.ranking && result.totalParticipants ? `#${result.ranking} of ${result.totalParticipants}` : 'N/A'],
    [t.fields.awards, result.awards && result.awards.length ? result.awards.join(', ') : t.fields.none]
  ];

  return drawProfessionalTable(doc, tableData, x, y, width, t.sections.executiveSummary);
}

function drawPerformanceOverview(doc: jsPDF, result: SampleResult, x: number, y: number, width: number, t: any): number {
  drawSectionHeader(doc, t.sections.performanceOverview, x, y);
  y += 12;

  // Score breakdown table
  const scores = [
    [t.sections.sensoryEvaluation, `${result.sensoryEvaluation.overall.toFixed(1)}/10`, getScoreColor(result.sensoryEvaluation.overall)],
    [t.sections.physicalEvaluation, result.physicalEvaluation ? `${result.physicalEvaluation.overall.toFixed(1)}/10` : 'N/A', result.physicalEvaluation ? getScoreColor(result.physicalEvaluation.overall) : COLORS.lightText],
    [t.fields.overallScore, `${result.overallScore.toFixed(1)}/10`, getScoreColor(result.overallScore)]
  ];

  // Draw score breakdown table
  const tableWidth = width * 0.6; // 60% of content width
  const tableX = x + (width - tableWidth) / 2; // Center the table

  y = drawScoreTable(doc, scores, tableX, y, tableWidth);
  
  // Grade assessment
  const grade = getScoreGrade(result.overallScore, t);
  const gradeColor = getGradeColor(result.overallScore);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(gradeColor);
  doc.text(`${t.fields.finalGrade}: ${grade}`, x + width / 2, y + 10, { align: 'center' });
  
  return y + 20;
}

async function drawCenteredRadarChart(doc: jsPDF, radarChartNode: HTMLElement, x: number, y: number, width: number, t: any): Promise<number> {
  try {
    drawSectionHeader(doc, t.sections.performanceRadarChart, x, y);
    y += 12;

    // Fixed dimensions for consistent rendering - completely browser independent
    const fixedWidthPx = 800;
    const fixedHeightPx = 480;
      
      const pngDataUrl = await toPng(radarChartNode, {
        cacheBust: true,
      pixelRatio: 2,
        width: fixedWidthPx,
        height: fixedHeightPx,
        backgroundColor: '#ffffff',
        style: {
        transform: 'scale(1)',
          transformOrigin: 'top left',
        width: `${fixedWidthPx}px`,
        height: `${fixedHeightPx}px`,
        position: 'absolute',
        left: '0px',
        top: '0px'
        },
      });

    // Fixed chart dimensions in mm - completely independent of browser size
    const chartWidthMm = 170; // Fixed width in mm
    const chartHeightMm = 102; // Fixed height in mm (maintains 800x480 aspect ratio)
    
    // Center the chart on the page - fixed positioning
    const chartX = x + (width - chartWidthMm) / 2;
    const chartY = y;
    
    // Add the image with fixed dimensions
    doc.addImage(pngDataUrl, 'PNG', chartX, chartY, chartWidthMm, chartHeightMm);
    
    return y + chartHeightMm + 15;
    } catch (error) {
      console.error('Error rendering radar chart:', error);
    
    // Fallback: Draw a static chart representation
    return drawStaticRadarChart(doc, x, y, width, t);
  }
}

function drawStaticRadarChart(doc: jsPDF, x: number, y: number, width: number, t: any): number {
  // Draw a static radar chart representation when the dynamic one fails
  const chartWidth = 120;
  const chartHeight = 80;
  const chartX = x + (width - chartWidth) / 2;
  const chartY = y;
  
  // Draw chart border
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.rect(chartX, chartY, chartWidth, chartHeight);
  
  // Draw chart title
    doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary);
  doc.text(t.chart.performanceOverview, chartX + chartWidth / 2, chartY + 8, { align: 'center' });
  
  // Draw placeholder text
    doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.lightText);
  doc.text(t.chart.radarChartVisualization, chartX + chartWidth / 2, chartY + chartHeight / 2, { align: 'center' });
  doc.text(t.chart.availableInFullReport, chartX + chartWidth / 2, chartY + chartHeight / 2 + 5, { align: 'center' });
  
  return y + chartHeight + 15;
}

function drawPhysicalSummaryTable(doc: jsPDF, physical: any, x: number, y: number, width: number, t: any): number {
  const tableData = [
    [t.fields.appearance, `${physical.appearance.toFixed(1)}/10`, getScoreColor(physical.appearance)],
    [t.fields.aroma, `${physical.aroma.toFixed(1)}/10`, getScoreColor(physical.aroma)],
    [t.fields.defects, `${physical.defects.toFixed(1)}/10`, getScoreColor(physical.defects)],
    [t.fields.moisture, `${physical.moisture.toFixed(1)}/10`, getScoreColor(physical.moisture)],
    [t.fields.overallPhysical, `${physical.overall.toFixed(1)}/10`, getScoreColor(physical.overall)]
  ];

  return drawScoreTable(doc, tableData, x, y, width);
}

function drawPhysicalDetailsTable(doc: jsPDF, details: Record<string, any>, x: number, y: number, width: number, t: any): number {
  drawSectionHeader(doc, t.sections.physicalEvaluationDetails, x, y);
  y += 12;

  // Group fields logically
      const fieldGroups = [
        {
      title: t.fields.evaluationInformation,
          fields: ['evaluated_by', 'evaluated_at', 'global_evaluation']
        },
        {
      title: t.fields.physicalProperties,
          fields: ['percentage_humidity', 'broken_grains', 'flat_grains', 'affected_grains_insects']
        },
        {
      title: t.fields.fermentationAnalysis,
          fields: ['well_fermented_beans', 'lightly_fermented_beans', 'purple_beans', 'slaty_beans', 'internal_moldy_beans', 'over_fermented_beans']
        },
        {
      title: t.fields.qualityAssessment,
          fields: ['has_undesirable_aromas', 'undesirable_aromas', 'disqualification_reasons', 'warnings']
        }
      ];

      for (const group of fieldGroups) {
        // Check if we need a new page
    if (y > A4_HEIGHT - 40) {
          doc.addPage();
          y = MARGIN_Y;
        }

        // Group title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
    doc.setTextColor(COLORS.secondary);
        doc.text(group.title, x, y);
    y += 8;

    // Create table for this group
    const groupData = group.fields
      .filter(field => details.hasOwnProperty(field))
      .map(field => [formatFieldName(field), formatValue(details[field])]);

    if (groupData.length > 0) {
      y = drawProfessionalTable(doc, groupData, x, y, width, '');
      y += 5;
    }
  }

  return y;
}

function drawSensorySummaryTable(doc: jsPDF, sensory: any, x: number, y: number, width: number, t: any): number {
  const tableData = [
    [t.fields.overallSensoryScore, `${sensory.overall.toFixed(1)}/10`, getScoreColor(sensory.overall)],
    [t.fields.notes, sensory.notes || t.fields.noAdditionalNotes]
  ];

  return drawProfessionalTable(doc, tableData, x, y, width, t.sections.sensoryEvaluationSummary);
}

function drawSensoryAttributesTable(doc: jsPDF, attributes: SensoryAttributesTree, x: number, y: number, width: number, t: any): number {
  drawSectionHeader(doc, t.sections.detailedSensoryAttributes, x, y);
  y += 12;

  const keys = Object.keys(attributes);
  const tableData = keys.map(key => {
    const attr = attributes[key];
    const score = attr.value || attr.total || 0;
    return [formatFieldName(key), `${score.toFixed(1)}/10`, getScoreColor(score)];
  });

  return drawScoreTable(doc, tableData, x, y, width);
}

function drawOverallAssessment(doc: jsPDF, result: SampleResult, x: number, y: number, width: number, t: any): number {
  drawSectionHeader(doc, t.sections.overallAssessment, x, y);
  y += 12;

  const grade = getScoreGrade(result.overallScore, t);
  const gradeColor = getGradeColor(result.overallScore);
  
  // Assessment summary
  const assessmentData = [
    [t.fields.finalGrade, grade],
    [t.fields.overallScore, `${result.overallScore.toFixed(1)}/10`],
    [t.fields.ranking, result.ranking && result.totalParticipants ? `#${result.ranking} of ${result.totalParticipants}` : 'N/A'],
    [t.fields.awardsReceived, result.awards && result.awards.length ? result.awards.join(', ') : t.fields.none]
  ];

  y = drawProfessionalTable(doc, assessmentData, x, y, width, t.fields.finalAssessment);

  // Grade highlight
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(gradeColor);
  doc.text(`${t.fields.finalGrade}: ${grade}`, x + width / 2, y + 10, { align: 'center' });

  return y + 20;
}

function drawNotesSection(doc: jsPDF, result: SampleResult, physical: any, x: number, y: number, width: number, t: any): number {
  drawSectionHeader(doc, t.sections.additionalNotes, x, y);
  y += 12;

  const notes = [];
  if (result.judgeComments) {
    notes.push([t.fields.judgeComments, result.judgeComments]);
  }
  if (physical && physical.notes) {
    notes.push([t.fields.physicalEvaluationNotes, physical.notes]);
  }

  if (notes.length > 0) {
    return drawProfessionalTable(doc, notes, x, y, width, t.sections.notesComments);
  }

  return y;
}

function drawFooter(doc: jsPDF, result: SampleResult, t: any): void {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, A4_HEIGHT - 15, A4_WIDTH - MARGIN_X, A4_HEIGHT - 15);
    
    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.lightText);
    doc.text(t.fields.pageOf.replace('{current}', i.toString()).replace('{total}', pageCount.toString()), MARGIN_X, A4_HEIGHT - 10);
    doc.text(`${t.fields.generatedAt}: ${new Date().toLocaleString()}`, A4_WIDTH - MARGIN_X, A4_HEIGHT - 10, { align: 'right' });
  }
}

// ================================
// TABLE DRAWING FUNCTIONS
// ================================

function drawProfessionalTable(doc: jsPDF, data: string[][], x: number, y: number, width: number, title?: string): number {
  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(COLORS.secondary);
    doc.text(title, x, y);
    y += 8;
  }

  const rowHeight = 7;
  const cellPadding = 3;
  const borderColor = COLORS.border;

  // Draw table header background
  doc.setFillColor(COLORS.background);
  doc.rect(x, y, width, rowHeight, 'F');

  // Draw table borders
  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.3);

  // Header row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary);
  
  data.forEach((row, rowIndex) => {
    const rowY = y + rowIndex * rowHeight;
    
    // Draw row background for alternating rows
    if (rowIndex % 2 === 0) {
      doc.setFillColor('#FAFAFA');
      doc.rect(x, rowY, width, rowHeight, 'F');
    }
    
    // Draw borders
    doc.rect(x, rowY, width, rowHeight);
    
    // Draw text
    if (rowIndex === 0 && title) {
      // Header row
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.primary);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.text);
    }
    
    doc.setFontSize(9);
    doc.text(row[0], x + cellPadding, rowY + rowHeight - 2);
    
    // Right-align values or use custom color
    if (row.length > 1) {
      const valueText = row[1];
      const valueColor = row.length > 2 ? row[2] : COLORS.text;
      
      doc.setTextColor(valueColor);
      doc.text(valueText, x + width - cellPadding, rowY + rowHeight - 2, { align: 'right' });
    }
  });

  return y + (data.length * rowHeight) + 8;
}

function drawScoreTable(doc: jsPDF, data: string[][], x: number, y: number, width: number): number {
  const rowHeight = 6;
  const cellPadding = 3;
  const borderColor = COLORS.border;

  // Draw table with alternating row colors
  data.forEach((row, rowIndex) => {
    const rowY = y + rowIndex * rowHeight;
    
    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor('#FAFAFA');
      doc.rect(x, rowY, width, rowHeight, 'F');
    }
    
    // Draw borders
    doc.setDrawColor(borderColor);
    doc.setLineWidth(0.3);
    doc.rect(x, rowY, width, rowHeight);
    
    // Draw text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    doc.text(row[0], x + cellPadding, rowY + rowHeight - 2);
    
    // Draw score with color
    const scoreColor = row.length > 2 ? row[2] : COLORS.text;
    doc.setTextColor(scoreColor);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], x + width - cellPadding, rowY + rowHeight - 2, { align: 'right' });
  });

  return y + (data.length * rowHeight) + 10;
}

// ================================
// UTILITY FUNCTIONS
// ================================

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text(title, x, y);
  
  // Underline
  doc.setDrawColor(COLORS.primary);
  doc.setLineWidth(0.5);
  const textWidth = doc.getTextWidth(title);
  doc.line(x, y + 2, x + textWidth, y + 2);
}

function getScoreColor(score: number): string {
  if (score >= 8.5) return COLORS.success;
  if (score >= 7.0) return COLORS.warning;
  return COLORS.danger;
}

function getScoreGrade(score: number, t: any): string {
  if (score >= 9.0) return t.grades.excellent;
  if (score >= 8.5) return t.grades.veryGood;
  if (score >= 8.0) return t.grades.goodBPlus;
  if (score >= 7.5) return t.grades.goodB;
  if (score >= 7.0) return t.grades.fairCPlus;
  if (score >= 6.5) return t.grades.fairC;
  if (score >= 6.0) return t.grades.belowAverage;
  return t.grades.poor;
}

function getGradeColor(score: number): string {
  if (score >= 8.5) return COLORS.success;
  if (score >= 7.0) return COLORS.warning;
  return COLORS.danger;
}

function formatFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatValue(val: any): string {
  if (Array.isArray(val)) return val.length ? val.join(', ') : 'None';
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && val.includes('T')) {
    try {
      return new Date(val).toLocaleString();
    } catch {
      return val;
    }
  }
  return String(val);
}