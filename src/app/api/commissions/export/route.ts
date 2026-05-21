import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id || profile.role !== "owner") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const from = parseDateParam(request.nextUrl.searchParams.get("from"));
  const to = parseDateParam(request.nextUrl.searchParams.get("to"));

  const start = from ?? defaultStart;
  const end = to && to > start ? to : defaultEnd;

  const { data: commissions, error } = await supabase
    .from("commissions")
    .select(
      "service_date, professional_name, service_description, amount, commission_rate, commission_amount, paid_at, notes",
    )
    .eq("tenant_id", profile.tenant_id)
    .gte("service_date", toDateInput(start))
    .lt("service_date", toDateInput(end))
    .order("service_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Falha ao exportar comissões." },
      { status: 500 },
    );
  }

  const header = [
    "Data Serviço",
    "Profissional",
    "Serviço",
    "Valor Serviço",
    "Taxa (%)",
    "Valor Comissão",
    "Pago em",
    "Observações",
  ];

  const rows = (commissions ?? []).map((commission) => [
    commission.service_date,
    commission.professional_name,
    commission.service_description ?? "",
    Number(commission.amount ?? 0)
      .toFixed(2)
      .replace(".", ","),
    Number(commission.commission_rate ?? 0)
      .toFixed(2)
      .replace(".", ","),
    Number(commission.commission_amount ?? 0)
      .toFixed(2)
      .replace(".", ","),
    commission.paid_at
      ? new Date(commission.paid_at).toISOString().slice(0, 10)
      : "",
    commission.notes ?? "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="comissoes-${toDateInput(start)}-a-${toDateInput(end)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
