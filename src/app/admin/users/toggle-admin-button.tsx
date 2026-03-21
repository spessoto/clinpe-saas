"use client";

import { useRef } from "react";

import { toggleAdminRoleAction } from "@/app/admin/users/actions";

interface ToggleAdminButtonProps {
  userId: string;
  isAdmin: boolean;
  currentPage: number;
}

export function ToggleAdminButton({
  userId,
  isAdmin,
  currentPage,
}: ToggleAdminButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={toggleAdminRoleAction} className="inline" ref={formRef}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="page" value={String(currentPage)} />
      <label
        className="inline-flex cursor-pointer items-center"
        title="Alternar acesso admin"
      >
        <input
          type="checkbox"
          className="peer sr-only"
          defaultChecked={isAdmin}
          onChange={() => formRef.current?.requestSubmit()}
          aria-label="Alternar acesso admin"
        />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300" />
        <span className="-ml-10 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </label>
    </form>
  );
}
