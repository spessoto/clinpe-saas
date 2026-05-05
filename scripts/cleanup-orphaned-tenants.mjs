import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Erro: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.",
  );
  console.error(
    "  Exemplo: dotenv -e .env.local -- node scripts/cleanup-orphaned-tenants.mjs",
  );
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DRY_RUN = process.argv[2] !== "--execute";

async function main() {
  console.log(
    DRY_RUN
      ? "=== DRY RUN (use --execute para deletar) ==="
      : "=== EXECUTANDO DELEÇÃO ===",
  );

  const { data: tenants, error: e1 } = await admin
    .from("tenants")
    .select("id, name, created_at");
  if (e1) {
    console.error("Erro ao buscar tenants:", e1.message);
    process.exit(1);
  }

  const { data: owners, error: e2 } = await admin
    .from("users")
    .select("tenant_id")
    .eq("role", "owner");
  if (e2) {
    console.error("Erro ao buscar owners:", e2.message);
    process.exit(1);
  }

  const ownerSet = new Set(owners.map((o) => o.tenant_id));
  const orphaned = tenants.filter((t) => !ownerSet.has(t.id));
  const active = tenants.filter((t) => ownerSet.has(t.id));

  console.log("\n--- TENANTS ATIVOS (serão mantidos) ---");
  active.forEach((t) => console.log(`  ✓ ${t.name} (${t.id})`));

  console.log("\n--- TENANTS ÓRFÃOS (sem owner) ---");
  if (orphaned.length === 0) {
    console.log("  Nenhum tenant órfão encontrado. Banco já está limpo!");
    return;
  }
  orphaned.forEach((t) =>
    console.log(
      `  ✗ ${t.name} (${t.id}) - criado em ${t.created_at?.slice(0, 10)}`,
    ),
  );

  console.log(
    `\nResumo: ${active.length} ativos, ${orphaned.length} órfãos para deletar`,
  );

  if (DRY_RUN) {
    console.log("\nExecute com --execute para confirmar a deleção.");
    return;
  }

  // Deletar tenants órfãos (cascata apaga tudo relacionado)
  console.log("\nDeletando tenants órfãos...");
  for (const t of orphaned) {
    const { error } = await admin.from("tenants").delete().eq("id", t.id);
    if (error) {
      console.error(`  ✗ Erro ao deletar "${t.name}": ${error.message}`);
    } else {
      console.log(`  ✓ Deletado: ${t.name}`);
    }
  }

  // Verificar resultado final
  const { data: after } = await admin.from("tenants").select("id, name");
  console.log(`\nFinalizado! Tenants restantes: ${after.length}`);
  after.forEach((t) => console.log(`  - ${t.name}`));
}

main().catch(console.error);
