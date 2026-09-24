# Ecowave Vistorias

Aplicativo React/Capacitor para coleta local de vistorias de água e gás, com geração de PDF e histórico no aparelho.

## Uso

1. Preencha condomínio, bloco, unidade e técnico.
2. Selecione a modalidade. Em **Auditoria Ambiental**, registre objetivo, escopo, método, período, documentos e limitações.
3. Classifique os oito critérios. Para cada não conformidade, registre constatação, criticidade e ação corretiva. Anexe evidências fotográficas quando disponíveis.
4. Redija a conclusão. O relatório pode ser salvo como registro local e exportado para revisão.
5. A engenheira ambiental deve revisar os dados e, quando adequado, informar nome, CREA/UF, ART e assinar. A assinatura inserida no aparelho é uma declaração; a verificação de habilitação e a liberação oficial dependem do portal.

O app funciona com dados armazenados no navegador/aparelho por IndexedDB. Limpar os dados do navegador ou desinstalar o app pode apagar vistorias que ainda não tenham sido exportadas. O botão **Enviar** abre o compartilhamento do PDF ou faz download no navegador; ele não confirma importação no Portal Ecowave.

## Desenvolvimento

```sh
npm ci
npm run build
npm run dev
```

## Integração com o Portal Ecowave

O portal atualmente importa PDFs por competência mensal e referência de unidade. Esse fluxo não deve receber automaticamente um relatório de vistoria ou auditoria, porque tem finalidade e validações diferentes. Consulte [ANALISE_E_INTEGRACAO.md](./ANALISE_E_INTEGRACAO.md) para o contrato proposto de envio por condomínio, bloco e unidade.
