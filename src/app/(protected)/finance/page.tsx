import { createFinancialTransactionAction } from "@/app/(protected)/finance/actions";
import { requireActiveTenant } from "@/lib/auth";
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function FinancePage({ searchParams }: Props) {
  const { appUser } = await requireActiveTenant();
  const supabase = await createClient();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const success = typeof params.success === "string" ? params.success : null;

  const { start, end } = monthDateBounds();

  const [transactionsResult, monthlyResult] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select(
        "id, type, amount, category, description, payment_method, occurred_on, created_at",
      )
      .eq("tenant_id", appUser.tenant_id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("financial_transactions")
      .select("type, amount")
      .eq("tenant_id", appUser.tenant_id)
      .gte("occurred_on", start)
      .lt("occurred_on", end),
  ]);

  const transactions = transactionsResult.data ?? [];

  const totals = (monthlyResult.data ?? []).reduce(
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

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Financeiro</h2>
        <p className="mt-1 text-muted">
          Registre entradas e saídas para acompanhar o saldo operacional da
          clínica.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="soft-panel p-5">
          <p className="text-sm text-muted">Entradas do mês</p>
          <p className="mt-3 inline-flex rounded-md bg-success/10 px-3 py-1 text-2xl font-bold text-success">
            {formatCurrency(totals.income)}
          </p>
        </article>
        <article className="soft-panel p-5">
          <p className="text-sm text-muted">Saídas do mês</p>
          <p className="mt-3 inline-flex rounded-md bg-destructive/10 px-3 py-1 text-2xl font-bold text-destructive">
            {formatCurrency(totals.expense)}
          </p>
        </article>
        <article className="soft-panel p-5">
          <p className="text-sm text-muted">Saldo do mês</p>
          <p
            className={`mt-3 inline-flex rounded-md px-3 py-1 text-2xl font-bold ${
              balance >= 0
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {formatCurrency(balance)}
          </p>
        </article>
      </div>

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
              <input
                name="category"
                placeholder="Ex.: Procedimento, aluguel, material"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
              />
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

      <article className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-secondary">
            Últimas transações
          </h3>
        </div>

        <table className="w-full text-left text-sm">
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
