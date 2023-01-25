
import { Field, Int, ObjectType } from "type-graphql";
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Updoots } from "./Updoots";
import { User } from "./User";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
    @Field(() => Int)
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column()
    title!: string;

    @Field()
    @Column()
    text!: string;

    @Field()
    @Column({ type: "int", default: 0 })
    points!: number;

    @OneToMany(() => Updoots, (updoots) => updoots.post)
    updoots: Updoots[]

    @Field()
    @ManyToOne(() => User, user => user.posts)
    creator: User;

    @Field()
    @Column()
    creatorId: number;

    @Field(() => Int, { nullable: true })
    voteStatus: number | null; // 1 or -1 or null

    @Field(() => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}