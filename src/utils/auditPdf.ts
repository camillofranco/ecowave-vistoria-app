import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AuditItem, Vistoria } from '../db/database';

const RESULTS: Record<AuditItem['resultado'], string> = {
  nao_verificado: 'Não verificado', conforme: 'Conforme',
  nao_conforme: 'Não conforme', nao_aplicavel: 'Não aplicável'
};

export async function generateAuditPDF(v: Vistoria): Promise<string> {
  if (!v.auditoria) throw new Error('Dados da auditoria ausentes.');
  const a = v.auditoria;
  const doc = new jsPDF();
  const margin = 17;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = 22;
  const ensure = (height: number) => { if (y + height > pageHeight - 22) { doc.addPage(); y = 20; } };
  const paragraph = (label: string, value: string) => {
    const lines = doc.splitTextToSize(`${label}: ${value || 'Não informado'}`, contentWidth);
    ensure(lines.length * 4.5 + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(lines, margin, y); y += lines.length * 4.5 + 5;
  };
  const section = (name: string) => { ensure(13); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(34, 94, 67); doc.text(name, margin, y); doc.setTextColor(35, 45, 55); y += 8; };

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('AUDITORIA AMBIENTAL DA MEDIÇÃO', margin, y); y += 8;
  doc.setFontSize(9); doc.setTextColor(166, 62, 42);
  const statusLines = doc.splitTextToSize(
    'REGISTRO DE CAMPO — CONSULTE A VALIDAÇÃO PROFISSIONAL NO PORTAL ECOWAVE', contentWidth);
  doc.text(statusLines, margin, y);
  doc.setTextColor(35, 45, 55); y += statusLines.length * 4 + 5;
  paragraph('Condomínio', v.condominio);
  paragraph('Identificador da vistoria', v.inspection_uid || `Local #${v.id || 'não salvo'}`);
  paragraph('Bloco / unidade', `${v.bloco || '-'} / ${v.unidade || '-'}`);
  paragraph('Data / técnico de campo', `${v.data} ${v.hora} / ${v.tecnico || '-'}`);
  section('1. Planejamento e método');
  paragraph('Objetivo', a.objetivo); paragraph('Escopo', a.escopo);
  paragraph('Método e instrumentos', a.metodo); paragraph('Período analisado', a.periodo_analisado);
  paragraph('Documentos analisados', a.documentos_analisados);
  paragraph('Limitações e acessos', a.limitacoes);

  section('2. Matriz de constatações');
  autoTable(doc, {
    startY: y,
    head: [['Critério', 'Resultado', 'Constatação / justificativa']],
    body: a.itens.map(item => [item.criterio, RESULTS[item.resultado], item.observacao || '-']),
    margin: { left: margin, right: margin, bottom: 20 },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [34, 94, 67] },
    columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 30 } }
  });
  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 11;
  const findings = a.itens.filter(item => item.resultado === 'nao_conforme');
  section('3. Não conformidades e plano de ação');
  if (!findings.length) paragraph('Resultado', 'Nenhuma não conformidade registrada nos critérios avaliados.');
  findings.forEach((item, i) => {
    paragraph(`${i + 1}. ${item.criterio}`, item.observacao || '-');
    paragraph('Criticidade / ação', `${item.criticidade || '-'} / ${item.acao_corretiva || '-'}`);
    paragraph('Responsável / prazo', `${item.responsavel_acao || 'A definir'} / ${item.prazo_acao || 'A definir'}`);
  });
  section('4. Conclusão do registro de campo');
  paragraph('Conclusão', a.conclusao);
  ensure(18); doc.setFontSize(8); doc.setTextColor(120);
  doc.text(doc.splitTextToSize('A aprovação da engenheira, com registro CREA, justificativa e eventual ART, é registrada no Portal Ecowave e deve ser consultada na página da unidade.', contentWidth), margin, y);

  for (const item of a.itens.filter(entry => entry.evidencia)) {
    doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(35, 45, 55);
    doc.text(doc.splitTextToSize(`EVIDÊNCIA — ${item.criterio}`, contentWidth), margin, 22);
    try {
      const data = item.evidencia!;
      const format = data.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const properties = doc.getImageProperties(data);
      const w = Math.min(contentWidth, 170);
      const h = Math.min(190, w * properties.height / properties.width);
      doc.addImage(data, format, margin, 39, w, h);
    } catch { doc.text('Evidência indisponível para renderização.', margin, 42); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(doc.splitTextToSize(item.observacao || 'Sem observação.', contentWidth), margin, 240);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor(210); doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFontSize(8); doc.setTextColor(130);
    doc.text(`Ecowave | Auditoria da unidade ${v.unidade} | Página ${page}/${pages}`, margin, pageHeight - 10);
  }
  return doc.output('datauristring').split(',')[1];
}
