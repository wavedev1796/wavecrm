import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@wave/database";
import { CONTACT_METHOD_REQUIRED } from "../../common/validation";
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

/**
 * El documento es obligatorio y tipo y número viajan juntos. En un PATCH, el PartialType salta la validación del
 * campo que no llega, así que cambiar solo uno de los dos se rechaza aquí.
 */
function withDocumentPair<
  T extends { documentId?: string; documentType?: unknown },
>(dto: T) {
  if (dto.documentType !== undefined && dto.documentId === undefined) {
    throw new BadRequestException("Ingresa el número de documento.");
  }
  if (dto.documentId !== undefined && dto.documentType === undefined) {
    throw new BadRequestException("Elige el tipo de documento.");
  }
  return dto;
}

/** Al menos un teléfono o un correo. En un PATCH cuenta lo que el contacto ya tiene guardado. */
function requireContactMethod(contact: {
  phone?: string | null;
  email?: string | null;
}) {
  if (!contact.phone && !contact.email) {
    throw new BadRequestException(CONTACT_METHOD_REQUIRED);
  }
}

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
            { documentId: { contains: term, mode: "insensitive" } },
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
    requireContactMethod(dto);
    try {
      return await this.prisma.contact.create({
        data: {
          ...withDocumentPair(dto),
          ownerId: dto.ownerId === undefined ? actorId : dto.ownerId,
        },
        include: contactInclude,
      });
    } catch (error) {
      this.translateWriteError(error);
    }
  }

  async update(id: string, dto: UpdateContactDto) {
    const current = await this.requireContact(id);
    requireContactMethod({
      phone: dto.phone === undefined ? current.phone : dto.phone,
      email: dto.email === undefined ? current.email : dto.email,
    });
    try {
      return await this.prisma.contact.update({
        where: { id },
        data: withDocumentPair(dto),
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
      select: { id: true, phone: true, email: true },
    });
    if (!contact) throw new NotFoundException("Contacto no encontrado.");
    return contact;
  }

  private translateWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Ya existe un contacto con ese documento.");
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
