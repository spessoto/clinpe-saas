alter table public.tenants
  add column if not exists cpf_cnpj varchar(18);

comment on column public.tenants.cpf_cnpj is 'Documento fiscal do tenant para faturamento e assinaturas no Asaas';