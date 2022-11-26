import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Token } from 'src/auth/entity/token.entity';
import { TokenRepository } from 'src/auth/repository/token.repository';
import { LockerModule } from 'src/locker/locker.module';
import { LockerRepository } from 'src/locker/repository/locker.repository';
import { User } from './entity/user.entity';
import { UserRepository } from './repository/user.repository';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRepository]), LockerModule],
  providers: [UserService],
  exports: [TypeOrmModule, UserService],
})
export class UserModule {}
