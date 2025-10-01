import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationUtil, PaginationResult } from '../utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private paginationUtil: PaginationUtil,
  ) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({ data: createUserDto });
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const { passwordHash, refreshToken, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }

  async findByEmailWithSensitiveData(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user) {
      const { passwordHash, refreshToken, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }

  async findAll(page: number, limit: number): Promise<PaginationResult<any>> {
    return this.paginationUtil.paginate(
      (skip, take) =>
        this.prisma.user.findMany({
          skip,
          take,
          select: { id: true, email: true, role: true, createdAt: true },
        }),
      () => this.prisma.user.count(),
      page,
      limit,
    );
  }

  async update(id: number, data: { refreshToken?: string | null }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
