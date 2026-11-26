/**
 * Owner's directive, 2026-11-26 (decisions from the visual-conference
 * gallery review): applies the owner's explicit, item-by-item choices —
 * confirms 4 previously-flagged-as-uncertain slots as-is (the owner
 * reviewed the creative directly and accepts it), resolves 3 two-
 * candidate ambiguities by eliminating the named rejected creative, and
 * removes the 2 surplus creatives that don't correspond to any of the 30
 * official products. Every elimination here is an explicit owner
 * decision from this session, never an automatic/guessed resolution —
 * see the chat message this script was written from.
 *
 * Deleting a BlackFridayCreative row also removes its file from
 * public/black-friday-2026 (owner's own word: "elimine") — the FK
 * (selectedCreativeId -> onDelete: SetNull) makes this safe even if a
 * product still pointed at it, though none of the eliminated ones were
 * ever selected (they were always the unresolved side of an ambiguous
 * pair, or plain surplus).
 */
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";

const PUBLIC_ROOT = join(process.cwd(), "public");

async function eliminateCreative(originalFilename: string) {
  const creative = await prisma.blackFridayCreative.findFirst({ where: { originalFilename } });
  if (!creative) {
    console.log(`(já removido ou não encontrado) ${originalFilename}`);
    return;
  }
  await prisma.blackFridayProduct.updateMany({
    where: { selectedCreativeId: creative.id },
    data: { selectedCreativeId: null },
  });
  await prisma.blackFridayCreative.delete({ where: { id: creative.id } });
  const absolutePath = join(PUBLIC_ROOT, creative.storedPath.replace(/^\//, ""));
  try {
    unlinkSync(absolutePath);
  } catch {
    // already gone — fine, the DB row is the source of truth for "exists"
  }
  console.log(`Eliminado: ${originalFilename} (${creative.storedPath})`);
}

async function confirmSlot(slot: number, clearNote = true) {
  const product = await prisma.blackFridayProduct.findUnique({ where: { slotNumber: slot } });
  if (!product) throw new Error(`Slot ${slot} não encontrado`);
  const candidates = await prisma.blackFridayCreative.findMany({ where: { groupKey: product.creativeGroupKey } });
  if (candidates.length !== 1) {
    throw new Error(`Slot ${slot}: esperado exatamente 1 candidato após as eliminações, encontrado ${candidates.length}`);
  }
  await prisma.blackFridayProduct.update({
    where: { slotNumber: slot },
    data: {
      selectedCreativeId: candidates[0]!.id,
      ...(clearNote ? { reviewNote: null } : {}),
    },
  });
  console.log(`Slot ${slot} confirmado -> creative ${candidates[0]!.id} (${candidates[0]!.originalFilename})`);
}

async function main() {
  // Item 04 — Casio G-Shock: os 2 arquivos são quase idênticos, eliminar
  // bf26, manter bf17.
  await eliminateCreative("bf26.jpeg");
  // Item 15 — Secador Philco: eliminar bf16, manter bf27 (PSC3500 "4 em 1",
  // o nome oficial da lista já bate exatamente com esse rótulo).
  await eliminateCreative("bf16.jpeg");
  // Item 17 — Furadeira Black Tools TB-21PX: "são iguais", eliminar bf23,
  // manter bf20.
  await eliminateCreative("bf23.jpeg");
  // Item 20 — Kit Multi Ferramentas Simake: eliminar bf15, manter bf09.
  await eliminateCreative("bf15.jpeg");
  // Criativos excedentes — não correspondem a nenhum dos 30 produtos
  // oficiais (kit natalino 88 enfeites, protetor solar Hidrabene).
  await eliminateCreative("bf12.jpeg");
  await eliminateCreative("bf25.jpeg");

  // Confirmações diretas do dono, sem alterar o criativo.
  await confirmSlot(4); // Casio G-Shock — resolvido pela eliminação acima
  await confirmSlot(10); // Kit de Ferramentas 110 Peças com Maleta — ok
  await confirmSlot(11); // Câmera IM5SC — ok, manter
  await confirmSlot(19); // Pista de Carrinhos Lava-Rápido — ok
  await confirmSlot(22); // Cadeira Begonia Mesh — manter assim

  // Item 15/17/20 agora têm exatamente 1 candidato cada, depois das
  // eliminações acima.
  await confirmSlot(15);
  await confirmSlot(17);
  // Item 20: a escolha entre os 2 criativos foi resolvida, mas a
  // divergência de marca (anúncio é Simake, criativo impresso é Strike)
  // não foi endereçada pelo dono — mantemos essa parte do aviso, não a
  // apagamos silenciosamente.
  await confirmSlot(20, false);
  await prisma.blackFridayProduct.update({
    where: { slotNumber: 20 },
    data: {
      reviewNote:
        "Divergência de marca ainda não confirmada: o anúncio oficial é da marca Simake, o criativo selecionado está impresso com a marca 'STRIKE'. Confirme com o Henrique antes de validar.",
    },
  });

  console.log("Revisão visual aplicada.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
