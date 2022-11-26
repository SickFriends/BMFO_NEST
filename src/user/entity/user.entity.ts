import { Token } from 'src/auth/entity/token.entity';
import { Basket } from 'src/basket/entity/basket.entity';
import { LockerPass } from 'src/locker/entity/LockerPass.entity';
import { Order } from 'src/order/entity/order.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
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

  @OneToMany((type) => Order, (order) => order.orderer)
  orders: Order[];

  @OneToOne((type) => Basket, (basket) => basket.user)
  basket: Basket;

  @OneToOne((type) => LockerPass, (lockerPass) => lockerPass.user)
  lockerPass: LockerPass;
}
