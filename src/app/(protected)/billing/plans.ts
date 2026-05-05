export type BillingTier = "tier_1" | "tier_2" | "tier_3";
export type BillingPeriod = "monthly" | "annual";
export type BillingCapability =
  | "medical_records"
  | "schedule"
  | "whatsapp"
  | "pops"
  | "finance"
  | "sterilization"
  | "commissions";

export type BillingPlanConfig = Record<
  BillingTier,
  {
    label: string;
    maxPatients: number;
    monthly: { amount: number; description: string };
    annual: { amount: number; description: string };
    overageMonthlyAmount: number | null;
    capabilities: BillingCapability[];
  }
>;

export const BILLING_PLANS: BillingPlanConfig = {
  tier_1: {
    label: "Essencial",
    maxPatients: 50,
    monthly: {
      amount: 49.9,
      description: "PodoDesk Essencial – até 50 pacientes (mensal)",
    },
    annual: {
      amount: 538.9,
      description: "PodoDesk Essencial – até 50 pacientes (anual)",
    },
    overageMonthlyAmount: 2.0,
    capabilities: ["schedule", "whatsapp", "medical_records", "pops"],
  },
  tier_2: {
    label: "Pro",
    maxPatients: 150,
    monthly: {
      amount: 99.9,
      description: "PodoDesk Pro – até 100 pacientes (mensal)",
    },
    annual: {
      amount: 1078.9,
      description: "PodoDesk Pro – até 100 pacientes (anual)",
    },
    overageMonthlyAmount: 1.5,
    capabilities: [
      "schedule",
      "whatsapp",
      "medical_records",
      "pops",
      "finance",
      "sterilization",
    ],
  },
  tier_3: {
    label: "Clínica",
    maxPatients: 150,
    monthly: {
      amount: 199.9,
      description: "PodoDesk Clínica – até 150 pacientes (mensal)",
    },
    annual: {
      amount: 2158.9,
      description: "PodoDesk Clínica – até 150 pacientes (anual)",
    },
    overageMonthlyAmount: null,
    capabilities: [
      "schedule",
      "whatsapp",
      "medical_records",
      "pops",
      "finance",
      "sterilization",
      "commissions",
    ],
  },
};
