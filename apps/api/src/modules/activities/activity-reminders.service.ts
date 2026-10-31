import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { MailerService } from "../mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ActivityRemindersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityRemindersService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.deliverDueReminders().catch((error: unknown) =>
          this.logBatchError(error),
        ),
      60_000,
    );
    this.timer.unref();
    void this.deliverDueReminders().catch((error: unknown) =>
      this.logBatchError(error),
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async deliverDueReminders(now = new Date()) {
    if (this.running) return 0;
    this.running = true;
    let sent = 0;
    try {
      const expiredClaim = new Date(now.getTime() - 10 * 60_000);
      const due = await this.prisma.activity.findMany({
        where: {
          status: "PENDING",
          reminderAt: { lte: now },
          reminderSentAt: null,
          OR: [
            { reminderClaimedAt: null },
            { reminderClaimedAt: { lt: expiredClaim } },
          ],
          assignee: { is: { active: true } },
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ reminderAt: "asc" }, { id: "asc" }],
        take: 100,
      });
      for (const activity of due) {
        if (!activity.assignee) continue;
        const claim = await this.prisma.activity.updateMany({
          where: {
            id: activity.id,
            status: "PENDING",
            reminderSentAt: null,
            OR: [
              { reminderClaimedAt: null },
              { reminderClaimedAt: { lt: expiredClaim } },
            ],
          },
          data: { reminderClaimedAt: now },
        });
        if (claim.count !== 1) continue;
        try {
          await this.mailer.sendActivityReminder(
            { email: activity.assignee.email, name: activity.assignee.name },
            activity.subject,
            activity.dueAt ?? activity.reminderAt ?? now,
          );
          await this.prisma.activity.update({
            where: { id: activity.id },
            data: { reminderSentAt: now, reminderClaimedAt: null },
          });
          sent++;
        } catch (error) {
          await this.prisma.activity.updateMany({
            where: {
              id: activity.id,
              reminderClaimedAt: now,
              status: "PENDING",
            },
            data: { reminderClaimedAt: null },
          });
          this.logger.error(
            `No se pudo entregar el recordatorio de ${activity.id}.`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
      return sent;
    } finally {
      this.running = false;
    }
  }

  private logBatchError(error: unknown) {
    this.logger.error(
      "No se pudo consultar la cola de recordatorios.",
      error instanceof Error ? error.stack : undefined,
    );
  }
}
