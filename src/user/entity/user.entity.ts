import { Token } from 'src/auth/entity/token.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoleType } from '../role-type';

@Entity('user')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  userId: number;

  @Column({
    nullable: false,
    unique: true,
  })
  username: string;

  @Column()
  password: string;

  @Column({
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.CUSTOMER,
  })
  role: RoleType;

  @OneToMany((type) => Token, (token) => token.user, {
    cascade: true,
  })
  refereshTokens: Token[];
}
