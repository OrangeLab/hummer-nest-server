import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, OneToOne } from 'typeorm';
import { RolePrivilege } from './rolePrivilege.entity';

@Entity()
export class UserRole {
  @PrimaryColumn({ type: 'bigint'})
  roleId: number

  @Column()
  code: string;

  @Column()
  name: string;

  @Column()
  type: string;
}
