import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(createFeedbackDto: CreateFeedbackDto) {
    return this.prisma.feedback.create({ data: createFeedbackDto });
  }

  async findAll() {
    return this.prisma.feedback.findMany();
  }
}