import { redirect } from "next/navigation";

import { requireActiveTenant } from "@/lib/auth";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewAppointmentPage({ searchParams }: Props) {
  await requireActiveTenant();
  const params = await searchParams;
  const patientId =
    typeof params.patient_id === "string" ? params.patient_id : "";

  redirect(
    patientId
      ? `/medical-records/new?patient_id=${patientId}`
      : "/medical-records/new",
  );
}
