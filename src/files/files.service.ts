import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import { extname } from 'path';
import * as fs from 'fs/promises';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File, uploadedBy: number) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/pdf',
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: png, jpg, pdf',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Decide storage based on environment
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    let url: string, key: string;

    if (isProduction) {
      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        resource_type: 'auto',
        public_id: `uploads/${Date.now()}${extname(file.originalname)}`,
      });

      url = uploadResult.secure_url;
      key = uploadResult.public_id;

      // Clean up temporary file
      await fs.unlink(file.path).catch(() => {}); // Ignore if file doesn't exist
    } else {
      // Local storage for development
      const uploadDir = './uploads';
      await fs.mkdir(uploadDir, { recursive: true });
      const fileName = `${Date.now()}${extname(file.originalname)}`;
      const filePath = `${uploadDir}/${fileName}`;

      // Write file from Multer's temporary path
      await fs.rename(file.path, filePath).catch(async (err) => {
        console.error('Rename failed, copying instead:', err);
        await fs.writeFile(filePath, await fs.readFile(file.path));
        await fs.unlink(file.path).catch(() => {});
      });

      url = `http://localhost:3000/uploads/${fileName}`; // Adjust port if needed
      key = fileName;
    }

    // Save metadata to Postgres
    console.log(
      'Saving file metadata. uploadedBy=',
      uploadedBy,
      'typeof=',
      typeof uploadedBy,
    );
    const fileData = await this.prisma.file.create({
      data: {
        url,
        key,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy, // Now correctly typed as number
      },
    });
    await this.notificationsService.enqueueNotification('file', fileData.id);
    return fileData;
  }
}
