import { EntityRepository, Repository } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Token } from '../entity/token.entity';

@EntityRepository(Token)
export class TokenRepository extends Repository<Token> {}
