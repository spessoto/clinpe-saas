"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Professional = {
  id: string;
  full_name: string;
  profile_photo_url?: string | null;
};

type Props = {
  professionals: Professional[];
  selectedProfessionalId: string;
  selectedDate: string;
  basePath: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfessionalAvatar({ professional }: { professional: Professional }) {
  if (professional.profile_photo_url) {
    return (
      <Image
        src={professional.profile_photo_url}
        alt={professional.full_name}
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">
      {getInitials(professional.full_name)}
    </span>
  );
}

export function BookingFilters({
  professionals,
  selectedProfessionalId,
  selectedDate,
  basePath,
}: Props) {
  const router = useRouter();
  const [currentProfessionalId, setCurrentProfessionalId] = useState(
    selectedProfessionalId,
  );

  const currentProfessional =
    professionals.find((p) => p.id === currentProfessionalId) ??
    professionals[0];

  function navigate(professionalId: string, date: string) {
    const params = new URLSearchParams({
      professional_id: professionalId,
      date,
    });
    router.replace(`${basePath}?${params.toString()}`);
  }

  const showProfessional = professionals.length > 1;

  return (
    <div className={`grid gap-3 ${showProfessional ? "grid-cols-2" : ""}`}>
      {showProfessional && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">
            Profissional
          </span>
          <div className="flex items-center gap-2">
            {currentProfessional && (
              <ProfessionalAvatar professional={currentProfessional} />
            )}
            <select
              className="min-w-0 flex-1"
              defaultValue={selectedProfessionalId}
              onChange={(e) => {
                setCurrentProfessionalId(e.target.value);
                navigate(e.target.value, selectedDate);
              }}
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
        </label>
      )}
      <label
        className={`block text-sm ${!showProfessional ? "col-span-1" : ""}`}
      >
        <span className="mb-1 block font-medium text-foreground">Data</span>
        <input
          type="date"
          defaultValue={selectedDate}
          onChange={(e) => {
            if (e.target.value) navigate(currentProfessionalId, e.target.value);
          }}
          className="w-full"
        />
      </label>
    </div>
  );
}
