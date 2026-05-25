"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MonthlyDataPoint = {
  month: string;
  signups: number;
  appointments: number;
  completed: number;
  canceled: number;
  revenue: number;
  trialsStarted: number;
  subscriptions: number;
  churn: number;
};

export type PlanDistribution = {
  name: string;
  value: number;
  color: string;
};

export type PeriodDistribution = {
  name: string;
  value: number;
  color: string;
};

export type SummaryCards = {
  currentRevenue: number;
  mrr: number;
  totalTenants: number;
  activeTenants: number;
  paidTenants: number;
  conversionRate: number;
  currentMonthAppointments: number;
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLOR_PRIMARY = "#0D9488";
const COLOR_SECONDARY = "#1E3A8A";
const COLOR_SUCCESS = "#10B981";
const COLOR_WARNING = "#F97316";
const COLOR_DESTRUCTIVE = "#E11D48";
const COLOR_MUTED = "#94A3B8";
const GRID_COLOR = "#E2E8F0";
const TICK_COLOR = "#64748B";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatBRLShort(value: number) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDecimal(value: number) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Shared chart config ─────────────────────────────────────────────────────

const AXIS_PROPS = {
  tick: { fill: TICK_COLOR, fontSize: 11 },
  axisLine: false,
  tickLine: false,
};

const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: "12px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    fontSize: "13px",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone: string;
}) {
  return (
    <article className="soft-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-3 inline-flex rounded-md px-3 py-1 text-2xl font-bold ${tone}`}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </article>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="soft-panel p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// Custom label for pie charts
type PieLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
};

function PieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: PieLabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsCharts({
  monthlyData,
  planDistribution,
  periodDistribution,
  summaryCards,
}: {
  monthlyData: MonthlyDataPoint[];
  planDistribution: PlanDistribution[];
  periodDistribution: PeriodDistribution[];
  summaryCards: SummaryCards;
}) {
  const {
    currentRevenue,
    mrr,
    activeTenants,
    paidTenants,
    conversionRate,
    currentMonthAppointments,
  } = summaryCards;

  return (
    <div className="space-y-6">
      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Faturamento estimado (mês atual)"
          value={formatBRL(currentRevenue)}
          sub="Somatório mensal dos planos ativos"
          tone="bg-primary/10 text-primary"
        />
        <SummaryCard
          label="MRR estimado"
          value={formatBRL(mrr)}
          sub="Receita mensal recorrente atual"
          tone="bg-secondary/10 text-secondary"
        />
        <SummaryCard
          label="Taxa de conversão"
          value={`${formatDecimal(conversionRate)}%`}
          sub={`${paidTenants} de ${summaryCards.totalTenants} clientes pagantes`}
          tone="bg-success/10 text-success"
        />
        <SummaryCard
          label="Consultas ativas (mês)"
          value={formatDecimal(currentMonthAppointments)}
          sub={`${activeTenants} clientes com acesso ativo`}
          tone="bg-primary/10 text-primary"
        />
      </div>

      {/* ── Charts grid ───────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* 1. Novos cadastros de profissionais */}
        <ChartPanel
          title="Novos profissionais cadastrados"
          description="Usuários não-admin criados por mês"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barSize={18}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [
                  formatDecimal(Number(v ?? 0)),
                  "Profissionais",
                ]}
              />
              <Bar
                dataKey="signups"
                fill={COLOR_PRIMARY}
                radius={[4, 4, 0, 0]}
                name="Profissionais"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* 2. Volume total de consultas agendadas */}
        <ChartPanel
          title="Volume de consultas agendadas"
          description="Total (excluindo canceladas) por mês"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barSize={18}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [formatDecimal(Number(v ?? 0)), "Agendadas"]}
              />
              <Bar
                dataKey="appointments"
                fill={COLOR_SECONDARY}
                radius={[4, 4, 0, 0]}
                name="Agendadas"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* 3. Faturamento estimado por mês */}
        <ChartPanel
          title="Faturamento estimado por mês"
          description="Baseado nos planos ativos ao final de cada mês (não são transações reais)"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barSize={18}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis
                {...AXIS_PROPS}
                tickFormatter={(v) => `R$ ${formatBRLShort(Number(v ?? 0))}`}
                width={60}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [formatBRL(Number(v ?? 0)), "Receita est."]}
              />
              <Bar
                dataKey="revenue"
                fill={COLOR_SUCCESS}
                radius={[4, 4, 0, 0]}
                name="Receita est."
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* 4. Trials iniciados vs Assinaturas realizadas */}
        <ChartPanel
          title="Trials iniciados vs Assinaturas"
          description="Novos cadastros (trials) e quantos converteram para plano pago, por mês"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barCategoryGap="30%" barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => [
                  formatDecimal(Number(v ?? 0)),
                  String(name ?? ""),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="trialsStarted"
                fill={COLOR_MUTED}
                radius={[4, 4, 0, 0]}
                name="Trials iniciados"
                barSize={14}
              />
              <Bar
                dataKey="subscriptions"
                fill={COLOR_PRIMARY}
                radius={[4, 4, 0, 0]}
                name="Assinaturas"
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* 5. Consultas concluídas vs canceladas */}
        <ChartPanel
          title="Consultas: concluídas vs canceladas"
          description="Comparativo mensal de status de consultas"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barCategoryGap="30%" barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => [
                  formatDecimal(Number(v ?? 0)),
                  String(name ?? ""),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="completed"
                fill={COLOR_SUCCESS}
                radius={[4, 4, 0, 0]}
                name="Concluídas"
                barSize={14}
              />
              <Bar
                dataKey="canceled"
                fill={COLOR_DESTRUCTIVE}
                radius={[4, 4, 0, 0]}
                name="Canceladas"
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* 6. Churn estimado por mês */}
        <ChartPanel
          title="Volume de abandono por mês"
          description="Clientes que passaram para status 'em atraso' e tiveram acesso bloqueado"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barSize={18}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID_COLOR}
                vertical={false}
              />
              <XAxis dataKey="month" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [formatDecimal(Number(v ?? 0)), "Churns"]}
              />
              <Bar
                dataKey="churn"
                fill={COLOR_WARNING}
                radius={[4, 4, 0, 0]}
                name="Abandono"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* 7. Distribuição de planos ativos */}
        <ChartPanel
          title="Distribuição de planos ativos"
          description="Snapshot atual dos clientes com acesso ativo por plano"
        >
          {planDistribution.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              Nenhum cliente ativo no momento.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  dataKey="value"
                  labelLine={false}
                  label={(props) => <PieLabel {...(props as PieLabelProps)} />}
                >
                  {planDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v, name) => [
                    formatDecimal(Number(v ?? 0)),
                    String(name ?? ""),
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value, entry) => {
                    const payload = entry.payload as
                      | { value: number }
                      | undefined;
                    return `${value} (${formatDecimal(payload?.value ?? 0)})`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        {/* 8. Proporção mensal vs anual */}
        <ChartPanel
          title="Proporção mensal vs anual"
          description="Assinantes ativos por período de cobrança (dados disponíveis após migration)"
        >
          {periodDistribution.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              Nenhum assinante ativo com período registrado.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={periodDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  dataKey="value"
                  labelLine={false}
                  label={(props) => <PieLabel {...(props as PieLabelProps)} />}
                >
                  {periodDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v, name) => [
                    formatDecimal(Number(v ?? 0)),
                    String(name ?? ""),
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value, entry) => {
                    const payload = entry.payload as
                      | { value: number }
                      | undefined;
                    return `${value} (${formatDecimal(payload?.value ?? 0)})`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
      </div>
    </div>
  );
}
