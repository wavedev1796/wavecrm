import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@wave/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCompanyDto,
  ListCompaniesDto,
  UpdateCompanyDto,
} from "./companies.dto";

const companyInclude = {
  owner: { select: { id: true, name: true, email: true } },
  _count: { select: { contacts: true } },
} satisfies Prisma.CompanyInclude;

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCompaniesDto) {
    const where: Prisma.CompanyWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { legalName: { contains: query.search, mode: "insensitive" } },
          { taxId: { contains: query.search } },
        ],
      }),
      ...(query.province && { province: query.province }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...(query.ownerId && { ownerId: query.ownerId }),
    };
    const skip = (query.page - 1) * query.limit;
    const [companies, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        include: companyInclude,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip,
        take: query.limit,
      }),
      this.prisma.company.count({ where }),
    ]);
    return {
      data: companies,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: companyInclude,
    });
    if (!company) throw new NotFoundException("Empresa no encontrada.");
    return company;
  }

  async create(dto: CreateCompanyDto, actorId: string) {
    try {
      return await this.prisma.company.create({
        data: {
          ...dto,
          ownerId: dto.ownerId === undefined ? actorId : dto.ownerId,
        },
        include: companyInclude,
      });
    } catch (error) {
      this.translateWriteError(error);
    }
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.requireCompany(id);
    try {
      return await this.prisma.company.update({
        where: { id },
        data: dto,
        include: companyInclude,
      });
    } catch (error) {
      this.translateWriteError(error);
    }
  }

  async remove(id: string) {
    await this.requireCompany(id);
    await this.prisma.company.delete({ where: { id } });
  }

  private async requireCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!company) throw new NotFoundException("Empresa no encontrada.");
    return company;
  }

  private translateWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Ya existe una empresa con ese RUC.");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new NotFoundException("El responsable indicado no existe.");
    }
    throw error;
  }
}
