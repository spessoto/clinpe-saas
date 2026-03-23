import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const { data: patients, error } = await supabase
    .from("patients")
    .select("id, name, phone, email")
    .eq("tenant_id", profile.tenant_id)
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    .order("name", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { error: "Falha ao buscar pacientes." },
      { status: 500 },
    );
  }

  return NextResponse.json(patients ?? []);
}
