import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ tenant_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PublicBookingPage({ params, searchParams }: Props) {
  const { tenant_slug } = await params;
  const search = await searchParams;

  const qs = new URLSearchParams();
  if (typeof search.professional_id === "string") qs.set("professional_id", search.professional_id);
  if (typeof search.date === "string") qs.set("date", search.date);
  if (typeof search.success === "string") qs.set("success", search.success);
  if (typeof search.error === "string") qs.set("error", search.error);

  const queryString = qs.toString();
  redirect(`/booking-pages/${tenant_slug}${queryString ? `?${queryString}` : ""}`);
}
