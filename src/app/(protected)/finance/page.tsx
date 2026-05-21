import {
  createFinancialTransactionAction,
  createRecurringFinancialTransactionAction,
  importFinancialCsvAction,
  toggleRecurringFinancialTransactionAction,
} from "@/app/(protected)/finance/actions";
import { requireOwnerPlanCapability } from "@/lib/auth";
import { FINANCIAL_CATEGORIES } from "@/lib/finance-categories";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function monthDateBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateInput(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function resolveRange(params: Record<string, string | string[] | undefined>) {
  const range = typeof params.range === "string" ? params.range : "month";
  const now = new Date();

  if (range === "last-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      range,
      start: toDateInput(start),
      end: toDateInput(end),
      label: "Último mês",
    };
  }

  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return {
      range,
      start: toDateInput(start),
      end: toDateInput(end),
      label: "Ano atual",
    };
  }

  if (range === "custom") {
    const from = typeof params.from === "string" ? params.from : null;
    const to = typeof params.to === "string" ? params.to : null;
    const startDate = parseDateInput(from);
    const endDate = parseDateInput(to);
    if (startDate && endDate && startDate < endDate) {
      return {
        range,
        start: toDateInput(startDate),
        end: toDateInput(endDate),
        label: `${startDate.toLocaleDateString("pt-BR")} a ${endDate.toLocaleDateString("pt-BR")}`,
      };
    }
  }

  const { start, end } = monthDateBounds();
  return {
    range: "month",
    start,
    end,
    label: "Mês atual",
  };
}

function periodDiffLabel(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return "Sem variação";
    return "Novo movimento no período";
  }

  const diff = ((current - previous) / Math.abs(previous)) * 100;
  const prefix = diff >= 0 ? "+" : "";
  return `${prefix}${diff.toFixed(1)}% vs. período anterior`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function FinancePage({ searchParams }: Props) {
  const { appUser } = await requireOwnerPlanCapability(
    "finance",
    "O módulo Financeiro está disponível apenas nos planos Pro e Clínica.",
  );
  const supabase = await createClient();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const success = typeof params.success === "string" ? params.success : null;

  const { start, end, range, label } = resolveRange(params);
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const periodMs = Math.max(
    24 * 60 * 60 * 1000,
    endDate.getTime() - startDate.getTime(),
  );
  const previousStart = toDateInput(new Date(startDate.getTime() - periodMs));
  const previousEnd = start;

  const [
    transactionsResult,
    currentPeriodResult,
    previousPeriodResult,
    recurringResult,
    importBatchesResult,
  ] = await Promise.all([
      supabase
        .from("financial_transactions")
        .select(
          "id, type, amount, category, description, payment_method, occurred_on, created_at",
        )
        .eq("tenant_id", appUser.tenant_id)
        .gte("occurred_on", start)
        .lt("occurred_on", end)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("financial_transactions")
        .select("type, amount, category")
        .eq("tenant_id", appUser.tenant_id)
        .gte("occurred_on", start)
        .lt("occurred_on", end),
      supabase
        .from("financial_transactions")
        .select("type, amount")
        .eq("tenant_id", appUser.tenant_id)
        .gte("occurred_on", previousStart)
        .lt("occurred_on", previousEnd),
      supabase
        .from("recurring_financial_transactions")
        .select(
          "id, type, amount, category, frequency, next_occurrence_on, active",
        )
        .eq("tenant_id", appUser.tenant_id)
        .order("next_occurrence_on", { ascending: true })
        .limit(20),
      supabase
        .from("financial_import_batches")
        .select("id, source, status, imported_rows, failed_rows, created_at")
        .eq("tenant_id", appUser.tenant_id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const transactions = transactionsResult.data ?? [];
  const recurringTransactions = recurringResult.data ?? [];
  const importBatches = importBatchesResult.data ?? [];

  const totals = (currentPeriodResult.data ?? []).reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount ?? 0);
      if (transaction.type === "income") {
        acc.income += amount;
      }
      if (transaction.type === "expense") {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const previousTotals = (previousPeriodResult.data ?? []).reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount ?? 0);
      if (transaction.type === "income") {
        acc.income += amount;
      }
      if (transaction.type === "expense") {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const balance = totals.income - totals.expense;
  const previousBalance = previousTotals.income - previousTotals.expense;

  const categoryExpenses = (currentPeriodResult.data ?? [])
    .filter((transaction) => transaction.type === "expense")
    .reduce<Record<string, number>>((acc, transaction) => {
      const key = transaction.category?.trim() || "Sem categoria";
      acc[key] = (acc[key] ?? 0) + Number(transaction.amount ?? 0);
      return acc;
    }, {});

  const topCategories = Object.entries(categoryExpenses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const exportParams = new URLSearchParams({ from: start, to: end });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Financeiro</h2>
        <p className="mt-1 text-muted">
          Registre entradas e saídas para acompanhar o resultado operacional da
          clínica em tempo real.
        </p>
      </div>

      <article className="surface-card p-5">
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-foreground">Período</span>
            <select
              name="range"
              defaultValue={range}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            >
              <option value="month">Mês atual</option>
              <option value="last-month">Último mês</option>
              <option value="year">Ano atual</option>
              <option value="custom">Intervalo personalizado</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-foreground">Data inicial</span>
            <input
              type="date"
              name="from"
              defaultValue={start}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-foreground">Data final</span>
            <input
              type="date"
              name="to"
              defaultValue={end}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-gradient w-full md:w-auto">
              Aplicar
            </button>
            <a
              href={`/api/finance/export?${exportParams.toString()}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-slate-50"
            >
              Exportar CSV
            </a>
          </div>
        </form>
        <p className="mt-3 text-sm text-muted">Período selecionado: {label}</p>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="soft-panel p-5">
          <p className="text-sm text-muted">Entradas</p>
          <p className="mt-3 inline-flex rounded-md bg-success/10 px-3 py-1 text-2xl font-bold text-success">
            {formatCurrency(totals.income)}
          </p>
          <p className="mt-2 text-xs text-muted">
            {periodDiffLabel(totals.income, previousTotals.income)}
          </p>
        </article>
        <article className="soft-panel p-5">
          <p className="text-sm text-muted">Saídas</p>
          <p className="mt-3 inline-flex rounded-md bg-destructive/10 px-3 py-1 text-2xl font-bold text-destructive">
            {formatCurrency(totals.expense)}
          </p>
          <p className="mt-2 text-xs text-muted">
            {periodDiffLabel(totals.expense, previousTotals.expense)}
          </p>
        </article>
        <article className="soft-panel p-5">
          <p className="text-sm text-muted">Saldo</p>
          <p
            className={`mt-3 inline-flex rounded-md px-3 py-1 text-2xl font-bold ${
              balance >= 0
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {formatCurrency(balance)}
          </p>
          <p className="mt-2 text-xs text-muted">
            {periodDiffLabel(balance, previousBalance)}
          </p>
        </article>
      </div>

      {topCategories.length > 0 ? (
        <article className="surface-card p-5">
          <h3 className="text-lg font-semibold text-secondary">
            Principais categorias de despesa
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {topCategories.map(([category, amount]) => (
              <div
                key={category}
                className="rounded-lg border border-slate-100 bg-white px-4 py-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  {category}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatCurrency(amount)}
                </p>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <article className="surface-card p-6">
        <h3 className="text-lg font-semibold text-secondary">Nova transação</h3>

        {success ? (
          <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form
          action={createFinancialTransactionAction}
          className="mt-4 grid gap-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Tipo</span>
              <select
                name="type"
                required
                defaultValue="income"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              >
                <option value="income">Entrada</option>
                <option value="expense">Saída</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Valor (R$)</span>
              <input
                name="amount"
                required
                placeholder="0,00"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Categoria</span>
              <select
                name="category"
                required
                defaultValue="Procedimentos"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              >
                {FINANCIAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">
                Forma de pagamento
              </span>
              <input
                name="payment_method"
                placeholder="Ex.: PIX, Cartão, Dinheiro"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Data</span>
              <input
                type="date"
                name="occurred_on"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-foreground">Descrição</span>
            <textarea
              name="description"
              rows={3}
              placeholder="Detalhes da transação"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
            />
          </label>

          <div>
            <button type="submit" className="btn-gradient">
              Salvar transação
            </button>
          </div>
        </form>
      </article>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">
            Lançamento recorrente
          </h3>
          <p className="mt-1 text-sm text-muted">
            Cadastre receitas e despesas recorrentes para controle contínuo.
          </p>

          <form
            action={createRecurringFinancialTransactionAction}
            className="mt-4 grid gap-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">Tipo</span>
                <select
                  name="type"
                  defaultValue="expense"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                >
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">Valor</span>
                <input
                  name="amount"
                  placeholder="0,00"
                  required
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">Categoria</span>
                <select
                  name="category"
                  defaultValue="Serviços"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                >
                  {FINANCIAL_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">Frequência</span>
                <select
                  name="frequency"
                  defaultValue="monthly"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                >
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">Próxima data</span>
                <input
                  type="date"
                  name="next_occurrence_on"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-foreground">Pagamento</span>
                <input
                  name="payment_method"
                  placeholder="PIX, Cartão, Boleto..."
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Descrição</span>
              <input
                name="description"
                placeholder="Ex.: Aluguel da clínica"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
            </label>

            <div>
              <button type="submit" className="btn-gradient">
                Salvar recorrência
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-2">
            {recurringTransactions.length === 0 ? (
              <p className="text-sm text-muted">Nenhum lançamento recorrente cadastrado.</p>
            ) : (
              recurringTransactions.map((recurring) => (
                <div
                  key={recurring.id}
                  className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {recurring.category} · {formatCurrency(Number(recurring.amount ?? 0))}
                      </p>
                      <p className="text-xs text-muted">
                        {recurring.type === "income" ? "Entrada" : "Saída"} · {recurring.frequency === "monthly" ? "Mensal" : "Semanal"} · próxima em {new Date(`${recurring.next_occurrence_on}T00:00:00`).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <form action={toggleRecurringFinancialTransactionAction}>
                      <input type="hidden" name="id" value={recurring.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={recurring.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-foreground hover:bg-slate-50"
                      >
                        {recurring.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="surface-card p-6">
          <h3 className="text-lg font-semibold text-secondary">Importar CSV</h3>
          <p className="mt-1 text-sm text-muted">
            Formato esperado: Data, Tipo, Categoria, Descrição, Pagamento, Valor.
          </p>

          <form action={importFinancialCsvAction} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-foreground">Arquivo CSV</span>
              <input
                type="file"
                name="csv_file"
                required
                accept=".csv,text/csv"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
              />
            </label>
            <div>
              <button type="submit" className="btn-gradient">
                Importar lançamentos
              </button>
            </div>
          </form>

          <div className="mt-5 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Últimos lotes</h4>
            {importBatches.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma importação registrada.</p>
            ) : (
              importBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(batch.created_at).toLocaleDateString("pt-BR")} · {batch.imported_rows} importadas / {batch.failed_rows} falhas
                  </p>
                  <p className="text-xs text-muted">
                    Fonte: {batch.source.toUpperCase()} · Status: {batch.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <article className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-secondary">
            Transações do período
          </h3>
        </div>

        <div className="space-y-3 p-4 sm:hidden">
          {transactions.length === 0 ? (
            <p className="rounded-lg border border-slate-100 bg-white px-4 py-6 text-sm text-muted">
              Nenhuma transação registrada ainda.
            </p>
          ) : (
            transactions.map((transaction) => (
              <article
                key={transaction.id}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted">
                    {new Date(
                      `${transaction.occurred_on}T00:00:00`,
                    ).toLocaleDateString("pt-BR")}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      transaction.type === "income"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {transaction.type === "income" ? "Entrada" : "Saída"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {transaction.category ?? "Sem categoria"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {transaction.description ?? "-"}
                </p>
                <p className="mt-2 text-base font-bold text-foreground">
                  {formatCurrency(Number(transaction.amount ?? 0))}
                </p>
              </article>
            ))
          )}
        </div>

        <table className="hidden w-full text-left text-sm sm:table">
          <thead className="bg-secondary/10 text-secondary">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-muted">
                  {new Date(
                    `${transaction.occurred_on}T00:00:00`,
                  ).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      transaction.type === "income"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {transaction.type === "income" ? "Entrada" : "Saída"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">
                  {transaction.category ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {transaction.description ?? "-"}
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">
                  {formatCurrency(Number(transaction.amount ?? 0))}
                </td>
              </tr>
            ))}

            {transactions.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  Nenhuma transação registrada ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </article>
    </section>
  );
}
