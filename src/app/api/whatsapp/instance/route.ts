import { NextResponse } from "next/server";

import { requireActiveTenant } from "@/lib/auth";
import {
  createEvolutionInstance,
  deleteEvolutionInstance,
} from "@/lib/evolution-api";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    // Prevent creating a second instance
    if (tenant.evolution_instance_name) {
      return NextResponse.json(
        { error: "Instância já existe. Desconecte antes de criar uma nova." },
        { status: 409 },
      );
    }

    const instanceName = `pododesk_${tenant.id.replace(/-/g, "").slice(0, 12)}`;
    const token = crypto.randomUUID();

    const result = await createEvolutionInstance(instanceName, token);

    // Save instance info to tenant
    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        evolution_instance_name: instanceName,
        evolution_instance_token: token,
        whatsapp_status: "qrcode",
      })
      .eq("id", tenant.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Falha ao salvar instância no banco." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      instanceName,
      qrcode: result.qrcode?.base64 ?? null,
      status: "qrcode",
    });
  } catch (err) {
    console.error("POST /api/whatsapp/instance error:", err);
    return NextResponse.json(
      { error: "Falha ao criar instância WhatsApp." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const { tenant } = await requireActiveTenant();
    const supabase = await createClient();

    if (!tenant.evolution_instance_name) {
      return NextResponse.json(
        { error: "Nenhuma instância WhatsApp conectada." },
        { status: 404 },
      );
    }

    // Delete instance from Evolution API (ignore errors — it may already be gone)
    await deleteEvolutionInstance(tenant.evolution_instance_name).catch(
      (err) => {
        console.warn("Evolution delete warning:", err);
      },
    );

    // Clear tenant columns
    await supabase
      .from("tenants")
      .update({
        evolution_instance_name: null,
        evolution_instance_token: null,
        whatsapp_status: "disconnected",
      })
      .eq("id", tenant.id);

    return NextResponse.json({ status: "disconnected" });
  } catch (err) {
    console.error("DELETE /api/whatsapp/instance error:", err);
    return NextResponse.json(
      { error: "Falha ao desconectar instância WhatsApp." },
      { status: 500 },
    );
  }
}
