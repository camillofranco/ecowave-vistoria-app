# Ecowave Vistorias

Aplicativo React/Capacitor para vistorias de água e gás, auditoria ambiental, PDF e histórico local.

## Uso

1. Registre condomínio, bloco, unidade, técnico e modalidade.
2. Na Auditoria Ambiental, documente objetivo, escopo, método, período, fontes, limitações, oito critérios, evidências, ações corretivas e conclusão.
3. Salve a vistoria no aparelho. No histórico, entre com a conta da equipe no Portal Ecowave, escolha a unidade cadastrada e confirme o envio. O app apresenta um recibo após a gravação no portal.
4. Uma engenheira ambiental habilitada pela administração revisa a auditoria no portal, aprova ou devolve com justificativa. A administração publica a auditoria aprovada somente para moradores vinculados à unidade.
5. O morador consulta o PDF e os dados da aprovação em **Minhas vistorias** no portal.

O PDF produzido no aparelho é um registro de campo; a validação profissional aparece no portal. O compartilhamento manual do PDF continua disponível.

Vistorias ainda não enviadas ficam apenas no IndexedDB do aparelho. Limpar dados do navegador ou desinstalar o app pode apagá-las.

## Desenvolvimento

```sh
pnpm install
pnpm run build
pnpm run dev
```

## Integração

O portal armazena vistorias em tabelas e bucket próprios, separados dos relatórios mensais. A migração do portal deve ser aplicada antes de habilitar o envio em produção. Consulte [ANALISE_E_INTEGRACAO.md](./ANALISE_E_INTEGRACAO.md).
