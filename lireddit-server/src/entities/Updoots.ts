
import { Field, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class Updoots extends BaseEntity {
	@Field()
	@Column({type: "int"})
	value: number;

	@Field()
	@PrimaryColumn()
	userId: number;

	@Field(() => User)
	@ManyToOne(() => User, (user) => user.updoots)
	user: User;

	@Field(() => Post)
	@ManyToOne(() => Post, post => post.updoots, {
		onDelete: 'CASCADE'
	})
	post: Post;

	@Field()
	@PrimaryColumn()
	postId: number;
}