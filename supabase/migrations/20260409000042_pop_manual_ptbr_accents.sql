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
        E'POP - LIMPEZA DE INSTRUMENTAIS\n\nResponsável: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Separar instrumentais utilizados em área de descontaminação.\n2. Lavar com água corrente e detergente enzimático.\n3. Escovar articulações e superfícies críticas.\n4. Secar completamente antes da esterilização.\n5. Registrar lote, data e responsável no controle interno.'
      ),
      (
        'POP - Esterilização',
        E'POP - ESTERILIZAÇÃO\n\nResponsável: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Conferir limpeza prévia do material.\n2. Embalar e identificar o instrumental.\n3. Inserir em autoclave conforme carga recomendada.\n4. Validar indicadores químicos e biológicos.\n5. Armazenar em local limpo, seco e identificado.'
      ),
      (
        'POP - Atendimento Inicial',
        E'POP - ATENDIMENTO INICIAL\n\nResponsável: {{NOME_PROFISSIONAL}}\nRegistro: {{REGISTRO}}\n\n1. Confirmar identificação do paciente.\n2. Realizar anamnese e avaliação clínica inicial.\n3. Higienizar área e instrumentais antes do procedimento.\n4. Registrar condutas e orientações no prontuário.\n5. Agendar retorno quando necessário.'
      ),
      (
        'Manual de Boas Práticas e Procedimentos Operacionais Padrão (POP)',
        $pop$MANUAL DE BOAS PRÁTICAS E PROCEDIMENTOS OPERACIONAIS PADRÃO (POP)

1. IDENTIFICAÇÃO DO ESTABELECIMENTO
Estabelecimento: {{ESTABELECIMENTO}}
Responsável técnico: {{NOME_PROFISSIONAL}}
Registro profissional ou CPF/CNPJ para faturamento: {{REGISTRO_OU_CPF}}

2. BASE LEGAL
RDC 15/2012 (CME), RDC 222/2018 (Resíduos) e RDC 63/2011 (Boas Práticas de Serviços de Saúde).

3. OBJETIVO E ESCOPO
Estabelecer critérios rigorosos de biossegurança para eliminar ou minimizar riscos biológicos, químicos e físicos, assegurando a integridade do paciente, do profissional e do meio ambiente, em conformidade com as normas da ANVISA e das Secretarias Estaduais e Municipais de Saúde.

4. POP 01: HIGIENE DAS MÃOS E ANTISSEPSIA
Fundamentação: Protocolo da OMS e RDC 42/2010.
Infraestrutura exigida: lavatório exclusivo para mãos (separado da pia de expurgo), com sabonete líquido, papel toalha não reciclado e lixeira de pedal.
Procedimento adicional: além da lavagem com água e sabão, incluir fricção antisséptica com álcool em gel 70% entre procedimentos quando não houver sujidade visível.
Proibição crítica: é proibido usar adornos (anéis, pulseiras e relógios) durante o atendimento (NR-32). Unhas devem ser mantidas curtas e sem esmalte (ou com esmalte íntegro, sem descamações).

5. POP 02: EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)
Fundamentação: NR-6 e NR-32.
Máscara: trocar a cada 2 horas ou sempre que estiver úmida/suja.
Jaleco/Avental: uso restrito ao ambiente de trabalho. É proibido circular em áreas comuns ou via pública com EPI. Gramatura mínima recomendada para descartáveis: 30 g/m².
Luvas: proibido reaproveitar ou lavar. Trocar entre cada paciente ou em caso de ruptura.
Óculos de proteção: devem possuir proteção lateral e ser desinfetados com álcool 70% após cada uso.

6. POP 03: GERENCIAMENTO DA CENTRAL DE MATERIAL E ESTERILIZAÇÃO (CME)
Fluxo obrigatório: unidirecional, da área suja para a área limpa.
Fase 1 - Limpeza e descontaminação (área suja):
- Detergente multienzimático com no mínimo 4 enzimas, seguindo rigorosamente a diluição do fabricante (usar copo medidor).
- Tempo de imersão monitorado por cronômetro.
- Limpeza mecânica priorizando lavadora ultrassônica para remover biofilme de articulações de alicates e ranhuras de brocas.
Fase 2 - Preparo e acondicionamento (área limpa):
- Inspeção obrigatória com lupa de bancada para verificar resíduos.
- Embalagem em papel grau cirúrgico com fita indicadora.
- Proibido uso de estufas. Somente autoclave.
Fase 3 - Esterilização e controle de qualidade:
- Monitoramento físico: impressão da autoclave ou registro manual de tempo/temperatura/pressão.
- Monitoramento químico: anexar indicador classe 5 ou 6 de cada ciclo no livro.
- Monitoramento biológico: frequência mínima semanal, com registro do resultado (negativo/positivo) e lote da ampola.
- Manutenção: laudo anual de calibração da autoclave e da seladora.

7. POP 04: HIGIENE AMBIENTAL E DO MOBILIÁRIO
Fundamentação: RDC 63/2011.
Classificação de área: a sala de atendimento é área semicrítica.
Desinfetantes de nível intermediário para superfícies: álcool 70%, quaternário de amônio de 5ª geração ou hipoclorito de sódio a 1%.
Técnica de limpeza: do mais limpo para o mais sujo e de cima para baixo. Nunca varrer a seco (usar mop ou pano úmido).
Registro: manter planilha de limpeza terminal assinada pelo executor.

8. POP 05: GERENCIAMENTO DE RESÍDUOS (PGRSS)
Fundamentação: RDC 222/2018.
Segregação na fonte:
- Grupo A (infectante): saco branco leitoso com símbolo de risco biológico, limitado a 2/3 da capacidade.
- Grupo E (perfurocortante): caixa rígida tipo Descarpack em suporte de parede, nunca no chão. Descartar ao atingir a linha tracejada.
Armazenamento externo: manter abrigo de resíduos conforme norma municipal até a coleta especializada.
Documentação: manter contrato com empresa coletora e MTRs (Manifesto de Transporte de Resíduos).

9. POP 06: ATENDIMENTO E BIOSSEGURANÇA DO PACIENTE
Anamnese e prontuário: todo paciente deve ter ficha com histórico de saúde, alergias e termo de consentimento livre e esclarecido.
Barreiras físicas: uso de campos descartáveis sobre a bancada e protetores plásticos em pontos de contato manual frequente (foco e comandos da cadeira).
Abertura do material: o kit estéril deve ser aberto somente após o profissional estar paramentado e na presença do paciente, com verificação da viragem de cor do indicador químico.$pop$
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
set title = 'Manual de Boas Práticas e Procedimentos Operacionais Padrão (POP)',
    content = $pop$MANUAL DE BOAS PRÁTICAS E PROCEDIMENTOS OPERACIONAIS PADRÃO (POP)

1. IDENTIFICAÇÃO DO ESTABELECIMENTO
Estabelecimento: {{ESTABELECIMENTO}}
Responsável técnico: {{NOME_PROFISSIONAL}}
Registro profissional ou CPF/CNPJ para faturamento: {{REGISTRO_OU_CPF}}

2. BASE LEGAL
RDC 15/2012 (CME), RDC 222/2018 (Resíduos) e RDC 63/2011 (Boas Práticas de Serviços de Saúde).

3. OBJETIVO E ESCOPO
Estabelecer critérios rigorosos de biossegurança para eliminar ou minimizar riscos biológicos, químicos e físicos, assegurando a integridade do paciente, do profissional e do meio ambiente, em conformidade com as normas da ANVISA e das Secretarias Estaduais e Municipais de Saúde.

4. POP 01: HIGIENE DAS MÃOS E ANTISSEPSIA
Fundamentação: Protocolo da OMS e RDC 42/2010.
Infraestrutura exigida: lavatório exclusivo para mãos (separado da pia de expurgo), com sabonete líquido, papel toalha não reciclado e lixeira de pedal.
Procedimento adicional: além da lavagem com água e sabão, incluir fricção antisséptica com álcool em gel 70% entre procedimentos quando não houver sujidade visível.
Proibição crítica: é proibido usar adornos (anéis, pulseiras e relógios) durante o atendimento (NR-32). Unhas devem ser mantidas curtas e sem esmalte (ou com esmalte íntegro, sem descamações).

5. POP 02: EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)
Fundamentação: NR-6 e NR-32.
Máscara: trocar a cada 2 horas ou sempre que estiver úmida/suja.
Jaleco/Avental: uso restrito ao ambiente de trabalho. É proibido circular em áreas comuns ou via pública com EPI. Gramatura mínima recomendada para descartáveis: 30 g/m².
Luvas: proibido reaproveitar ou lavar. Trocar entre cada paciente ou em caso de ruptura.
Óculos de proteção: devem possuir proteção lateral e ser desinfetados com álcool 70% após cada uso.

6. POP 03: GERENCIAMENTO DA CENTRAL DE MATERIAL E ESTERILIZAÇÃO (CME)
Fluxo obrigatório: unidirecional, da área suja para a área limpa.
Fase 1 - Limpeza e descontaminação (área suja):
- Detergente multienzimático com no mínimo 4 enzimas, seguindo rigorosamente a diluição do fabricante (usar copo medidor).
- Tempo de imersão monitorado por cronômetro.
- Limpeza mecânica priorizando lavadora ultrassônica para remover biofilme de articulações de alicates e ranhuras de brocas.
Fase 2 - Preparo e acondicionamento (área limpa):
- Inspeção obrigatória com lupa de bancada para verificar resíduos.
- Embalagem em papel grau cirúrgico com fita indicadora.
- Proibido uso de estufas. Somente autoclave.
Fase 3 - Esterilização e controle de qualidade:
- Monitoramento físico: impressão da autoclave ou registro manual de tempo/temperatura/pressão.
- Monitoramento químico: anexar indicador classe 5 ou 6 de cada ciclo no livro.
- Monitoramento biológico: frequência mínima semanal, com registro do resultado (negativo/positivo) e lote da ampola.
- Manutenção: laudo anual de calibração da autoclave e da seladora.

7. POP 04: HIGIENE AMBIENTAL E DO MOBILIÁRIO
Fundamentação: RDC 63/2011.
Classificação de área: a sala de atendimento é área semicrítica.
Desinfetantes de nível intermediário para superfícies: álcool 70%, quaternário de amônio de 5ª geração ou hipoclorito de sódio a 1%.
Técnica de limpeza: do mais limpo para o mais sujo e de cima para baixo. Nunca varrer a seco (usar mop ou pano úmido).
Registro: manter planilha de limpeza terminal assinada pelo executor.

8. POP 05: GERENCIAMENTO DE RESÍDUOS (PGRSS)
Fundamentação: RDC 222/2018.
Segregação na fonte:
- Grupo A (infectante): saco branco leitoso com símbolo de risco biológico, limitado a 2/3 da capacidade.
- Grupo E (perfurocortante): caixa rígida tipo Descarpack em suporte de parede, nunca no chão. Descartar ao atingir a linha tracejada.
Armazenamento externo: manter abrigo de resíduos conforme norma municipal até a coleta especializada.
Documentação: manter contrato com empresa coletora e MTRs (Manifesto de Transporte de Resíduos).

9. POP 06: ATENDIMENTO E BIOSSEGURANÇA DO PACIENTE
Anamnese e prontuário: todo paciente deve ter ficha com histórico de saúde, alergias e termo de consentimento livre e esclarecido.
Barreiras físicas: uso de campos descartáveis sobre a bancada e protetores plásticos em pontos de contato manual frequente (foco e comandos da cadeira).
Abertura do material: o kit estéril deve ser aberto somente após o profissional estar paramentado e na presença do paciente, com verificação da viragem de cor do indicador químico.$pop$
where title in (
  'Manual de Boas Praticas e Procedimentos Operacionais Padrao (POP)',
  'Manual de Boas Práticas e Procedimentos Operacionais Padrão (POP)'
);
