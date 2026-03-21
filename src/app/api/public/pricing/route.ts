import { NextResponse } from "next/server";

import { getBillingPlans } from "@/app/billing/plans-server";

export async function GET() {
  const plans = await getBillingPlans();

  return NextResponse.json({ plans });
}
