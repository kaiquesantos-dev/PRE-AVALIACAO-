import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [PrismaModule, AuthModule, WorkspacesModule, BookingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
