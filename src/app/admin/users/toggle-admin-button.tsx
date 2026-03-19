"use client";

import { toggleAdminRoleAction } from "@/app/admin/users/actions";

interface ToggleAdminButtonProps {
  userId: string;
  userEmail: string;
  isAdmin: boolean;
}

export function ToggleAdminButton({
  userId,
  userEmail,
  isAdmin,
}: ToggleAdminButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const action = isAdmin ? "revogar" : "dar";
    const msg = `Tem certeza que quer ${action} acesso admin a ${userEmail}?`;
    if (!confirm(msg)) {
      e.preventDefault();
    }
  };

  return (
    <form action={toggleAdminRoleAction} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        onClick={handleClick}
        className={`rounded px-3 py-1 text-xs font-medium transition ${
          isAdmin
            ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
            : "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
      >
        {isAdmin ? "Revogar Admin" : "Promover Admin"}
      </button>
    </form>
  );
}
