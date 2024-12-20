import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { diskStorage } from 'multer';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('get-tokens')
  getTokens() {
    return this.appService.getTokens();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './files',
      }),
    }),
  )
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const filePath = file.path;
    const updatedFilePath = await this.appService.processCsv(filePath);

    res.download(updatedFilePath, (err) => {
      if (err) {
        console.error(err);
      }
      // Clean up files
      fs.unlinkSync(filePath);
      // fs.unlinkSync(updatedFilePath);
    });
  }
}
