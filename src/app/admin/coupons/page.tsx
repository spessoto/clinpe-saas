import { AlertCircle, CheckCircle2 } from "lucide-react";

import {
  createCouponAction,
  getAdminCouponsData,
  updateCouponAction,
} from "@/app/admin/coupons/actions";
import { formatCouponValue } from "@/lib/coupons";

export const revalidate = 60;

type SearchParams = Promise<{
  error?: string;
  success?: string;
}>;

function formatDateTimeInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  const year = parsed.getFullYear();
  const month = pad(parsed.getMonth() + 1);
  const day = pad(parsed.getDate());
  const hour = pad(parsed.getHours());
  const minute = pad(parsed.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("pt-BR");
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { coupons, redemptions } = await getAdminCouponsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de cupons</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie cupons com desconto fixo ou percentual, validade, limite total de
          uso e quantidade de ciclos com desconto.
        </p>
      </div>

      {params.error ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-900">{params.error}</p>
        </div>
      ) : null}

      {params.success ? (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-900">{params.success}</p>
        </div>
      ) : null}

      <form
        action={createCouponAction}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="text-lg font-bold text-foreground">Novo cupom</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Código</span>
            <input
              name="code"
              required
              placeholder="WELCOME50"
              className="w-full"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Tipo</span>
            <select
              name="discount_type"
              defaultValue="percentage"
              className="w-full"
            >
              <option value="percentage">Percentual</option>
              <option value="fixed">Preço fixo</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Valor do desconto
            </span>
            <input
              name="discount_value"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Ciclos com desconto
            </span>
            <input
              name="discounted_cycles"
              type="number"
              min="1"
              required
              defaultValue={1}
              className="w-full"
            />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-foreground">Descrição</span>
            <input
              name="description"
              placeholder="Campanha de lançamento"
              className="w-full"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Válido de</span>
            <input
              name="valid_from"
              type="datetime-local"
              required
              className="w-full"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Válido até</span>
            <input
              name="valid_until"
              type="datetime-local"
              required
              className="w-full"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">
              Limite total de uso
            </span>
            <input
              name="max_total_uses"
              type="number"
              min="1"
              placeholder="Opcional"
              className="w-full"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-foreground">Aplicar em</span>
            <select
              name="applies_to_period"
              defaultValue="both"
              className="w-full"
            >
              <option value="both">Mensal e anual</option>
              <option value="monthly">Somente mensal</option>
              <option value="annual">Somente anual</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input name="is_active" type="checkbox" defaultChecked />
            <span className="text-foreground">Cupom ativo</span>
          </label>
        </div>

        <button
          type="submit"
          className="btn-gradient mt-5 w-full py-2.5 md:w-auto md:px-6"
        >
          Criar cupom
        </button>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        {coupons.map((coupon) => (
          <form
            key={coupon.id}
            action={updateCouponAction}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <input type="hidden" name="coupon_id" value={coupon.id} />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {coupon.code}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {coupon.description || "Sem descrição"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  coupon.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {coupon.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Código</span>
                <input
                  name="code"
                  required
                  defaultValue={coupon.code}
                  className="w-full"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Tipo</span>
                <select
                  name="discount_type"
                  defaultValue={coupon.discount_type}
                  className="w-full"
                >
                  <option value="percentage">Percentual</option>
                  <option value="fixed">Preço fixo</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Valor</span>
                <input
                  name="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={coupon.discount_value}
                  className="w-full"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Ciclos</span>
                <input
                  name="discounted_cycles"
                  type="number"
                  min="1"
                  required
                  defaultValue={coupon.discounted_cycles}
                  className="w-full"
                />
              </label>

              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-foreground">Descrição</span>
                <input
                  name="description"
                  defaultValue={coupon.description ?? ""}
                  className="w-full"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Válido de</span>
                <input
                  name="valid_from"
                  type="datetime-local"
                  required
                  defaultValue={formatDateTimeInput(coupon.valid_from)}
                  className="w-full"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Válido até</span>
                <input
                  name="valid_until"
                  type="datetime-local"
                  required
                  defaultValue={formatDateTimeInput(coupon.valid_until)}
                  className="w-full"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Limite total</span>
                <input
                  name="max_total_uses"
                  type="number"
                  min="1"
                  defaultValue={coupon.max_total_uses ?? ""}
                  className="w-full"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-foreground">Aplicar em</span>
                <select
                  name="applies_to_period"
                  defaultValue={coupon.applies_to_period}
                  className="w-full"
                >
                  <option value="both">Mensal e anual</option>
                  <option value="monthly">Somente mensal</option>
                  <option value="annual">Somente anual</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked={coupon.is_active}
                />
                <span className="text-foreground">Cupom ativo</span>
              </label>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-foreground md:grid-cols-2 xl:grid-cols-4">
              <p>
                Valor aplicado:{" "}
                <span className="font-semibold">
                  {formatCouponValue(coupon)}
                </span>
              </p>
              <p>
                Resgates:{" "}
                <span className="font-semibold">{coupon.times_redeemed}</span>
                {coupon.max_total_uses
                  ? ` / ${coupon.max_total_uses}`
                  : " / ilimitado"}
              </p>
              <p>
                Última edição:{" "}
                <span className="font-semibold">
                  {formatDateTime(coupon.updated_at)}
                </span>
              </p>
              <p>
                Escopo:{" "}
                <span className="font-semibold">
                  {coupon.applies_to_period}
                </span>
              </p>
            </div>

            <button
              type="submit"
              className="btn-gradient mt-5 w-full py-2.5 md:w-auto md:px-6"
            >
              Salvar cupom
            </button>
          </form>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold text-foreground">Usos recentes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Cupom</th>
                <th className="py-2 pr-4 font-medium">Usuário</th>
                <th className="py-2 pr-4 font-medium">Cliente</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Ciclos restantes</th>
                <th className="py-2 pr-4 font-medium">Resgatado em</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-muted-foreground">
                    Nenhum uso registrado até o momento.
                  </td>
                </tr>
              ) : (
                redemptions.map((redemption) => (
                  <tr
                    key={redemption.id}
                    className="border-b border-border/70 align-top"
                  >
                    <td className="py-3 pr-4 font-semibold text-foreground">
                      {redemption.coupon?.code ?? "-"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {redemption.user?.full_name ??
                          redemption.redeemed_by_email}
                      </p>
                      <p>{redemption.redeemed_by_email}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {redemption.tenant?.name ?? "-"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {redemption.status}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {redemption.discounted_cycles_remaining} /{" "}
                      {redemption.discounted_cycles_total}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDateTime(redemption.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
