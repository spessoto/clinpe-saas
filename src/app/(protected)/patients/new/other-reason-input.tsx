"use client";

import { useEffect, useState } from "react";

type OtherReasonInputProps = {
  triggerSelector: string;
  inputName: string;
  label: string;
  placeholder: string;
};

export function OtherReasonInput({
  triggerSelector,
  inputName,
  label,
  placeholder,
}: OtherReasonInputProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof document === "undefined") {
      return false;
    }

    const trigger = document.querySelector<
      HTMLInputElement | HTMLSelectElement
    >(triggerSelector);

    if (!trigger) {
      return false;
    }

    if (trigger instanceof HTMLSelectElement) {
      return trigger.value === "Outro";
    }

    if (trigger.type === "radio" || trigger.type === "checkbox") {
      return trigger.checked;
    }

    return false;
  });

  useEffect(() => {
    const trigger = document.querySelector<
      HTMLInputElement | HTMLSelectElement
    >(triggerSelector);

    if (!trigger) {
      return;
    }

    const computeOpen = () => {
      if (trigger instanceof HTMLSelectElement) {
        return trigger.value === "Outro";
      }

      if (trigger.type === "radio" || trigger.type === "checkbox") {
        return trigger.checked;
      }

      return false;
    };

    const onChange = () => setIsOpen(computeOpen());
    trigger.addEventListener("change", onChange);

    return () => {
      trigger.removeEventListener("change", onChange);
    };
  }, [triggerSelector]);

  if (!isOpen) {
    return null;
  }

  return (
    <label className="mt-3 block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <input
        name={inputName}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none ring-primary/40 focus:ring-2"
      />
    </label>
  );
}
