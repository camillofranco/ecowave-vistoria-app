import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vistoria, DadosGerais } from '../db/database';

export const generatePDF = async (v: Vistoria, logoUrl?: string): Promise<string> => {
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Cores Oficiais Ecowave
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
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.readAsDataURL(blob);
      });
    } catch { 
      return ''; 
    }
  };

  let logoBase64 = '';
  if (logoUrl) {
    try {
      logoBase64 = await getBase64FromUrl(logoUrl);
    } catch (e) {
      console.warn('Erro ao carregar logo para PDF', e);
    }
  }

  // Auxiliar para Rodapé em todas as páginas
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setPage(pageNum);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, height - 15, width - margin, height - 15);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Ecowave - Tecnologia em Medição e Vistorias Técnicas', margin, height - 10);
    doc.text(`Página ${pageNum} de ${totalPages}`, width - margin, height - 10, { align: 'right' });
  };

  // --- PÁGINA 1: CABEÇALHO E DADOS ---
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, 38, 'F');
  if (logoBase64 && logoBase64.includes('base64,')) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 8, 48, 17);
    } catch (e) {
      console.warn('Não foi possível renderizar a logo no PDF', e);
    }
  }
  
  doc.setDrawColor(...colorGreen);
  doc.setLineWidth(1.5);
  doc.line(0, 32, width, 32);

  const isAltoConsumo = v.tipo_vistoria === 'Alto Consumo' || v.tipo_vistoria === 'alto_consumo';

  // Título e ID
  doc.setTextColor(...colorPurple);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(
    isAltoConsumo 
      ? 'RELATÓRIO TÉCNICO DE ALTO CONSUMO' 
      : 'RELATÓRIO TÉCNICO DE VISTORIA GERAL', 
    margin, 
    44
  );
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`EMISSÃO: ${v.data || ''} às ${v.hora || ''} | ID: #${v.id || 'N/A'}`, margin, 50);

  // 1. Bloco de Informações do Local
  const infoBoxY = 56;
  const infoBoxH = 28;
  doc.setFillColor(...colorLightGray);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, infoBoxY, width - (margin * 2), infoBoxH, 2, 2, 'FD');
  
  const isAF = !v.subtipo_vistoria
    ? (v.tipo_vistoria === 'agua' || v.tipo_vistoria === 'agua_gas' || v.tipo_vistoria === 'ponto_consumo' || !v.tipo_vistoria)
    : (v.subtipo_vistoria.includes('AF') || v.subtipo_vistoria.includes('Água'));

  const isAQ = v.subtipo_vistoria ? v.subtipo_vistoria.includes('AQ') : false;
  const isGas = !v.subtipo_vistoria
    ? (v.tipo_vistoria === 'gas' || v.tipo_vistoria === 'agua_gas')
    : (v.subtipo_vistoria.includes('Gás') || v.subtipo_vistoria.includes('gas'));

  const tipoExibicao = `${v.tipo_vistoria || ''}${v.subtipo_vistoria ? ` - ${v.subtipo_vistoria}` : ''}`.toUpperCase();

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DO LOCAL', margin + 5, infoBoxY + 7);
  doc.text(`MODALIDADE: ${tipoExibicao}`, width - margin - 5, infoBoxY + 7, { align: 'right' });
  
  doc.setTextColor(...colorDarkGray);
  doc.setFontSize(9.5);
  doc.text(`Condomínio: ${v.condominio || '-'}`, margin + 5, infoBoxY + 14);
  doc.text(`Bloco: ${v.bloco || '-'} | Unidade: ${v.unidade || '-'}`, width - margin - 5, infoBoxY + 14, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Técnico: ${v.tecnico || '-'}`, margin + 5, infoBoxY + 22);
  doc.text(`Responsável: ${v.responsavel_unidade || '-'}`, width - margin - 5, infoBoxY + 22, { align: 'right' });

  let currentY = infoBoxY + infoBoxH + 8;

  // Se for ALTO CONSUMO, renderiza o conjunto de 3 tabelas especializadas
  if (isAltoConsumo) {
    // TABELA 1: Inspeção de Caixas Acopladas (Vasos Sanitários)
    if (v.caixas_acopladas && v.caixas_acopladas.length > 0) {
      doc.setTextColor(...colorPurple);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. INSPEÇÃO PRELIMINAR DE CAIXAS ACOPLADAS (VASOS SANITÁRIOS)', margin, currentY);

      const caixasRows = v.caixas_acopladas.map(c => {
        let statusLabel = '✅ EM CONFORMIDADE (SEM VAZAMENTO)';
        let statusColor: [number, number, number] = colorGreen;
        let diag = 'Vedação inferior e nível do ladrão normais';

        if (c.status === 'vazamento_ladrao') {
          statusLabel = '❌ VAZAMENTO NO LADRÃO';
          statusColor = [220, 38, 38];
          diag = 'Nível de água acima do tubo extravasor (regulagem necessária)';
        } else if (c.status === 'vazamento_borracha') {
          statusLabel = '❌ VAZAMENTO NA VEDAÇÃO';
          statusColor = [220, 38, 38];
          diag = 'Borracha inferior desgastada (passagem contínua)';
        } else if (c.status === 'vazamento_ambos') {
          statusLabel = '❌ VAZAMENTO DUPLO (LADRÃO E VEDAÇÃO)';
          statusColor = [220, 38, 38];
          diag = 'Transbordamento no ladrão e falha na vedação';
        } else if (c.status === 'nao_aplicavel') {
          statusLabel = '⚪ NÃO APLICÁVEL';
          statusColor = [100, 116, 139];
          diag = 'Inexistente ou inacessível';
        }

        if (c.observacao) diag += ` • ${c.observacao}`;

        return [
          c.local,
          { content: statusLabel, styles: { textColor: statusColor, fontStyle: 'bold' as const } },
          diag
        ];
      });

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: margin, right: margin },
        head: [['LOCAL / AMBIENTE', 'STATUS DA VEDAÇÃO', 'DIAGNÓSTICO TÉCNICO']],
        body: caixasRows,
        theme: 'striped',
        headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 8, cellPadding: 2 },
        bodyStyles: { fontSize: 8, cellPadding: 2 }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 7;
    }

    // TABELA 2: Aferição de Precisão do Medidor (Balde 10L)
    if (v.afericoes_medidores && v.afericoes_medidores.length > 0) {
      doc.setTextColor(...colorPurple);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('2. AFERIÇÃO DE PRECISÃO DO HIDRÔMETRO (BALDE GRADUADO 10L)', margin, currentY);

      const afericaoRows = v.afericoes_medidores.map(a => {
        const isConforme = a.status === 'conforme';
        const desvio = a.desvio_percentual || 0;
        const colorResult: [number, number, number] = isConforme ? colorGreen : [220, 38, 38];
        return [
          `Hidrômetro ${a.tipo}`,
          a.leitura_antes || '-',
          a.leitura_depois || '-',
          `${(a.litros_medidos_hidrometro || 0).toFixed(1)} L (${(a.diferenca_m3 || 0).toFixed(4)} m³)`,
          `${(a.volume_balde_litros || 10).toFixed(1)} L`,
          `${desvio > 0 ? '+' : ''}${desvio.toFixed(1)}%`,
          { content: isConforme ? '✅ CONFORME' : '⚠️ DIVERGENTE', styles: { textColor: colorResult, fontStyle: 'bold' as const } }
        ];
      });

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: margin, right: margin },
        head: [['MEDIDOR', 'LEITURA ANTES', 'LEITURA DEPOIS', 'REGISTRADO', 'BALDE', 'DESVIO', 'RESULTADO']],
        body: afericaoRows,
        theme: 'striped',
        headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 7.5, halign: 'center', cellPadding: 2 },
        bodyStyles: { fontSize: 8, halign: 'center', cellPadding: 2 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 7;
    }

    // TABELA 3: Mapeamento de Vazão dos Pontos de Consumo (10 segundos)
    if (v.pontos_consumo_itens && v.pontos_consumo_itens.length > 0) {
      doc.setTextColor(...colorPurple);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('3. MAPEAMENTO DE VAZÃO DOS PONTOS DE CONSUMO (LITROS/MINUTO)', margin, currentY);

      const pontosRows = v.pontos_consumo_itens.map(p => {
        const vazao = p.vazao_l_min || 0;
        let statusVazao = 'NORMAL';
        let statusColor: [number, number, number] = colorDarkGray;
        if (vazao > 12) {
          statusVazao = 'ELEVADA (ALTO CONSUMO)';
          statusColor = [220, 38, 38];
        } else if (vazao > 0 && vazao <= 6) {
          statusVazao = 'ECONÔMICA';
          statusColor = colorGreen;
        }
        return [
          p.local,
          p.tipo,
          p.litros_10s ? `${p.litros_10s} L` : '-',
          `${vazao.toFixed(1)} L/min`,
          { content: statusVazao, styles: { textColor: statusColor, fontStyle: 'bold' as const } }
        ];
      });

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: margin, right: margin },
        head: [['PONTO / AMBIENTE', 'TIPO', 'COLETA (10s)', 'VAZÃO PROJETADA (L/min)', 'CLASSIFICAÇÃO']],
        body: pontosRows,
        theme: 'striped',
        headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 7.5, halign: 'center', cellPadding: 2 },
        bodyStyles: { fontSize: 8, halign: 'center', cellPadding: 2 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 7;
    }

  } else {
    // Modo Padrão / Geral
    doc.setTextColor(...colorPurple);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ANÁLISE DE CONSUMO E LEITURAS', margin, currentY);
    
    const testesList = v.testes || [];
    autoTable(doc, {
      startY: currentY + 3,
      margin: { left: margin, right: margin },
      head: [['REFERÊNCIA', 'LEITURA INICIAL', 'LEITURA FINAL', 'DIFERENÇA (m³)', 'RECIPIENTE (L)']],
      body: testesList.map((t, i) => [
        `Teste #${i+1}`,
        t.leitura_antes || '-',
        t.leitura_depois || '-',
        { content: (t.diferenca || 0).toFixed(3).replace('.', ','), styles: { fontStyle: 'bold', textColor: (t.diferenca || 0) < 0 ? [239, 68, 68] : [16, 185, 129] } },
        t.litros_recipiente || '-'
      ]),
      theme: 'striped',
      headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 8.5, halign: 'center', cellPadding: 2.5 },
      bodyStyles: { fontSize: 8.5, halign: 'center', textColor: colorDarkGray, cellPadding: 2.5 },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 8;
  }

  // Parâmetros Técnicos Gerais (se não for alto consumo ou para dados de medidor)
  const dg = v.dados_gerais || ({} as DadosGerais);
  const statusRows: any[] = [];

  if (isAF && dg.serial_medidor_agua) {
    statusRows.push([
      { content: 'STATUS MEDIDOR AF', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.estado_medidor_agua?.toUpperCase() || 'BOM', styles: { fontStyle: 'bold' as const, textColor: colorGreen } },
      { content: 'Nº SÉRIE HIDRÔMETRO AF', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.serial_medidor_agua || 'NÃO INFORMADO', styles: { fontStyle: 'bold' as const } }
    ]);
  }

  if (isAQ && dg.serial_medidor_aq) {
    statusRows.push([
      { content: 'STATUS MEDIDOR AQ', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.estado_medidor_aq?.toUpperCase() || 'BOM', styles: { fontStyle: 'bold' as const, textColor: colorGreen } },
      { content: 'Nº SÉRIE HIDRÔMETRO AQ', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.serial_medidor_aq || 'NÃO INFORMADO', styles: { fontStyle: 'bold' as const } }
    ]);
  }

  if (isGas && dg.serial_medidor_gas) {
    statusRows.push([
      { content: 'STATUS MEDIDOR GÁS', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.estado_medidor_gas?.toUpperCase() || 'BOM', styles: { fontStyle: 'bold' as const, textColor: colorGreen } },
      { content: 'Nº SÉRIE MEDIDOR GÁS', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: dg.serial_medidor_gas || 'NÃO INFORMADO', styles: { fontStyle: 'bold' as const } }
    ]);
  }

  if (dg.relogio_parado_verificado) {
    statusRows.push([
      { content: 'ESTANQUEIDADE', styles: { fontStyle: 'bold' as const, textColor: 100 } },
      { content: 'CONFORMIDADE (RELÓGIO PARADO)', styles: { fontStyle: 'bold' as const, textColor: colorGreen } },
      { content: '', styles: {} },
      { content: '', styles: {} }
    ]);
  }

  if (statusRows.length > 0) {
    autoTable(doc, {
      startY: currentY + 3,
      margin: { left: margin, right: margin },
      theme: 'plain',
      body: statusRows,
      styles: { fontSize: 8, cellPadding: 2 },
    });
    currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 7;
  }

  // 4. Verificação de Espaço para Parecer e Assinaturas
  const neededSpace = 75;
  if (currentY + neededSpace > height - 20) {
    doc.addPage();
    currentY = 22;
    
    doc.setFillColor(...colorPurple);
    doc.rect(0, 0, width, 12, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PARECER TÉCNICO E VALIDAÇÃO JURÍDICA DA VISTORIA', width / 2, 8, { align: 'center' });
    currentY = 22;
  }

  // 4.1 Caixa do Parecer Técnico
  const parecerText = v.parecer_tecnico || 'Vistoria técnica finalizada nas condições descritas neste laudo.';
  doc.setFontSize(8.5);
  const splitParecer = doc.splitTextToSize(parecerText, width - (margin * 2) - 10);
  const parecerBoxH = Math.max(26, 12 + (splitParecer.length * 4.2));

  doc.setFillColor(...colorLightGray);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, width - (margin * 2), parecerBoxH, 2, 2, 'FD');
  
  doc.setFontSize(9);
  doc.setTextColor(...colorPurple);
  doc.setFont('helvetica', 'bold');
  doc.text('PARECER TÉCNICO FINAL:', margin + 5, currentY + 6);
  
  doc.setTextColor(...colorDarkGray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(splitParecer, margin + 5, currentY + 12);

  currentY += parecerBoxH + 8;

  // 5. Bloco de Assinaturas Oficiais (Morador/Cliente e Técnico)
  const sigBoxW = (width - (margin * 2) - 12) / 2;
  const clientSigX = margin;
  const techSigX = margin + sigBoxW + 12;
  const sigBoxH = 46;

  // Caixa da Assinatura do Cliente
  doc.setFillColor(...colorLightGray);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(clientSigX, currentY, sigBoxW, sigBoxH, 2, 2, 'FD');

  // Cabeçalho da Assinatura do Cliente
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorPurple);
  doc.text('ASSINATURA DO CLIENTE / MORADOR', clientSigX + 4, currentY + 6);
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Declaro que acompanhei a vistoria e recebi este laudo.', clientSigX + 4, currentY + 10);

  // Imagem da Assinatura do Cliente
  const clientSig = v.assinatura_cliente || v.assinatura;
  if (clientSig && clientSig.includes('base64,')) {
    try {
      doc.addImage(clientSig, 'PNG', clientSigX + (sigBoxW - 55) / 2, currentY + 11, 55, 18);
    } catch (e) {
      console.warn('Erro ao renderizar assinatura do cliente no PDF', e);
    }
  }

  // Linha de Assinatura do Cliente
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(clientSigX + 6, currentY + 31, clientSigX + sigBoxW - 6, currentY + 31);

  // Nome e Cargo do Cliente
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorDarkGray);
  doc.text((v.responsavel_unidade || 'MORADOR / RESPONSÁVEL').toUpperCase(), clientSigX + sigBoxW / 2, currentY + 36, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Acompanhante / Recebimento da Vistoria', clientSigX + sigBoxW / 2, currentY + 41, { align: 'center' });

  // Caixa da Assinatura do Técnico
  doc.setFillColor(...colorLightGray);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(techSigX, currentY, sigBoxW, sigBoxH, 2, 2, 'FD');

  // Cabeçalho da Assinatura do Técnico
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorPurple);
  doc.text('ASSINATURA DO TÉCNICO RESPONSÁVEL', techSigX + 4, currentY + 6);
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Atesto a execução técnica das análises descritas.', techSigX + 4, currentY + 10);

  // Imagem da Assinatura do Técnico
  const techSig = v.assinatura_tecnico;
  if (techSig && techSig.includes('base64,')) {
    try {
      doc.addImage(techSig, 'PNG', techSigX + (sigBoxW - 55) / 2, currentY + 11, 55, 18);
    } catch (e) {
      console.warn('Erro ao renderizar assinatura do técnico no PDF', e);
    }
  }

  // Linha de Assinatura do Técnico
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(techSigX + 6, currentY + 31, techSigX + sigBoxW - 6, currentY + 31);

  // Nome e Cargo do Técnico
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorDarkGray);
  doc.text((v.tecnico || 'TÉCNICO RESPONSÁVEL').toUpperCase(), techSigX + sigBoxW / 2, currentY + 36, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Ecowave Tecnologia e Medições', techSigX + sigBoxW / 2, currentY + 41, { align: 'center' });

  // --- PÁGINA 2+: GALERIA DE FOTOS ---
  let imgCount = 0;
  const addImageToDoc = (dataUrl: string, label: string) => {
    if (!dataUrl || !dataUrl.includes('base64,')) return;

    if (imgCount % 2 === 0) {
      doc.addPage();
      
      doc.setFillColor(...colorPurple);
      doc.rect(0, 0, width, 14, 'F');
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ANEXO FOTOGRÁFICO - EVIDÊNCIAS DE CAMPO', width / 2, 9, { align: 'center' });
    }
    
    const isSecond = imgCount % 2 === 1;
    const yBase = isSecond ? 148 : 22;
    const imgW = 130;
    const imgH = 97.5;
    const xPos = (width - imgW) / 2;
    
    doc.setTextColor(...colorPurple);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), margin, yBase + 8);
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(xPos - 1, yBase + 12, imgW + 2, imgH + 2);
    
    try {
      const isPng = dataUrl.startsWith('data:image/png');
      doc.addImage(dataUrl, isPng ? 'PNG' : 'JPEG', xPos, yBase + 13, imgW, imgH);
    } catch (e) {
      console.error('Erro ao adicionar foto ao PDF:', e);
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Registro Oficial Ecowave • Data: ${v.data || ''} às ${v.hora || ''}`, margin, yBase + 13 + imgH + 6);
    
    imgCount++;
  };

  // Fotos de Caixas Acopladas
  v.caixas_acopladas?.forEach(c => {
    if (c.imagem) addImageToDoc(c.imagem, `Caixa Acoplada: ${c.local}`);
  });

  // Fotos de Aferições do Balde 10L
  v.afericoes_medidores?.forEach(a => {
    if (a.imagem_antes) addImageToDoc(a.imagem_antes, `Hidrômetro ${a.tipo} - Leitura Antes (Aferição 10L)`);
    if (a.imagem_balde) addImageToDoc(a.imagem_balde, `Balde Graduado 10L - Hidrômetro ${a.tipo}`);
    if (a.imagem_depois) addImageToDoc(a.imagem_depois, `Hidrômetro ${a.tipo} - Leitura Depois (Aferição 10L)`);
  });

  // Fotos de Pontos de Consumo
  v.pontos_consumo_itens?.forEach(p => {
    if (p.imagem) addImageToDoc(p.imagem, `Ponto de Consumo: ${p.local} (${p.tipo})`);
  });

  // Fotos de Testes Genéricos (se houver)
  (v.testes || []).forEach((t, i) => {
    if (t.imagens?.antes) addImageToDoc(t.imagens.antes, `Teste #${i+1} - Leitura Inicial`);
    if (t.imagens?.depois) addImageToDoc(t.imagens.depois, `Teste #${i+1} - Leitura Final`);
    if (t.imagens?.recipiente) addImageToDoc(t.imagens.recipiente, `Teste #${i+1} - Verificação Recipiente`);
  });

  if (dg.imagem_medidor_agua) addImageToDoc(dg.imagem_medidor_agua, 'Medidor AF (Água Fria)');
  if (dg.imagem_serial_agua) addImageToDoc(dg.imagem_serial_agua, 'Serial do Hidrômetro AF');
  if (dg.imagem_medidor_aq) addImageToDoc(dg.imagem_medidor_aq, 'Medidor AQ (Água Quente)');
  if (dg.imagem_serial_aq) addImageToDoc(dg.imagem_serial_aq, 'Serial do Hidrômetro AQ');
  if (dg.imagem_medidor_gas) addImageToDoc(dg.imagem_medidor_gas, 'Medidor de Gás');
  if (dg.imagem_serial_gas) addImageToDoc(dg.imagem_serial_gas, 'Serial Medidor Gás');

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  const outputUri = doc.output('datauristring');
  return outputUri.includes(',') ? outputUri.split(',')[1] : outputUri;
};
