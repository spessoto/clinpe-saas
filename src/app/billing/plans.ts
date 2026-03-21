export type BillingTier = "tier_1" | "tier_2" | "tier_3";
export type BillingPeriod = "monthly" | "annual";

export type BillingPlanConfig = Record<
  BillingTier,
  {
    label: string;
    maxPatients: number;
    monthly: { amount: number; description: string };
    annual: { amount: number; description: string };
  }
>;

export const BILLING_PLANS: BillingPlanConfig = {
  tier_1: {
    label: "Starter",
    maxPatients: 50,
    monthly: {
      amount: 99.9,
      description: "PodoDesk Starter – até 50 pacientes (mensal)",
    },
    annual: {
      amount: 1078.9,
      description: "PodoDesk Starter – até 50 pacientes (anual)",
    },
  },
  tier_2: {
    label: "Pro",
    maxPatients: 100,
    monthly: {
      amount: 149.9,
      description: "PodoDesk Pro – até 100 pacientes (mensal)",
    },
    annual: {
      amount: 1618.9,
      description: "PodoDesk Pro – até 100 pacientes (anual)",
    },
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
  },
};
