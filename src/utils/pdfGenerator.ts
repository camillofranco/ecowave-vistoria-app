import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vistoria, DadosGerais } from '../db/database';

// Função para recortar a imagem no centro em formato 1:1 quadrado perfeito, eliminando distorções
const cropToSquareBase64 = async (dataUrl: string): Promise<string> => {
  if (!dataUrl || !dataUrl.includes('base64,')) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const minDim = Math.min(img.width, img.height);
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 1000, 1000);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
          return;
        }
      } catch (e) {
        console.warn('Falha no crop 1:1 de imagem', e);
      }
      resolve(dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const generatePDF = async (v: Vistoria, logoUrl?: string): Promise<string> => {
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 18;

  // Cores Oficiais Ecowave
  const colorGreen: [number, number, number] = [45, 138, 60]; // #2d8a3c
  const colorPurple: [number, number, number] = [63, 61, 122]; // #3f3d7a
  const colorLightGray: [number, number, number] = [248, 250, 252];
  const colorDarkGray: [number, number, number] = [51, 65, 85];
  const colorBorder: [number, number, number] = [203, 213, 225]; // #cbd5e1

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

  // Rodapé Oficial em todas as páginas
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setPage(pageNum);
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.5);
    doc.line(margin, height - 14, width - margin, height - 14);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('Ecowave - Tecnologia em Medição e Vistorias Técnicas', margin, height - 9);
    doc.text(`Página ${pageNum} de ${totalPages}`, width - margin, height - 9, { align: 'right' });
  };

  // --- PÁGINA 1: CABEÇALHO E DADOS GERAIS ---
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, 38, 'F');
  if (logoBase64 && logoBase64.includes('base64,')) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, 7, 48, 17);
    } catch (e) {
      console.warn('Não foi possível renderizar a logo no PDF', e);
    }
  }
  
  // Linha decorativa verde
  doc.setDrawColor(...colorGreen);
  doc.setLineWidth(1.5);
  doc.line(0, 31, width, 31);

  const isAltoConsumo = v.tipo_vistoria === 'Alto Consumo' || v.tipo_vistoria === 'alto_consumo';

  // Título Oficial e Metadados
  doc.setTextColor(...colorPurple);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(
    isAltoConsumo 
      ? 'RELATÓRIO TÉCNICO DE ALTO CONSUMO' 
      : 'RELATÓRIO TÉCNICO DE VISTORIA GERAL', 
    margin, 
    42
  );
  
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Emissão: ${v.data || ''} às ${v.hora || ''} | Identificador: #${v.id || 'N/A'}`, margin, 48);

  // Bloco de Informações do Local (com bordas claras e estruturadas)
  const infoBoxY = 53;
  const infoBoxH = 29;
  doc.setFillColor(...colorLightGray);
  doc.setDrawColor(...colorBorder);
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
  doc.text('INFORMAÇÕES DO LOCAL VISTORIADO', margin + 5, infoBoxY + 7);
  doc.text(`MODALIDADE: ${tipoExibicao}`, width - margin - 5, infoBoxY + 7, { align: 'right' });
  
  doc.setTextColor(...colorDarkGray);
  doc.setFontSize(9.5);
  doc.text(`Condomínio: ${v.condominio || '-'}`, margin + 5, infoBoxY + 14);
  doc.text(`Bloco: ${v.bloco || '-'} | Unidade: ${v.unidade || '-'}`, width - margin - 5, infoBoxY + 14, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Técnico Responsável: ${v.tecnico || '-'}`, margin + 5, infoBoxY + 23);
  doc.text(`Responsável pela Unidade: ${v.responsavel_unidade || '-'}`, width - margin - 5, infoBoxY + 23, { align: 'right' });

  let currentY = infoBoxY + infoBoxH + 8;

  // --- SEÇÃO ALTO CONSUMO: TABELAS TÉCNICAS EXECUTIVAS ---
  if (isAltoConsumo) {
    // TABELA 1: Inspeção de Caixas Acopladas
    const caixasAtivas = (v.caixas_acopladas || []).filter(c => c.status !== 'nao_aplicavel');
    if (caixasAtivas.length > 0) {
      doc.setTextColor(...colorPurple);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('1. INSPEÇÃO PRELIMINAR DE CAIXAS ACOPLADAS (VASOS SANITÁRIOS)', margin, currentY);

      const caixasRows = caixasAtivas.map(c => {
        let statusLabel = 'EM CONFORMIDADE (SEM VAZAMENTO)';
        let statusColor: [number, number, number] = colorGreen;
        let diag = 'Vedação inferior e nível do ladrão normais';

        if (c.status === 'vazamento_ladrao') {
          statusLabel = 'VAZAMENTO NO LADRÃO';
          statusColor = [220, 38, 38];
          diag = 'Nível de água acima do tubo extravasor (regulagem necessária)';
        } else if (c.status === 'vazamento_borracha') {
          statusLabel = 'VAZAMENTO NA VEDAÇÃO INFERIOR';
          statusColor = [220, 38, 38];
          diag = 'Borracha inferior desgastada com passagem contínua de água';
        } else if (c.status === 'vazamento_ambos') {
          statusLabel = 'VAZAMENTO NO LADRÃO E NA VEDAÇÃO';
          statusColor = [220, 38, 38];
          diag = 'Transbordamento no ladrão e falha simultânea na vedação';
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
        theme: 'grid',
        headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
        bodyStyles: { fontSize: 8, cellPadding: 2.8, textColor: colorDarkGray },
        styles: { lineColor: colorBorder, lineWidth: 0.5 },
        columnStyles: {
          0: { cellWidth: 42, fontStyle: 'bold' },
          1: { cellWidth: 55, halign: 'center' },
          2: { halign: 'left' }
        }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 7;
    }

    // TABELA 2: Aferição de Precisão do Medidor (Balde 10L)
    if (v.afericoes_medidores && v.afericoes_medidores.length > 0) {
      doc.setTextColor(...colorPurple);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('2. AFERIÇÃO DE PRECISÃO DO HIDRÔMETRO (BALDE GRADUADO DE 10 LITROS)', margin, currentY);

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
          { content: isConforme ? 'CONFORME' : 'DIVERGENTE', styles: { textColor: colorResult, fontStyle: 'bold' as const } }
        ];
      });

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: margin, right: margin },
        head: [['MEDIDOR', 'LEITURA INICIAL', 'LEITURA FINAL', 'VOLUME REGISTRADO', 'BALDE GRADUADO', 'DESVIO (%)', 'RESULTADO']],
        body: afericaoRows,
        theme: 'grid',
        headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 7.5, fontStyle: 'bold', halign: 'center', cellPadding: 3 },
        bodyStyles: { fontSize: 8, halign: 'center', cellPadding: 2.8, textColor: colorDarkGray },
        styles: { lineColor: colorBorder, lineWidth: 0.5 },
        columnStyles: { 
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 26 },
          6: { fontStyle: 'bold', cellWidth: 25 }
        }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 7;
    }

    // TABELA 3: Mapeamento de Vazão dos Pontos de Consumo
    const pontosAtivos = (v.pontos_consumo_itens || []).filter(p => !p.nao_se_aplica && p.litros_10s);
    if (pontosAtivos.length > 0) {
      doc.setTextColor(...colorPurple);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('3. MAPEAMENTO DE VAZÃO DOS PONTOS DE CONSUMO (LITROS POR MINUTO)', margin, currentY);

      const pontosRows = pontosAtivos.map(p => {
        const vazao = p.vazao_l_min || 0;
        let statusVazao = 'NORMAL';
        let statusColor: [number, number, number] = [59, 130, 246]; // Azul

        if (p.categoria === 'ducha_gas') {
          if (vazao <= 8.0) {
            statusVazao = 'ECONÔMICA (0 A 8 L/min)';
            statusColor = colorGreen;
          } else if (vazao <= 13.0) {
            statusVazao = 'NORMAL (9 A 13 L/min)';
            statusColor = [59, 130, 246];
          } else {
            statusVazao = 'ALTO CONSUMO (> 13 L/min)';
            statusColor = [220, 38, 38];
          }
        } else {
          // Torneira, Chuveiro Elétrico e Ducha Higiênica
          if (vazao <= 5.0) {
            statusVazao = 'ECONÔMICO (0 A 5 L/min)';
            statusColor = colorGreen;
          } else if (vazao <= 7.0) {
            statusVazao = 'NORMAL (5 A 7 L/min)';
            statusColor = [59, 130, 246];
          } else {
            statusVazao = 'ALTO CONSUMO (> 7 L/min)';
            statusColor = [220, 38, 38];
          }
        }

        const catLabel = p.categoria === 'ducha_gas' 
          ? 'Ducha ou Chuveiro a Gás' 
          : p.categoria === 'chuveiro_eletrico' 
          ? 'Chuveiro Elétrico' 
          : p.categoria === 'ducha_higienica' 
          ? 'Ducha Higiênica' 
          : 'Torneira';

        return [
          p.local,
          catLabel,
          `${p.litros_10s} Litros`,
          `${vazao.toFixed(1).replace('.', ',')} L/min`,
          { content: statusVazao, styles: { textColor: statusColor, fontStyle: 'bold' as const } }
        ];
      });

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: margin, right: margin },
        head: [['PONTO / AMBIENTE', 'CATEGORIA DO PONTO', 'COLETA (10 SEGUNDOS)', 'VAZÃO ESTIMADA', 'CLASSIFICAÇÃO TÉCNICA']],
        body: pontosRows,
        theme: 'grid',
        headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 7.5, fontStyle: 'bold', halign: 'center', cellPadding: 3 },
        bodyStyles: { fontSize: 8, halign: 'center', cellPadding: 2.8, textColor: colorDarkGray },
        styles: { lineColor: colorBorder, lineWidth: 0.5 },
        columnStyles: { 
          0: { halign: 'left', fontStyle: 'bold' },
          1: { halign: 'left' }
        }
      });
      currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 7;
    }

  } else {
    // Modo Geral / Tradicional
    doc.setTextColor(...colorPurple);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ANÁLISE DE CONSUMO E LEITURAS', margin, currentY);
    
    const testesList = v.testes || [];
    autoTable(doc, {
      startY: currentY + 3,
      margin: { left: margin, right: margin },
      head: [['REFERÊNCIA', 'LEITURA INICIAL', 'LEITURA FINAL', 'DIFERENÇA (m³)', 'RECIPIENTE DE COLETA']],
      body: testesList.map((t, i) => [
        `Teste de Leitura #${i+1}`,
        t.leitura_antes || '-',
        t.leitura_depois || '-',
        { content: (t.diferenca || 0).toFixed(3).replace('.', ','), styles: { fontStyle: 'bold', textColor: (t.diferenca || 0) < 0 ? [239, 68, 68] : [16, 185, 129] } },
        `${t.litros_recipiente || '-'} Litros`
      ]),
      theme: 'grid',
      headStyles: { fillColor: colorPurple, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 3 },
      bodyStyles: { fontSize: 8, halign: 'center', textColor: colorDarkGray, cellPadding: 2.8 },
      styles: { lineColor: colorBorder, lineWidth: 0.5 },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 8;
  }

  // --- SEÇÃO DE PARÂMETROS TÉCNICOS COM LINHAS CLARAS E ESTRUTURADAS ---
  const dg = v.dados_gerais || ({} as DadosGerais);
  const statusRows: any[] = [];

  if (isAF && dg.serial_medidor_agua) {
    statusRows.push([
      { content: 'STATUS DO MEDIDOR AF', styles: { fontStyle: 'bold' as const } },
      { content: dg.estado_medidor_agua?.toUpperCase() || 'BOM', styles: { fontStyle: 'bold' as const, textColor: colorGreen, halign: 'center' } },
      { content: 'NÚMERO DE SÉRIE DO HIDRÔMETRO AF', styles: { fontStyle: 'bold' as const } },
      { content: dg.serial_medidor_agua || 'NÃO INFORMADO', styles: { fontStyle: 'bold' as const, halign: 'center' } }
    ]);
  }

  if (isAQ && dg.serial_medidor_aq) {
    statusRows.push([
      { content: 'STATUS DO MEDIDOR AQ', styles: { fontStyle: 'bold' as const } },
      { content: dg.estado_medidor_aq?.toUpperCase() || 'BOM', styles: { fontStyle: 'bold' as const, textColor: colorGreen, halign: 'center' } },
      { content: 'NÚMERO DE SÉRIE DO HIDRÔMETRO AQ', styles: { fontStyle: 'bold' as const } },
      { content: dg.serial_medidor_aq || 'NÃO INFORMADO', styles: { fontStyle: 'bold' as const, halign: 'center' } }
    ]);
  }

  if (isGas && dg.serial_medidor_gas) {
    statusRows.push([
      { content: 'STATUS DO MEDIDOR DE GÁS', styles: { fontStyle: 'bold' as const } },
      { content: dg.estado_medidor_gas?.toUpperCase() || 'BOM', styles: { fontStyle: 'bold' as const, textColor: colorGreen, halign: 'center' } },
      { content: 'NÚMERO DE SÉRIE DO MEDIDOR DE GÁS', styles: { fontStyle: 'bold' as const } },
      { content: dg.serial_medidor_gas || 'NÃO INFORMADO', styles: { fontStyle: 'bold' as const, halign: 'center' } }
    ]);
  }

  if (dg.relogio_parado_verificado) {
    statusRows.push([
      { content: 'TESTE DE ESTANQUEIDADE', styles: { fontStyle: 'bold' as const } },
      { content: 'EM CONFORMIDADE (RELÓGIO TOTALMENTE PARADO)', styles: { fontStyle: 'bold' as const, textColor: colorGreen, colSpan: 3 } }
    ]);
  }

  if (statusRows.length > 0) {
    autoTable(doc, {
      startY: currentY + 2,
      margin: { left: margin, right: margin },
      theme: 'grid',
      body: statusRows,
      styles: { fontSize: 7.5, cellPadding: 2.8, textColor: colorDarkGray, lineColor: colorBorder, lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: 50, fillColor: colorLightGray },
        1: { cellWidth: 35 },
        2: { cellWidth: 55, fillColor: colorLightGray },
        3: { cellWidth: 34 }
      }
    });
    currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 7;
  }

  // --- SEÇÃO 4: PARECER TÉCNICO E ASSINATURAS ---
  const neededSpace = 80;
  if (currentY + neededSpace > height - 18) {
    doc.addPage();
    currentY = 22;
    
    doc.setFillColor(...colorPurple);
    doc.rect(0, 0, width, 13, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PARECER TÉCNICO E VALIDAÇÃO DA UNIDADE VISTORIADA', width / 2, 8.5, { align: 'center' });
    currentY = 20;
  }

  // Caixa do Parecer Técnico Final
  const parecerText = v.parecer_tecnico || 'Vistoria técnica finalizada nas condições descritas neste relatório.';
  doc.setFontSize(8.5);
  const splitParecer = doc.splitTextToSize(parecerText, width - (margin * 2) - 10);
  const parecerBoxH = Math.max(26, 12 + (splitParecer.length * 4.2));

  doc.setFillColor(...colorLightGray);
  doc.setDrawColor(...colorBorder);
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

  currentY += parecerBoxH + 7;

  // --- BLOCO DE ASSINATURAS OFICIAIS COM NOMES DISCRIMINADOS ---
  const sigBoxW = (width - (margin * 2) - 10) / 2;
  const clientSigX = margin;
  const techSigX = margin + sigBoxW + 10;
  const sigBoxH = 47;

  // Caixa de Assinatura do Morador / Responsável
  doc.setFillColor(...colorLightGray);
  doc.setDrawColor(...colorBorder);
  doc.roundedRect(clientSigX, currentY, sigBoxW, sigBoxH, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorPurple);
  doc.text('ASSINATURA DO MORADOR / RESPONSÁVEL', clientSigX + 4, currentY + 6);
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Declaro que acompanhei a vistoria e recebi este laudo.', clientSigX + 4, currentY + 10);

  // Imagem da Assinatura do Cliente
  const clientSig = v.assinatura_cliente || v.assinatura;
  if (clientSig && clientSig.includes('base64,')) {
    try {
      doc.addImage(clientSig, 'PNG', clientSigX + (sigBoxW - 55) / 2, currentY + 11, 55, 17);
    } catch (e) {
      console.warn('Erro ao renderizar assinatura do cliente no PDF', e);
    }
  }

  // Linha de Assinatura do Cliente
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(clientSigX + 6, currentY + 31, clientSigX + sigBoxW - 6, currentY + 31);

  // Nome e Cargo do Morador / Responsável
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorDarkGray);
  const nomeMorador = (v.responsavel_unidade && v.responsavel_unidade.trim()) 
    ? v.responsavel_unidade.toUpperCase() 
    : 'MORADOR / RESPONSÁVEL PELA UNIDADE';
  doc.text(nomeMorador, clientSigX + sigBoxW / 2, currentY + 36, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Acompanhante / Recebimento da Vistoria', clientSigX + sigBoxW / 2, currentY + 41, { align: 'center' });

  // Caixa de Assinatura do Técnico Responsável
  doc.setFillColor(...colorLightGray);
  doc.setDrawColor(...colorBorder);
  doc.roundedRect(techSigX, currentY, sigBoxW, sigBoxH, 2, 2, 'FD');

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
      doc.addImage(techSig, 'PNG', techSigX + (sigBoxW - 55) / 2, currentY + 11, 55, 17);
    } catch (e) {
      console.warn('Erro ao renderizar assinatura do técnico no PDF', e);
    }
  }

  // Linha de Assinatura do Técnico
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(techSigX + 6, currentY + 31, techSigX + sigBoxW - 6, currentY + 31);

  // Nome e Cargo do Técnico Responsável
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorDarkGray);
  const nomeTecnico = (v.tecnico && v.tecnico.trim()) 
    ? v.tecnico.toUpperCase() 
    : 'TÉCNICO RESPONSÁVEL ECOWAVE';
  doc.text(nomeTecnico, techSigX + sigBoxW / 2, currentY + 36, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Ecowave Tecnologia e Medições', techSigX + sigBoxW / 2, currentY + 41, { align: 'center' });

  // --- PÁGINA 2+: ANEXO FOTOGRÁFICO COM FOTOS 1:1 REAIS SEM DISTORÇÃO ---
  let imgCount = 0;
  const addImageToDoc = async (dataUrl: string, label: string) => {
    if (!dataUrl || !dataUrl.includes('base64,')) return;

    if (imgCount % 2 === 0) {
      doc.addPage();
      
      doc.setFillColor(...colorPurple);
      doc.rect(0, 0, width, 14, 'F');
      doc.setTextColor(255);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('ANEXO FOTOGRÁFICO - EVIDÊNCIAS TÉCNICAS DE CAMPO', width / 2, 9, { align: 'center' });
    }
    
    const isSecond = imgCount % 2 === 1;
    const yBase = isSecond ? 152 : 22;
    const imgSize = 105; // 105mm x 105mm
    const xPos = (width - imgSize) / 2;
    
    // Título da Imagem (Sem abreviações)
    doc.setTextColor(...colorPurple);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), margin, yBase + 6);
    
    // Moldura 1:1 com bordas suaves
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(...colorBorder);
    doc.setLineWidth(0.5);
    doc.roundedRect(xPos - 1, yBase + 10, imgSize + 2, imgSize + 2, 1, 1, 'FD');
    
    try {
      const croppedBase64 = await cropToSquareBase64(dataUrl);
      doc.addImage(croppedBase64, 'JPEG', xPos, yBase + 11, imgSize, imgSize);
    } catch (e) {
      console.error('Erro ao renderizar foto no anexo:', e);
    }
    
    // Legenda Completa com dados técnicos
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Registro Oficial Ecowave • Data: ${v.data || ''} às ${v.hora || ''} • Condomínio: ${v.condominio || '-'} • Bloco ${v.bloco || '-'} Unidade ${v.unidade || '-'}`, 
      margin, 
      yBase + 11 + imgSize + 6
    );
    
    imgCount++;
  };

  // 1. Fotos de Caixas Acopladas (apenas ativas)
  if (v.caixas_acopladas) {
    for (const c of v.caixas_acopladas) {
      if (c.status !== 'nao_aplicavel' && c.imagem) {
        await addImageToDoc(c.imagem, `Caixa Acoplada: ${c.local}`);
      }
    }
  }

  // 2. Fotos de Aferições do Balde de 10 Litros
  if (v.afericoes_medidores) {
    for (const a of v.afericoes_medidores) {
      if (a.imagem_antes) await addImageToDoc(a.imagem_antes, `Hidrômetro ${a.tipo} - Leitura Inicial (Aferição 10 Litros)`);
      if (a.imagem_balde) await addImageToDoc(a.imagem_balde, `Balde Graduado (10 Litros) - Hidrômetro ${a.tipo}`);
      if (a.imagem_depois) await addImageToDoc(a.imagem_depois, `Hidrômetro ${a.tipo} - Leitura Final (Aferição 10 Litros)`);
    }
  }

  // 3. Fotos de Pontos de Consumo (apenas ativos)
  if (v.pontos_consumo_itens) {
    for (const p of v.pontos_consumo_itens) {
      if (!p.nao_se_aplica && p.imagem) {
        const catLabel = p.categoria === 'ducha_gas' 
          ? 'Ducha ou Chuveiro a Gás' 
          : p.categoria === 'chuveiro_eletrico' 
          ? 'Chuveiro Elétrico' 
          : p.categoria === 'ducha_higienica' 
          ? 'Ducha Higiênica' 
          : 'Torneira';
        await addImageToDoc(p.imagem, `Ponto de Consumo: ${p.local} (${catLabel} - ${p.tipo})`);
      }
    }
  }

  // 4. Fotos de Testes Gerais (se houver)
  if (v.testes) {
    for (let i = 0; i < v.testes.length; i++) {
      const t = v.testes[i];
      if (t.imagens?.antes) await addImageToDoc(t.imagens.antes, `Teste de Leitura #${i+1} - Leitura Inicial`);
      if (t.imagens?.depois) await addImageToDoc(t.imagens.depois, `Teste de Leitura #${i+1} - Leitura Final`);
      if (t.imagens?.recipiente) await addImageToDoc(t.imagens.recipiente, `Teste de Leitura #${i+1} - Recipiente de Verificação`);
    }
  }

  // 5. Fotos dos Medidores e Seriais
  if (dg.imagem_medidor_agua) await addImageToDoc(dg.imagem_medidor_agua, 'Medidor AF (Água Fria)');
  if (dg.imagem_serial_agua) await addImageToDoc(dg.imagem_serial_agua, 'Número de Série do Hidrômetro AF');
  if (dg.imagem_medidor_aq) await addImageToDoc(dg.imagem_medidor_aq, 'Medidor AQ (Água Quente)');
  if (dg.imagem_serial_aq) await addImageToDoc(dg.imagem_serial_aq, 'Número de Série do Hidrômetro AQ');
  if (dg.imagem_medidor_gas) await addImageToDoc(dg.imagem_medidor_gas, 'Medidor de Gás');
  if (dg.imagem_serial_gas) await addImageToDoc(dg.imagem_serial_gas, 'Número de Série do Medidor de Gás');

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  const outputUri = doc.output('datauristring');
  return outputUri.includes(',') ? outputUri.split(',')[1] : outputUri;
};
