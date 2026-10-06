// @vitest-environment node
import { readFileSync } from "node:fs";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  DEAL_STATUSES,
  DOCUMENT_TYPES,
  QUOTE_STATUSES,
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
])("CRM-19: @wave/shared repite el enum %s del schema de Prisma", (name, codes) => {
  expect([...codes]).toEqual(prismaEnum(name));
});
