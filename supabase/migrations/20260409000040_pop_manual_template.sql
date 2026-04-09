create table if not exists public.pop_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  content text not null,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pop_documents_tenant_idx on public.pop_documents (tenant_id);
create index if not exists pop_documents_template_idx on public.pop_documents (tenant_id, is_template);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pop_documents_updated_at on public.pop_documents;
create trigger set_pop_documents_updated_at
  before update on public.pop_documents
  for each row
  execute function public.set_updated_at();

create or replace function public.seed_default_pop_templates(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pop_documents (tenant_id, title, content, is_template)
  select p_tenant_id, template.title, template.content, true
  from (
    values
      (
        'POP - Limpeza de Instrumentais',
        E'POP - LIMPEZA DE INSTRUMENTAIS\n\nResponsavel: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Separar instrumentais utilizados em area de descontaminacao.\n2. Lavar com agua corrente e detergente enzimatico.\n3. Escovar articulacoes e superfices criticas.\n4. Secar completamente antes da esterilizacao.\n5. Registrar lote, data e responsavel no controle interno.'
      ),
      (
        'POP - Esterilizacao',
        E'POP - ESTERILIZACAO\n\nResponsavel: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Conferir limpeza previa do material.\n2. Embalar e identificar o instrumental.\n3. Inserir em autoclave conforme carga recomendada.\n4. Validar indicadores quimicos e biologicos.\n5. Armazenar em local limpo, seco e identificado.'
      ),
      (
        'POP - Atendimento Inicial',
        E'POP - ATENDIMENTO INICIAL\n\nResponsavel: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Confirmar identificacao do paciente.\n2. Realizar anamnese e avaliacao clinica inicial.\n3. Higienizar area e instrumentais antes do procedimento.\n4. Registrar condutas e orientacoes no prontuario.\n5. Agendar retorno quando necessario.'
      ),
      (
        'Manual de Boas Praticas e Procedimentos Operacionais Padrao (POP)',
        $pop$MANUAL DE BOAS PRATICAS E PROCEDIMENTOS OPERACIONAIS PADRAO (POP)
ESTABELECIMENTO: {{ESTABELECIMENTO}}

RESPONSAVEL TECNICO: {{NOME_PROFISSIONAL}} - {{REGISTRO_OU_CPF}}

BASE LEGAL: RDC 15/2012 (CME), RDC 222/2018 (Residuos), RDC 63/2011 (Boas Praticas de Servicos de Saude).

1. OBJETIVO E ESCOPO
Estabelecer criterios rigorosos de biosseguranca para eliminar ou minimizar riscos biologicos, quimicos e fisicos, assegurando a integridade do paciente, do profissional e do meio ambiente, em total conformidade com as normas da ANVISA e Secretarias Estaduais/Municipais de Saude.

POP 01: HIGIENE DAS MAOS E ANTISSEPSIA
Fundamentacao: Protocolo da OMS e RDC 42/2010.

Infraestrutura Exigida: Lavatorio exclusivo para maos (separado da pia de expurgo), dotado de sabonete liquido, papel toalha (nao reciclado) e lixeira de pedal.

Procedimento Adicional: Alem da lavagem com agua e sabao, incluir a friccao antisseptica com alcool em gel 70% entre procedimentos quando as maos nao apresentarem sujidade visivel.

Proibicao Critica: E terminantemente proibido o uso de adornos (aneis, pulseiras, relogios) durante o atendimento (NR-32). Unhas devem ser mantidas curtas e sem esmalte (ou esmalte integro, sem descamacoes).

POP 02: EQUIPAMENTOS DE PROTECAO INDIVIDUAL (EPI)
Fundamentacao: NR-6 e NR-32.

Especificacoes Tecnicas:

Mascara: Deve ser trocada a cada 2 horas ou sempre que estiver umida/suja.

Jaleco/Avental: De uso restrito ao ambiente de trabalho. E proibido circular em areas comuns ou via publica com o EPI. Gramatura minima recomendada para descartaveis: 30g/m2.

Luvas: Proibido o reaproveitamento ou lavagem. Devem ser trocadas entre cada paciente ou em caso de ruptura.

Oculos de Protecao: Devem possuir protecao lateral e ser desinfetados com alcool 70% apos cada uso.

POP 03: GERENCIAMENTO DA CENTRAL DE MATERIAL E ESTERILIZACAO (CME)
Este e o ponto de maior rigor. O fluxo deve ser unidirecional (da area suja para a limpa).

Fase 1: Limpeza e Descontaminacao (Area Suja)
Detergente Multienzimatico: Utilizar solucao com no minimo 4 enzimas. A diluicao deve seguir rigorosamente o rotulo do fabricante (usar copo medidor).

Tempo de Imersao: Monitorado por cronometro.

Limpeza Mecanica: Priorizar lavadora ultrassonica para remover biofilme de articulacoes de alicates e ranhuras de brocas.

Fase 2: Preparo e Acondicionamento (Area Limpa)
Inspecao: Uso obrigatorio de lupa de bancada para verificar residuos.

Embalagem: Papel grau cirurgico com fita indicadora. Atencao: Proibido o uso de estufas. Apenas Autoclave.

Fase 3: Esterilizacao e Controle de Qualidade (O Coracao da Fiscalizacao)
A clinica deve manter o Livro de Registro de Esterilizacao contendo:

Monitoramento Fisico: Impressao da autoclave ou registro manual de tempo/temperatura/pressao.

Monitoramento Quimico: Colar o indicador Classe 5 ou 6 de cada ciclo no livro.

Monitoramento Biologico: Frequencia minima semanal. O resultado da leitura (negativo/positivo) deve ser colado no livro com o lote da ampola.

Manutencao: Laudo de calibracao anual da autoclave e da seladora.

POP 04: HIGIENE AMBIENTAL E DO MOBILIARIO
Fundamentacao: RDC 63/2011.

Classificacao de Areas: A sala de atendimento e classificada como Area Semicritica.

Desinfetantes de Nivel Intermediario: Para superficies, utilizar Alcool 70%, Quaternario de Amonio de 5a Geracao ou Hipoclorito de Sodio a 1%.

Tecnica de Limpeza: Sempre do "mais limpo para o mais sujo" e de "cima para baixo". Jamais varrer a seco (usar mop ou pano umido) para evitar suspensao de particulas.

Registro: Manter planilha de limpeza terminal assinada pelo executor.

POP 05: GERENCIAMENTO DE RESIDUOS (PGRSS)
Fundamentacao: RDC 222/2018.

Segregacao na Fonte:

Grupo A (Infectante): Saco branco leitoso com simbolo de risco biologico. Limite de 2/3 da capacidade.

Grupo E (Perfurocortante): Caixa de papelao rigida (Descarpack). Deve estar em suporte de parede, nunca no chao. Descartar quando atingir a linha tracejada.

Armazenamento Externo: O estabelecimento deve possuir um abrigo de residuos (conforme norma municipal) ate a coleta especializada.

Documentacao: Manter arquivado o contrato com a empresa de coleta e os MTRs (Manifesto de Transporte de Residuos).

POP 06: ATENDIMENTO E BIOSSEGURANCA DO PACIENTE
Anamnese e Prontuario: Essencial para a VISA. Todo paciente deve ter ficha com historico de saude, alergias e termo de consentimento livre e esclarecido.

Barreiras Fisicas: Uso de campos descartaveis sobre a bancada e protetores plasticos em locais de contato manual frequente (foco, comandos da cadeira).

Abertura do Material: O kit esteril deve ser aberto somente apos o profissional estar paramentado e na presenca do paciente, verificando a viragem da cor do indicador quimico na frente do cliente.$pop$
      )
  ) as template(title, content)
  where not exists (
    select 1
    from public.pop_documents d
    where d.tenant_id = p_tenant_id
      and d.title = template.title
      and d.is_template = true
  );
end;
$$;

insert into public.pop_documents (tenant_id, title, content, is_template)
select
  t.id,
  'Manual de Boas Praticas e Procedimentos Operacionais Padrao (POP)',
  $pop$MANUAL DE BOAS PRATICAS E PROCEDIMENTOS OPERACIONAIS PADRAO (POP)
ESTABELECIMENTO: {{ESTABELECIMENTO}}

RESPONSAVEL TECNICO: {{NOME_PROFISSIONAL}} - {{REGISTRO_OU_CPF}}

BASE LEGAL: RDC 15/2012 (CME), RDC 222/2018 (Residuos), RDC 63/2011 (Boas Praticas de Servicos de Saude).

1. OBJETIVO E ESCOPO
Estabelecer criterios rigorosos de biosseguranca para eliminar ou minimizar riscos biologicos, quimicos e fisicos, assegurando a integridade do paciente, do profissional e do meio ambiente, em total conformidade com as normas da ANVISA e Secretarias Estaduais/Municipais de Saude.

POP 01: HIGIENE DAS MAOS E ANTISSEPSIA
Fundamentacao: Protocolo da OMS e RDC 42/2010.

Infraestrutura Exigida: Lavatorio exclusivo para maos (separado da pia de expurgo), dotado de sabonete liquido, papel toalha (nao reciclado) e lixeira de pedal.

Procedimento Adicional: Alem da lavagem com agua e sabao, incluir a friccao antisseptica com alcool em gel 70% entre procedimentos quando as maos nao apresentarem sujidade visivel.

Proibicao Critica: E terminantemente proibido o uso de adornos (aneis, pulseiras, relogios) durante o atendimento (NR-32). Unhas devem ser mantidas curtas e sem esmalte (ou esmalte integro, sem descamacoes).

POP 02: EQUIPAMENTOS DE PROTECAO INDIVIDUAL (EPI)
Fundamentacao: NR-6 e NR-32.

Especificacoes Tecnicas:

Mascara: Deve ser trocada a cada 2 horas ou sempre que estiver umida/suja.

Jaleco/Avental: De uso restrito ao ambiente de trabalho. E proibido circular em areas comuns ou via publica com o EPI. Gramatura minima recomendada para descartaveis: 30g/m2.

Luvas: Proibido o reaproveitamento ou lavagem. Devem ser trocadas entre cada paciente ou em caso de ruptura.

Oculos de Protecao: Devem possuir protecao lateral e ser desinfetados com alcool 70% apos cada uso.

POP 03: GERENCIAMENTO DA CENTRAL DE MATERIAL E ESTERILIZACAO (CME)
Este e o ponto de maior rigor. O fluxo deve ser unidirecional (da area suja para a limpa).

Fase 1: Limpeza e Descontaminacao (Area Suja)
Detergente Multienzimatico: Utilizar solucao com no minimo 4 enzimas. A diluicao deve seguir rigorosamente o rotulo do fabricante (usar copo medidor).

Tempo de Imersao: Monitorado por cronometro.

Limpeza Mecanica: Priorizar lavadora ultrassonica para remover biofilme de articulacoes de alicates e ranhuras de brocas.

Fase 2: Preparo e Acondicionamento (Area Limpa)
Inspecao: Uso obrigatorio de lupa de bancada para verificar residuos.

Embalagem: Papel grau cirurgico com fita indicadora. Atencao: Proibido o uso de estufas. Apenas Autoclave.

Fase 3: Esterilizacao e Controle de Qualidade (O Coracao da Fiscalizacao)
A clinica deve manter o Livro de Registro de Esterilizacao contendo:

Monitoramento Fisico: Impressao da autoclave ou registro manual de tempo/temperatura/pressao.

Monitoramento Quimico: Colar o indicador Classe 5 ou 6 de cada ciclo no livro.

Monitoramento Biologico: Frequencia minima semanal. O resultado da leitura (negativo/positivo) deve ser colado no livro com o lote da ampola.

Manutencao: Laudo de calibracao anual da autoclave e da seladora.

POP 04: HIGIENE AMBIENTAL E DO MOBILIARIO
Fundamentacao: RDC 63/2011.

Classificacao de Areas: A sala de atendimento e classificada como Area Semicritica.

Desinfetantes de Nivel Intermediario: Para superficies, utilizar Alcool 70%, Quaternario de Amonio de 5a Geracao ou Hipoclorito de Sodio a 1%.

Tecnica de Limpeza: Sempre do "mais limpo para o mais sujo" e de "cima para baixo". Jamais varrer a seco (usar mop ou pano umido) para evitar suspensao de particulas.

Registro: Manter planilha de limpeza terminal assinada pelo executor.

POP 05: GERENCIAMENTO DE RESIDUOS (PGRSS)
Fundamentacao: RDC 222/2018.

Segregacao na Fonte:

Grupo A (Infectante): Saco branco leitoso com simbolo de risco biologico. Limite de 2/3 da capacidade.

Grupo E (Perfurocortante): Caixa de papelao rigida (Descarpack). Deve estar em suporte de parede, nunca no chao. Descartar quando atingir a linha tracejada.

Armazenamento Externo: O estabelecimento deve possuir um abrigo de residuos (conforme norma municipal) ate a coleta especializada.

Documentacao: Manter arquivado o contrato com a empresa de coleta e os MTRs (Manifesto de Transporte de Residuos).

POP 06: ATENDIMENTO E BIOSSEGURANCA DO PACIENTE
Anamnese e Prontuario: Essencial para a VISA. Todo paciente deve ter ficha com historico de saude, alergias e termo de consentimento livre e esclarecido.

Barreiras Fisicas: Uso de campos descartaveis sobre a bancada e protetores plasticos em locais de contato manual frequente (foco, comandos da cadeira).

Abertura do Material: O kit esteril deve ser aberto somente apos o profissional estar paramentado e na presenca do paciente, verificando a viragem da cor do indicador quimico na frente do cliente.$pop$,
  true
from public.tenants t
where not exists (
  select 1
  from public.pop_documents d
  where d.tenant_id = t.id
    and d.title = 'Manual de Boas Praticas e Procedimentos Operacionais Padrao (POP)'
    and d.is_template = true
);