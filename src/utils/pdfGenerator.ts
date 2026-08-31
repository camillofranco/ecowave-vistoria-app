import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vistoria } from '../db/database';

export const generatePDF = async (v: Vistoria, logoUrl?: string) => {
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Cores da Logo (Aproximadas)
  const colorGreen: [number, number, number] = [45, 138, 60]; // #2d8a3c
  const colorPurple: [number, number, number] = [63, 61, 122]; // #3f3d7a
  const colorLightGray: [number, number, number] = [248, 250, 252];
  const colorDarkGray: [number, number, number] = [51, 65, 85];

  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return '';
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return ''; }
  };

  const logoBase64 = logoUrl ? await getBase64FromUrl(logoUrl) : '';

  // Auxiliar para Rodapé
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setPage(pageNum);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, height - 15, width - margin, height - 15);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('EcoWave - Tecnologia em Medição e Vistorias Técnicas', margin, height - 10);
    doc.text(`Página ${pageNum} de ${totalPages}`, width - margin, height - 10, { align: 'right' });
  };

  // --- PÁGINA 1: CABEÇALHO E DADOS ---
  // Faixa de Topo
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, 40, 'F');
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 10, 50, 18);
  }
  
  doc.setDrawColor(...colorGreen);
  doc.setLineWidth(1.5);
  doc.line(0, 35, width, 35);

  // Título e ID
  doc.setTextColor(...colorPurple);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO TÉCNICO DE VISTORIA GERAL', margin, 50);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`EMISSÃO: ${v.data} às ${v.hora} | ID: #${v.id || 'N/A'}`, margin, 56);

  // 1. Bloco de Informações do Cliente (Elegante)
  doc.setFillColor(...colorLightGray);
  doc.roundedRect(margin, 65, width - (margin * 2), 35, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DO LOCAL', margin + 5, 72);
  
  doc.setTextColor(...colorDarkGray);
  doc.setFontSize(11);
  doc.text(`Condomínio: ${v.condominio}`, margin + 5, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bloco: ${v.bloco} | Unidade: ${v.unidade}`, margin + 5, 87);
  doc.text(`Técnico: ${v.tecnico}`, margin + 5, 94);
  
  const isWater = !v.subtipo_vistoria
    ? (v.tipo_vistoria === 'agua' || v.tipo_vistoria === 'agua_gas' || v.tipo_vistoria === 'ponto_consumo' || !v.tipo_vistoria)
    : (v.subtipo_vistoria === 'Água' || v.subtipo_vistoria === 'Água e Gás' || v.subtipo_vistoria.startsWith('Troca'));
  
  const isGas = !v.subtipo_vistoria
    ? (v.tipo_vistoria === 'gas' || v.tipo_vistoria === 'agua_gas')
    : (v.subtipo_vistoria === 'Gás' || v.subtipo_vistoria === 'Água e Gás');

  const tipoExibicao = `${v.tipo_vistoria || ''}${v.subtipo_vistoria ? ` - ${v.subtipo_vistoria}` : ''}`.toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.text(`TIPO: ${tipoExibicao}`, width - margin - 5, 80, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Responsável: ${v.responsavel_unidade}`, width - margin - 5, 87, { align: 'right' });

  // 2. Testes de Leitura (Tabela Moderna)
  let currentY = 110;
  doc.setTextColor(...colorPurple);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISE DE CONSUMO E LEITURAS', margin, currentY);
  
  autoTable(doc, {
    startY: currentY + 5,
    margin: { left: margin, right: margin },
    head: [['REFERÊNCIA', 'LEITURA INICIAL', 'LEITURA FINAL', 'DIFERENÇA (m³)', 'RECIPIENTE (L)']],
    body: v.testes.map((t, i) => [
      `Teste #${i+1}`,
      t.leitura_antes,
      t.leitura_depois,
      { content: t.diferenca.toFixed(3).replace('.', ','), styles: { fontStyle: 'bold', textColor: t.diferenca < 0 ? [239, 68, 68] : [16, 185, 129] } },
      t.litros_recipiente
    ]),
    theme: 'striped',
    headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 10, halign: 'center', textColor: colorDarkGray },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // 3. Status Técnico (Dashboard Style)
  doc.setTextColor(...colorPurple);
  doc.setFontSize(14);
  doc.text('PARÂMETROS TÉCNICOS E STATUS', margin, currentY);
  
  const dg = v.dados_gerais;
  const statusRows: any[] = [
    [
      { content: 'STATUS DO MEDIDOR', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.estado_medidor_agua?.toUpperCase() || '-', styles: { fontStyle: 'bold' as const, textColor: colorGreen } },
      { content: 'Nº SÉRIE HIDRÔMETRO', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.serial_medidor_agua || 'NÃO INFORMADO', styles: { fontStyle: 'bold' as const } }
    ]
  ];

  if (isWater) {
    statusRows.push([
      { content: 'ESTANQUEIDADE', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.relogio_parado_verificado ? 'CONFORMIDADE (PARADO)' : 'NÃO VERIFICADO', styles: { fontStyle: 'bold' as const, textColor: dg.relogio_parado_verificado ? colorGreen : [200, 0, 0] } },
      { content: '', styles: {} },
      { content: '', styles: {} }
    ]);
  }

  // Só adiciona linha de aquecimento se não for apenas água ou se tiver aquecimento
  if ((!isWater || isGas) && dg.sistema_aquecimento) {
    statusRows.push([
      { content: 'SISTEMA AQUECIMENTO', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.tipo_aquecimento?.toUpperCase() || 'ATIVO', styles: { fontStyle: 'bold' as const } },
      { content: '', styles: {} },
      { content: '', styles: {} }
    ]);
  }

  // Adiciona Temperatura e Pressão apenas se preenchidos
  const extraRow: any[] = [];
  if (dg.temperatura_agua_quente) extraRow.push({ content: 'TEMP. ÁGUA', styles: { fontStyle: 'bold' as const, textColor: 100 } }, { content: `${dg.temperatura_agua_quente}°C`, styles: { fontStyle: 'bold' as const } });
  if (dg.pressao_agua) extraRow.push({ content: 'PRESSÃO', styles: { fontStyle: 'bold' as const, textColor: 100 } }, { content: `${dg.pressao_agua} MCA`, styles: { fontStyle: 'bold' as const } });
  
  // Garante que a linha tenha 4 colunas para não quebrar o layout
  while (extraRow.length > 0 && extraRow.length < 4) {
    extraRow.push({ content: '', styles: {} });
  }
  
  if (extraRow.length > 0) statusRows.push(extraRow);

  autoTable(doc, {
    startY: currentY + 5,
    margin: { left: margin, right: margin },
    theme: 'plain',
    body: statusRows,
    styles: { fontSize: 9, cellPadding: 4 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // 3.5 Checklist de Verificações (Novo)
  if (isWater && dg.verificacoes_internas?.length > 0) {
    doc.setTextColor(...colorPurple);
    doc.setFontSize(14);
    doc.text('VERIFICAÇÕES DE VAZAMENTOS INTERNOS', margin, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      margin: { left: margin, right: margin },
      head: [['ITEM INSPECIONADO', 'STATUS DA VERIFICAÇÃO', 'OBSERVAÇÃO']],
      body: dg.verificacoes_internas.map(item => [
        item.item,
        { content: item.status === 'ok' ? '✅ EM CONFORMIDADE' : '❌ VAZAMENTO DETECTADO', styles: { textColor: item.status === 'ok' ? colorGreen : [200, 0, 0], fontStyle: 'bold' } },
        item.status === 'ok' ? 'Nenhum vazamento visível' : 'Atenção: Necessário reparo'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [240, 240, 240], textColor: colorPurple, fontSize: 8 },
      bodyStyles: { fontSize: 9 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 4. Parecer e Assinatura
  doc.setFillColor(...colorLightGray);
  doc.roundedRect(margin, currentY, width - (margin * 2), 50, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PARECER TÉCNICO FINAL:', margin + 5, currentY + 10);
  doc.setFont('helvetica', 'normal');
  const splitParecer = doc.splitTextToSize(v.parecer_tecnico, width - (margin * 2) - 10);
  doc.text(splitParecer, margin + 5, currentY + 18);

  if (v.assinatura) {
    const sigY = currentY + 60;
    doc.setDrawColor(200);
    doc.line(margin, sigY + 20, margin + 70, sigY + 20);
    doc.addImage(v.assinatura, 'PNG', margin + 5, sigY - 5, 60, 20);
    doc.setFontSize(8);
    doc.text('ASSINATURA TÉCNICA / RESPONSÁVEL', margin, sigY + 25);
  }

  // --- PÁGINA 2: GALERIA ---
  doc.addPage();

  let imgCount = 0;
  const addImageToDoc = (dataUrl: string, label: string) => {
    // 2 imagens por página. Se atingir o limite, pula página.
    if (imgCount > 0 && imgCount % 2 === 0) {
      doc.addPage();
    }
    
    // Cabeçalho da página de anexo (apenas no topo de cada página da galeria)
    if (imgCount % 2 === 0) {
      doc.setFillColor(...colorPurple);
      doc.rect(0, 0, width, 15, 'F');
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ANEXO FOTOGRÁFICO - EVIDÊNCIAS DE CAMPO', width / 2, 10, { align: 'center' });
    }
    
    // Determinar y base dependendo se é a primeira ou segunda imagem da página
    const isSecond = imgCount % 2 === 1;
    const yBase = isSecond ? 148 : 22;
    const imgW = 130;
    const imgH = 97.5;
    const xPos = (width - imgW) / 2; // Centraliza a imagem na página
    
    // Legenda acima da imagem
    doc.setTextColor(...colorPurple);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), margin, yBase + 8);
    
    // Moldura elegante da imagem
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(xPos - 1, yBase + 12, imgW + 2, imgH + 2);
    
    // Imagem ampliada
    doc.addImage(dataUrl, 'JPEG', xPos, yBase + 13, imgW, imgH);
    
    // Metadados abaixo da imagem
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Registro Oficial EcoWave • Data: ${v.data} às ${v.hora}`, margin, yBase + 13 + imgH + 6);
    
    imgCount++;
  };

  v.testes.forEach((t, i) => {
    if (t.imagens.antes) addImageToDoc(t.imagens.antes, `Teste #${i+1} - Leitura Inicial`);
    if (t.imagens.depois) addImageToDoc(t.imagens.depois, `Teste #${i+1} - Leitura Final`);
    if (t.imagens.recipiente) addImageToDoc(t.imagens.recipiente, `Teste #${i+1} - Verificação Recipiente`);
  });

  if (v.ponto_consumo?.imagem_recipiente) addImageToDoc(v.ponto_consumo.imagem_recipiente, 'Ponto de Consumo');
  if (dg.imagem_medidor_agua) addImageToDoc(dg.imagem_medidor_agua, 'Medidor de Água');
  if (dg.imagem_serial_agua) addImageToDoc(dg.imagem_serial_agua, 'Serial do Hidrômetro');
  if (dg.imagem_medidor_gas) addImageToDoc(dg.imagem_medidor_gas, 'Medidor de Gás');
  if (dg.imagem_serial_gas) addImageToDoc(dg.imagem_serial_gas, 'Serial Medidor Gás');
  if (dg.imagem_aquecimento) addImageToDoc(dg.imagem_aquecimento, 'Sistema de Aquecimento');

  // Adiciona imagens do checklist se houver vazamento
  dg.verificacoes_internas?.forEach(item => {
    if (item.imagem) addImageToDoc(item.imagem, `Vazamento: ${item.item}`);
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  return doc.output('datauristring').split(',')[1];
};

