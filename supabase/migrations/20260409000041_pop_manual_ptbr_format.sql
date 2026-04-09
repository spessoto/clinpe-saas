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

1. IDENTIFICACAO DO ESTABELECIMENTO
Estabelecimento: {{ESTABELECIMENTO}}
Responsavel tecnico: {{NOME_PROFISSIONAL}}
Registro profissional ou CPF/CNPJ para faturamento: {{REGISTRO_OU_CPF}}

2. BASE LEGAL
RDC 15/2012 (CME), RDC 222/2018 (Residuos) e RDC 63/2011 (Boas Praticas de Servicos de Saude).

3. OBJETIVO E ESCOPO
Estabelecer criterios rigorosos de biosseguranca para eliminar ou minimizar riscos biologicos, quimicos e fisicos, assegurando a integridade do paciente, do profissional e do meio ambiente, em conformidade com as normas da ANVISA e das Secretarias Estaduais e Municipais de Saude.

4. POP 01: HIGIENE DAS MAOS E ANTISSEPSIA
Fundamentacao: Protocolo da OMS e RDC 42/2010.
Infraestrutura exigida: lavatorio exclusivo para maos (separado da pia de expurgo), com sabonete liquido, papel toalha nao reciclado e lixeira de pedal.
Procedimento adicional: alem da lavagem com agua e sabao, incluir friccao antisseptica com alcool em gel 70% entre procedimentos quando nao houver sujidade visivel.
Proibicao critica: e proibido usar adornos (aneis, pulseiras e relogios) durante o atendimento (NR-32). Unhas devem ser mantidas curtas e sem esmalte (ou com esmalte integro, sem descamacoes).

5. POP 02: EQUIPAMENTOS DE PROTECAO INDIVIDUAL (EPI)
Fundamentacao: NR-6 e NR-32.
Mascara: trocar a cada 2 horas ou sempre que estiver umida/suja.
Jaleco/Avental: uso restrito ao ambiente de trabalho. E proibido circular em areas comuns ou via publica com EPI. Gramatura minima recomendada para descartaveis: 30 g/m2.
Luvas: proibido reaproveitar ou lavar. Trocar entre cada paciente ou em caso de ruptura.
Oculos de protecao: devem possuir protecao lateral e ser desinfetados com alcool 70% apos cada uso.

6. POP 03: GERENCIAMENTO DA CENTRAL DE MATERIAL E ESTERILIZACAO (CME)
Fluxo obrigatorio: unidirecional, da area suja para a area limpa.
Fase 1 - Limpeza e descontaminacao (area suja):
- Detergente multienzimatico com no minimo 4 enzimas, seguindo rigorosamente a diluicao do fabricante (usar copo medidor).
- Tempo de imersao monitorado por cronometro.
- Limpeza mecanica priorizando lavadora ultrassonica para remover biofilme de articulacoes de alicates e ranhuras de brocas.
Fase 2 - Preparo e acondicionamento (area limpa):
- Inspecao obrigatoria com lupa de bancada para verificar residuos.
- Embalagem em papel grau cirurgico com fita indicadora.
- Proibido uso de estufas. Somente autoclave.
Fase 3 - Esterilizacao e controle de qualidade:
- Monitoramento fisico: impressao da autoclave ou registro manual de tempo/temperatura/pressao.
- Monitoramento quimico: anexar indicador classe 5 ou 6 de cada ciclo no livro.
- Monitoramento biologico: frequencia minima semanal, com registro do resultado (negativo/positivo) e lote da ampola.
- Manutencao: laudo anual de calibracao da autoclave e da seladora.

7. POP 04: HIGIENE AMBIENTAL E DO MOBILIARIO
Fundamentacao: RDC 63/2011.
Classificacao de area: a sala de atendimento e area semicritica.
Desinfetantes de nivel intermediario para superficies: alcool 70%, quaternario de amonio de 5a geracao ou hipoclorito de sodio a 1%.
Tecnica de limpeza: do mais limpo para o mais sujo e de cima para baixo. Nunca varrer a seco (usar mop ou pano umido).
Registro: manter planilha de limpeza terminal assinada pelo executor.

8. POP 05: GERENCIAMENTO DE RESIDUOS (PGRSS)
Fundamentacao: RDC 222/2018.
Segregacao na fonte:
- Grupo A (infectante): saco branco leitoso com simbolo de risco biologico, limitado a 2/3 da capacidade.
- Grupo E (perfurocortante): caixa rigida tipo Descarpack em suporte de parede, nunca no chao. Descartar ao atingir a linha tracejada.
Armazenamento externo: manter abrigo de residuos conforme norma municipal ate a coleta especializada.
Documentacao: manter contrato com empresa coletora e MTRs (Manifesto de Transporte de Residuos).

9. POP 06: ATENDIMENTO E BIOSSEGURANCA DO PACIENTE
Anamnese e prontuario: todo paciente deve ter ficha com historico de saude, alergias e termo de consentimento livre e esclarecido.
Barreiras fisicas: uso de campos descartaveis sobre a bancada e protetores plasticos em pontos de contato manual frequente (foco e comandos da cadeira).
Abertura do material: o kit esteril deve ser aberto somente apos o profissional estar paramentado e na presenca do paciente, com verificacao da viragem de cor do indicador quimico.$pop$
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

update public.pop_documents
set content = $pop$MANUAL DE BOAS PRATICAS E PROCEDIMENTOS OPERACIONAIS PADRAO (POP)

1. IDENTIFICACAO DO ESTABELECIMENTO
Estabelecimento: {{ESTABELECIMENTO}}
Responsavel tecnico: {{NOME_PROFISSIONAL}}
Registro profissional ou CPF/CNPJ para faturamento: {{REGISTRO_OU_CPF}}

2. BASE LEGAL
RDC 15/2012 (CME), RDC 222/2018 (Residuos) e RDC 63/2011 (Boas Praticas de Servicos de Saude).

3. OBJETIVO E ESCOPO
Estabelecer criterios rigorosos de biosseguranca para eliminar ou minimizar riscos biologicos, quimicos e fisicos, assegurando a integridade do paciente, do profissional e do meio ambiente, em conformidade com as normas da ANVISA e das Secretarias Estaduais e Municipais de Saude.

4. POP 01: HIGIENE DAS MAOS E ANTISSEPSIA
Fundamentacao: Protocolo da OMS e RDC 42/2010.
Infraestrutura exigida: lavatorio exclusivo para maos (separado da pia de expurgo), com sabonete liquido, papel toalha nao reciclado e lixeira de pedal.
Procedimento adicional: alem da lavagem com agua e sabao, incluir friccao antisseptica com alcool em gel 70% entre procedimentos quando nao houver sujidade visivel.
Proibicao critica: e proibido usar adornos (aneis, pulseiras e relogios) durante o atendimento (NR-32). Unhas devem ser mantidas curtas e sem esmalte (ou com esmalte integro, sem descamacoes).

5. POP 02: EQUIPAMENTOS DE PROTECAO INDIVIDUAL (EPI)
Fundamentacao: NR-6 e NR-32.
Mascara: trocar a cada 2 horas ou sempre que estiver umida/suja.
Jaleco/Avental: uso restrito ao ambiente de trabalho. E proibido circular em areas comuns ou via publica com EPI. Gramatura minima recomendada para descartaveis: 30 g/m2.
Luvas: proibido reaproveitar ou lavar. Trocar entre cada paciente ou em caso de ruptura.
Oculos de protecao: devem possuir protecao lateral e ser desinfetados com alcool 70% apos cada uso.

6. POP 03: GERENCIAMENTO DA CENTRAL DE MATERIAL E ESTERILIZACAO (CME)
Fluxo obrigatorio: unidirecional, da area suja para a area limpa.
Fase 1 - Limpeza e descontaminacao (area suja):
- Detergente multienzimatico com no minimo 4 enzimas, seguindo rigorosamente a diluicao do fabricante (usar copo medidor).
- Tempo de imersao monitorado por cronometro.
- Limpeza mecanica priorizando lavadora ultrassonica para remover biofilme de articulacoes de alicates e ranhuras de brocas.
Fase 2 - Preparo e acondicionamento (area limpa):
- Inspecao obrigatoria com lupa de bancada para verificar residuos.
- Embalagem em papel grau cirurgico com fita indicadora.
- Proibido uso de estufas. Somente autoclave.
Fase 3 - Esterilizacao e controle de qualidade:
- Monitoramento fisico: impressao da autoclave ou registro manual de tempo/temperatura/pressao.
- Monitoramento quimico: anexar indicador classe 5 ou 6 de cada ciclo no livro.
- Monitoramento biologico: frequencia minima semanal, com registro do resultado (negativo/positivo) e lote da ampola.
- Manutencao: laudo anual de calibracao da autoclave e da seladora.

7. POP 04: HIGIENE AMBIENTAL E DO MOBILIARIO
Fundamentacao: RDC 63/2011.
Classificacao de area: a sala de atendimento e area semicritica.
Desinfetantes de nivel intermediario para superficies: alcool 70%, quaternario de amonio de 5a geracao ou hipoclorito de sodio a 1%.
Tecnica de limpeza: do mais limpo para o mais sujo e de cima para baixo. Nunca varrer a seco (usar mop ou pano umido).
Registro: manter planilha de limpeza terminal assinada pelo executor.

8. POP 05: GERENCIAMENTO DE RESIDUOS (PGRSS)
Fundamentacao: RDC 222/2018.
Segregacao na fonte:
- Grupo A (infectante): saco branco leitoso com simbolo de risco biologico, limitado a 2/3 da capacidade.
- Grupo E (perfurocortante): caixa rigida tipo Descarpack em suporte de parede, nunca no chao. Descartar ao atingir a linha tracejada.
Armazenamento externo: manter abrigo de residuos conforme norma municipal ate a coleta especializada.
Documentacao: manter contrato com empresa coletora e MTRs (Manifesto de Transporte de Residuos).

9. POP 06: ATENDIMENTO E BIOSSEGURANCA DO PACIENTE
Anamnese e prontuario: todo paciente deve ter ficha com historico de saude, alergias e termo de consentimento livre e esclarecido.
Barreiras fisicas: uso de campos descartaveis sobre a bancada e protetores plasticos em pontos de contato manual frequente (foco e comandos da cadeira).
Abertura do material: o kit esteril deve ser aberto somente apos o profissional estar paramentado e na presenca do paciente, com verificacao da viragem de cor do indicador quimico.$pop$
where title = 'Manual de Boas Praticas e Procedimentos Operacionais Padrao (POP)';
