# Vistorias e auditorias no Ecowave

## Decisões do projeto

- O aplicativo em uso é o React/Android (`ecowave-vistoria-app`). O PWA antigo é apenas referência.
- Vistorias ficam separadas dos relatórios mensais do portal. A tabela `reports` tem unicidade por unidade e competência e não atende múltiplas vistorias no mesmo mês.
- O vínculo é feito pelo ID da unidade existente no portal; condomínio, bloco e número são conferidos antes do envio e a relação condomínio/unidade é validada no banco.
- A auditoria é um registro técnico de campo até que uma engenheira ambiental autorizada revise as evidências no portal. Consulta manual do CREA é registrada pelo administrador ao habilitar a revisora; não equivale à aprovação da auditoria.
- Após aprovação, a administração pode publicar a auditoria **somente para moradores com vínculo ativo à unidade**. O síndico não recebe a auditoria. Administradores, a revisora e o técnico responsável conservam acesso operacional ao registro.

## Entrega implementada

### Aplicativo React/Android

- Formulário de auditoria com objetivo, escopo, método, período, documentos, limitações, oito critérios, evidências, criticidade, ações corretivas e conclusão.
- PDF de registro de campo com matriz de constatações, plano de ação e fotos. O estado da validação profissional é consultado no portal.
- Conta do portal no app, seleção de condomínio, bloco e unidade, upload de PDF privado, hash SHA-256, envio estruturado e recibo persistido localmente.
- Consulta do estado remoto, correção e reenvio de auditoria devolvida. Vistorias já enviadas ficam bloqueadas para edição, exceto auditorias devolvidas.
- Correções do formulário e PDF comuns, prévia/compartilhamento e assinatura. O compartilhamento manual continua disponível.

### Portal

- Migração `supabase/migrations/20260928000000_inspections_audits.sql`: equipe autorizada, tabela `inspections`, eventos de revisão, storage privado e políticas de acesso. Nenhuma tabela mensal é alterada.
- Administração em `/admin/vistorias`: lista documentos, habilita técnicos e revisoras e publica para o morador. A habilitação da revisora exige registro da conferência manual do CREA.
- Revisão em `/auditorias`: a revisora autenticada abre o PDF, registra justificativa e eventual ART, aprova ou devolve. A autora da auditoria não pode revisar a própria auditoria.
- Morador em `/minhas-vistorias`: consulta PDFs publicados da própria unidade e, nas auditorias, nome, CREA, data, parecer e ART informada pela revisora.
- Documentos privados são acessados por links temporários. A auditoria não pode ser publicada antes da aprovação nem para o síndico.

## Verificações feitas

- Build de produção e TypeScript do app: sem erros.
- Build de produção e TypeScript do portal: sem erros.
- Estrutura real do banco Supabase conferida em modo leitura: tabelas e colunas exigidas estão presentes; o controle administrativo usa `private.has_role`.
- Os dois PRs foram integrados às respectivas ramificações principais em 24/09/2026. A migração foi aplicada ao banco do portal e as páginas novas estão publicadas.
- O teste transacional com uma auditoria fictícia confirmou que a aprovação e a publicação funcionam e que o morador da unidade consegue consultar o registro enquanto uma conta de outra unidade não consegue. A transação foi revertida e não deixou dados de teste.
- O fluxo de compilação e publicação do app no GitHub Pages concluiu com sucesso e gerou um APK Android de teste.

## Ordem de ativação e testes finais

1. Cadastrar contas reais de técnicos e, após conferir o CREA, da engenheira revisora em `/admin/vistorias`.
2. Validar com contas reais de administrador, técnico, revisora e morador, incluindo uma conta de síndico sem acesso à auditoria.
3. Testar envio, recibo, duplicação, devolução, reenvio, aprovação, publicação e leitura do PDF pela unidade correta.
4. Regenerar os tipos do Supabase na próxima manutenção do portal e distribuir um APK de produção assinado caso a equipe precise atualizar o pacote Android, além da versão web já publicada.

## Melhorias posteriores recomendadas

- Rever tecnicamente as faixas de vazão e tolerâncias existentes antes de usá-las em laudos oficiais.
- Dividir o fluxo comum de vazamento e troca em checklists específicos.
- Adicionar fila de sincronização automática e backup autenticado do material ainda local.
- Reduzir o tamanho do pacote JavaScript e consolidar trechos duplicados no PDF comum.

ATENÇÃO: a compilação e a inspeção de esquema não substituem o teste ponta a ponta com usuários reais nem a conferência profissional do conteúdo da auditoria.
