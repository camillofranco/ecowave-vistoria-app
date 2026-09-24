# Análise do app e integração com o portal

## Estado verificado

- A versão React/Capacitor (`ecowave-vistoria-app`) grava vistorias apenas no IndexedDB local e compartilha arquivos PDF pelo sistema operacional.
- A versão antiga (`App_Vistorias_Ecowave`) é um PWA separado, sem a estrutura de histórico da versão React.
- O Portal Ecowave mostra relatórios por condomínio, bloco e unidade. A importação atual de PDFs e imagens é orientada a competências mensais; o próprio portal exige pré-validação e confirmação.
- O código do portal está em um repositório privado separado (`ecowave-portal-reports`). Sua estrutura foi examinada no GitHub, mas não há checkout local autenticado nesta tarefa. Não existe fluxo confirmado para envio de vistoria individual.

## Onde implantar a integração no portal existente

O portal usa TanStack Start/React e Supabase. As rotas ficam em `src/routes/_authenticated/`; os componentes compartilhados, em `src/components/`; as regras de banco e storage, em `supabase/migrations/`. O arquivo `src/routeTree.gen.ts` é gerado automaticamente e não deve ser editado.

| Necessidade | Local do portal | Implantação proposta |
| --- | --- | --- |
| Vínculo inequívoco com condomínio, bloco e unidade | `public.condominiums`, `public.units` e `src/components/location-search.tsx` | Selecionar a unidade existente pelo UUID `units.id`. O bloco já é texto em `units.block`; validar no servidor a relação com o condomínio. |
| Persistência das vistorias e auditorias | Nova migração em `supabase/migrations/` | Criar `inspections` com `inspection_uid` único, `unit_id`, tipo, data, técnico, conteúdo estruturado versionado e status. Permitir múltiplas vistorias por unidade e mês. |
| Evidências e PDF | Nova migração de storage e tabela `inspection_artifacts` | Bucket privado próprio, caminhos por ID de vistoria, tamanho/hash/MIME, políticas RLS vinculadas à vistoria. Links temporários para leitura. |
| Envio autenticado pelo app React/Android | Nova função de servidor em `src/lib/inspections.functions.ts` ou rota de API TanStack Start | Validar sessão, permissão do técnico, `unit_id`, tipo e tamanho dos arquivos, integridade do PDF e idempotência por `inspection_uid`. Devolver recibo persistido. |
| Revisão profissional | `supabase/migrations/` e nova rota `src/routes/_authenticated/admin.auditorias.tsx` | Cadastro de revisoras autorizadas, fila de auditorias, registro imutável de aprovação/devolução, CREA/UF, ART quando aplicável, data e versão aprovada. Somente a revisão autenticada muda o status para `validada`. |
| Consulta administrativa | Nova rota `src/routes/_authenticated/admin.vistorias.tsx`, `src/components/admin-shell.tsx` | Usar os filtros e a árvore já existentes. Exibir status, modalidade, data, técnico, unidade e acesso às evidências; menu próprio. |
| Entrega ao condomínio e morador | `src/routes/_authenticated/sindico.tsx`, `src/routes/_authenticated/meus-relatorios.tsx` ou novas rotas irmãs | Mostrar apenas documentos publicados e permitidos pelo vínculo do síndico ao condomínio ou do morador à unidade. Registrar publicação e eventual notificação sem afirmar entrega por e-mail antes de confirmação. |
| Autorização e tipos | `src/integrations/supabase/types.ts`, `src/lib/admin-guard.ts`, `src/hooks/use-session.ts` | Regenerar tipos após migração. Separar papel de técnico/revisora das contas de cliente; conferir permissões no banco e no servidor, não apenas na interface. |

### Por que a tabela mensal não serve

`reports` guarda `unit_id`, `condominium_id`, `competence`, `storage_path` e impõe `unique (unit_id, competence)`. A importação de `admin.importar-relatorios.tsx` e a lista `ReportList` trabalham com competências mensais. Usar essa tabela para vistorias impediria dois documentos para a mesma unidade no mesmo mês e misturaria medição com auditoria. O bucket `reports` também tem políticas atreladas a linhas dessa tabela. É necessário criar tabela e políticas próprias antes de ativar o envio no app.

### Sequência de implantação

1. Criar migração aditiva para `inspections`, `inspection_artifacts`, `audit_review_events` e permissões de técnico/revisora, com RLS para administração, responsável profissional, síndico e morador. Preservar as tabelas mensais.
2. Criar operação de envio no portal com recibo e rejeição de duplicatas por `inspection_uid`; manter auditorias como `pendente_revisao` até aprovação profissional autenticada.
3. Criar fila de revisão e telas administrativas para listar, corrigir vínculo e publicar; depois incluir leitura nas áreas do síndico e do morador.
4. Ligar o app React/Android à seleção de unidade e ao envio autenticado; manter fila offline, reenvio seguro e comprovante de recebimento.
5. Testar autorização cruzada entre condomínios, dupla submissão, falha de rede, troca de unidade, devolução/reaprovação e acesso a PDF privado.

**Limite atual:** a inspeção do repositório privado foi somente leitura pela interface do GitHub. Nenhuma migração, tela ou endpoint do portal foi publicado; o app também continua sem envio direto até que o backend exista e seja testado.

## Melhorias feitas na versão React

1. Criada modalidade **Auditoria Ambiental** com planejamento, oito critérios, constatações, fotos, criticidade, ações corretivas, responsáveis, prazos, conclusão e revisão declarada por engenheira ambiental.
2. Adicionado PDF próprio de auditoria com matriz de achados, plano de ação, dados da revisora e anexos fotográficos. O documento deixa explícito que uma assinatura no aparelho não comprova habilitação profissional.
3. Corrigido o estado inicial de caixas acopladas e aferições: antes apareciam conformes mesmo sem teste. Leituras inválidas agora não recebem classificação de conformidade.
4. Corrigida a prévia/compartilhamento do PDF no navegador. O acesso ao sistema de arquivos e ao compartilhamento do Capacitor é feito somente no Android/iOS.
5. Removido o envio paralelo e silencioso para um Google Apps Script por `no-cors`, que não permitia verificar a entrega. Removido o botão de WhatsApp que dizia haver anexo sem anexá-lo.
6. O histórico agora permite retomar e editar uma vistoria. A identificação de condomínio, bloco e unidade é exigida no salvamento.
7. O PDF comum passa a identificar corretamente vistorias de vazamento e troca e não afirma que um parecer ausente foi concluído.
8. Cada nova vistoria recebe um identificador global estável no registro e no PDF, preparando o envio sem duplicação ao portal.

## Pendências técnicas que exigem alinhamento com a Ecowave

| Prioridade | Item | Motivo |
| --- | --- | --- |
| Alta | Publicação e vínculo direto no portal | Requer endpoint autenticado e validação da unidade no servidor. Não há API confirmada para vistoria individual. |
| Alta | Validação oficial da engenheira | O portal precisa identificar a revisora, conferir suas permissões e manter trilha de aprovação. Uma assinatura desenhada localmente não autentica a pessoa. |
| Alta | Revisão dos critérios técnicos | Faixas de vazão e tolerância de aferição existentes no app são fixas no código. A engenheira deve aprovar método, critérios, tolerâncias e redação antes do uso como laudo oficial. |
| Média | Persistência e sincronização | O IndexedDB pode ser perdido; para equipes, é necessário backup autenticado, fila offline e confirmação de sincronização. |
| Média | Fluxos de vazamento e troca | As modalidades compartilham etapas genéricas. Convém criar checklists específicos de segurança, equipamento removido/instalado e evidências. |
| Média | PDF comum | Há trechos de apresentação duplicados por modalidade; a manutenção deve ser consolidada para reduzir divergências. |

## Contrato recomendado para envio ao portal

1. O app autentica o técnico por um fluxo oficial do portal; nenhuma chave privilegiada fica no aplicativo.
2. O app consulta condomínios e unidades autorizados. O usuário escolhe condomínio, bloco e unidade; o servidor devolve um `unit_id` inequívoco. Nomes digitados não devem ser a chave de associação.
3. Ao enviar, o app inclui um identificador único da vistoria, tipo, data, dados estruturados, PDF e hash SHA-256 do arquivo. O servidor confere autorização e se o `unit_id` pertence ao condomínio/bloco informado.
4. O servidor grava o PDF em storage privado, cria registro de **vistoria** separado de relatório de consumo mensal, devolve ID e status, e rejeita duplicação pelo identificador único.
5. Auditorias entram como **pendentes de revisão**. Uma conta com papel de engenheira revisora confere evidências, registra CREA/UF e ART quando aplicável, aprova ou devolve para correção. Somente o servidor pode marcar **validada** e liberá-la ao condomínio/morador.
6. O app mantém estados `local`, `aguardando_envio`, `recebido`, `em_revisao`, `validado` ou `devolvido`, com recibo do portal. Falhas de rede preservam a vistoria para reenvio idempotente.

O app não marca um arquivo como entregue ao portal sem o recibo do servidor. É necessário acesso ao código/API do portal e definição de quem pode ver cada tipo de relatório antes de ligar o botão de envio direto.

## Referências profissionais

- [Consulta profissional do Confea](https://consultaprofissional.confea.org.br/)
- [Anotação de Responsabilidade Técnica — Confea](https://www.confea.org.br/servicos-prestados/anotacao-de-responsabilidade-tecnica-art)
