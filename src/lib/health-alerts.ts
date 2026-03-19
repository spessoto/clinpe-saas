export function buildHealthAlerts(data: {
  has_diabetes: boolean;
  diabetes_type?: string | null;
  has_vascular_issues: boolean;
  has_coagulation_disorders: boolean;
  has_oncological_history: boolean;
  is_smoker: boolean;
  continuous_meds: string[];
  patient_allergies: string[];
}): string[] {
  const alerts: string[] = [];
  if (data.has_diabetes)
    alerts.push(
      `Diabetes${data.diabetes_type ? ` T${data.diabetes_type}` : ""}`,
    );
  if (data.has_vascular_issues) alerts.push("Vascular/Cardíaco");
  if (data.has_coagulation_disorders) alerts.push("Distúrbio Coagulação");
  if (data.has_oncological_history) alerts.push("Histórico Oncológico");
  if (data.is_smoker) alerts.push("Fumante");
  data.continuous_meds.forEach((m) => alerts.push(m));
  data.patient_allergies.forEach((a) => alerts.push(`Alergia: ${a}`));
  return alerts;
}
