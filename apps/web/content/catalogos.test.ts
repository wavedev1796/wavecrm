// @vitest-environment node
import { readFileSync } from "node:fs";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  CLOSE_REASONS,
  DEAL_STATUSES,
  DOCUMENT_TYPES,
  LOSS_REASONS,
  QUOTE_STATUSES,
  REJECTION_REASONS,
  STAGE_REQUIREMENTS,
  USER_ROLES,
} from "@wave/shared";
import { expect, test } from "vitest";

const schema = readFileSync(
  new URL("../../../packages/database/prisma/schema.prisma", import.meta.url),
  "utf8",
);

function prismaEnum(name: string) {
  const block = new RegExp(`enum ${name} \\{([^}]*)\\}`).exec(schema)?.[1] ?? "";
  return block.split(/\s+/).filter(Boolean);
}

test.each([
  ["UserRole", USER_ROLES],
  ["DealStatus", DEAL_STATUSES],
  ["ActivityType", ACTIVITY_TYPES],
  ["ActivityStatus", ACTIVITY_STATUSES],
  ["QuoteStatus", QUOTE_STATUSES],
  ["DocumentType", DOCUMENT_TYPES],
  ["LossReason", CLOSE_REASONS],
  ["StageRequirement", STAGE_REQUIREMENTS],
])("@wave/shared repite el enum %s del schema de Prisma", (name, codes) => {
  expect([...codes]).toEqual(prismaEnum(name));
});

test("los motivos de perdido y de rechazado cubren LossReason y solo comparten «Otro»", () => {
  expect(new Set<string>([...LOSS_REASONS, ...REJECTION_REASONS])).toEqual(new Set(prismaEnum("LossReason")));
  expect(LOSS_REASONS.filter((code) => (REJECTION_REASONS as readonly string[]).includes(code))).toEqual(["OTHER"]);
});
