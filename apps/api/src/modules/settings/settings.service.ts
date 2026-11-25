import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Actor } from "../pipeline/pipeline.service";
import type { UpdateSettingsDto } from "./settings.dto";

const DEFAULT_TAX_RATE = 15;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.appSettings.findUnique({ where: { id: 1 } });
    return { taxRate: row?.taxRate ?? DEFAULT_TAX_RATE };
  }

  async update({ taxRate }: UpdateSettingsDto, actor: Actor) {
    if (actor.role !== "ADMIN") throw new ForbiddenException("Solo un administrador cambia la configuración.");
    return this.prisma.$transaction(async (tx) => {
      const before = (await tx.appSettings.findUnique({ where: { id: 1 } }))?.taxRate ?? DEFAULT_TAX_RATE;
      await tx.appSettings.upsert({ where: { id: 1 }, update: { taxRate }, create: { id: 1, taxRate } });
      if (before !== taxRate)
        await tx.auditLog.create({
          data: { action: "UPDATED", entityType: "Settings", entityId: "1", userId: actor.id, changes: { taxRate: { from: before, to: taxRate } } },
        });
      return { taxRate };
    });
  }
}
