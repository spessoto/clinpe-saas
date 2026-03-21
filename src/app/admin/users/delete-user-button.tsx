"use client";

import { Trash2 } from "lucide-react";

import { deleteUserAction } from "@/app/admin/users/actions";

interface DeleteUserButtonProps {
  userId: string;
  userEmail: string;
  isAdmin: boolean;
  currentPage: number;
}

export function DeleteUserButton({
  userId,
  userEmail,
  isAdmin,
  currentPage,
}: DeleteUserButtonProps) {
  if (isAdmin) {
    return (
      <span
        className="inline-flex rounded-md border border-border p-2 text-muted-foreground/60"
        title="Admin não pode ser excluído"
        aria-label="Admin não pode ser excluído"
      >
        <Trash2 className="h-4 w-4" />
      </span>
    );
  }

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userEmail}?`)) {
      event.preventDefault();
    }
  };

  return (
    <form action={deleteUserAction} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="page" value={String(currentPage)} />
      <button
        type="submit"
        onClick={handleDelete}
        className="rounded-md border border-red-300 p-2 text-red-600 transition hover:bg-red-50"
        title={`Excluir ${userEmail}`}
        aria-label={`Excluir ${userEmail}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
