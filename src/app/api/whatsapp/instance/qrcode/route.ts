import { NextResponse } from "next/server";

import { requireActiveTenant } from "@/lib/auth";
import { getInstanceQRCode } from "@/lib/evolution-api";

export async function GET() {
  try {
    const { tenant } = await requireActiveTenant();

    if (!tenant.evolution_instance_name) {
      return NextResponse.json(
        { error: "Nenhuma instância WhatsApp configurada." },
        { status: 404 },
      );
    }

    const qrData = await getInstanceQRCode(tenant.evolution_instance_name);

    return NextResponse.json({
      base64: qrData.base64 ?? null,
      code: qrData.code ?? null,
    });
  } catch (err) {
    console.error("GET /api/whatsapp/instance/qrcode error:", err);
    return NextResponse.json(
      { error: "Falha ao obter QR code." },
      { status: 500 },
    );
  }
}
