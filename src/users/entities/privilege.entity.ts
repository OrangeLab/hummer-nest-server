import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, OneToOne } from 'typeorm';
import { RolePrivilege } from './rolePrivilege.entity';

@Entity()
export class Privilege {
  @PrimaryColumn({ type: 'bigint'})
  privilegeId: number

  @Column()
  code: string;

  @Column()
  name: string;
}
