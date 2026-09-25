import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@wave/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateContactDto,
  ListContactsDto,
  UpdateContactDto,
} from "./contacts.dto";

const contactInclude = {
  company: { select: { id: true, name: true, legalName: true, taxId: true } },
  owner: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ContactInclude;

const contactDetailInclude = {
  ...contactInclude,
  deals: {
    select: {
      id: true,
      title: true,
      value: true,
      currency: true,
      status: true,
      expectedClose: true,
      stage: { select: { id: true, name: true, color: true } },
    },
    orderBy: { updatedAt: "desc" },
  },
  activities: {
    select: {
      id: true,
      type: true,
      status: true,
      subject: true,
      description: true,
      dueAt: true,
      completedAt: true,
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  },
} satisfies Prisma.ContactInclude;

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListContactsDto) {
    const searchTerms = query.search?.split(/\s+/).filter(Boolean);
    const where: Prisma.ContactWhereInput = {
      ...(searchTerms?.length && {
        AND: searchTerms.map((term) => ({
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { documentId: { contains: term } },
            {
              company: {
                is: { name: { contains: term, mode: "insensitive" } },
              },
            },
            {
              company: {
                is: { legalName: { contains: term, mode: "insensitive" } },
              },
            },
            { company: { is: { taxId: { contains: term } } } },
          ],
        })),
      }),
      ...(query.province && { province: query.province }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...(query.ownerId && { ownerId: query.ownerId }),
    };
    const skip = (query.page - 1) * query.limit;
    const [contacts, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        include: contactInclude,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
        skip,
        take: query.limit,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return {
      data: contacts,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: contactDetailInclude,
    });
    if (!contact) throw new NotFoundException("Contacto no encontrado.");
    return contact;
  }

  async create(dto: CreateContactDto, actorId: string) {
    try {
      return await this.prisma.contact.create({
        data: {
          ...dto,
          ownerId: dto.ownerId === undefined ? actorId : dto.ownerId,
        },
        include: contactInclude,
      });
    } catch (error) {
      this.translateWriteError(error);
    }
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.requireContact(id);
    try {
      return await this.prisma.contact.update({
        where: { id },
        data: dto,
        include: contactInclude,
      });
    } catch (error) {
      this.translateWriteError(error);
    }
  }

  async remove(id: string) {
    await this.requireContact(id);
    await this.prisma.contact.delete({ where: { id } });
  }

  private async requireContact(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!contact) throw new NotFoundException("Contacto no encontrado.");
    return contact;
  }

  private translateWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Ya existe un contacto con esa cédula.");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new NotFoundException(
        "La empresa o el responsable indicado no existe.",
      );
    }
    throw error;
  }
}
