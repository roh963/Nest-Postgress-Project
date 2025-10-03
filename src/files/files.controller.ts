import {
  Controller,
  Post,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';
import { multerConfig } from './multer.config';

@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerConfig)) // Apply multer config
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.debug('req.user payload => ' + JSON.stringify(req.user));

    const userObj = req.user;
    if (!userObj) {
      throw new BadRequestException('Authenticated user not found in request');
    }

    const rawId = userObj['id'] ?? userObj['sub'] ?? userObj['userId'] ?? userObj['uid'];
    if (rawId === undefined || rawId === null) {
      throw new BadRequestException('User ID not found in token payload');
    }

    const userId = Number(rawId);
    if (isNaN(userId)) {
      throw new BadRequestException('User ID is not a valid number');
    }

    const fileData = await this.filesService.uploadFile(file, userId);

    return {
      id: fileData.id,
      url: fileData.url,
      size: fileData.size,
      mimetype: fileData.mimetype,
    };
  }
}