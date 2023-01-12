import { isAuth } from "../middleware/isAuth";
import { MyContext } from "src/types";
import { Arg, Ctx, Field, FieldResolver, Info, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { Post } from "../entities/Post";
import { Db } from "typeorm";
import { Updoots } from "../entities/Updoots";

@InputType()
class PostInput {
	@Field()
	title: string;
	@Field()
	text: string;
}

@ObjectType()
class PaginatedPosts {
	@Field(() => [Post])
	posts: Post[]
	@Field()
	hasMore: boolean
}

@Resolver(Post)
export class PostResolver {
	@FieldResolver(() => String)
	textSnippet(
		@Root() root: Post
	) {
		return root.text.slice(0, 50) + "..."
	}

	@Mutation(() => Boolean)
	@UseMiddleware([isAuth])
	async vote(
		@Arg('postId', () => Int) postId: number,
		@Arg('value', () => Int) value: number,
		@Ctx() { req, dataSource }: MyContext
	) {
		const isUpdoot = value !== -1;
		const { userId } = req.session;
		const realValue = isUpdoot ? 1 : -1;
		try {
			await dataSource.transaction(async (tm) => {
				await tm.query(
					`insert into updoots ("userId", "postId", value)
					values (${userId}, ${postId}, ${realValue});`
				)

				await tm.query(
					`update post p
					set points = p.points + ${realValue}
					where p.id = ${postId};`
				)
			
			})
		} catch (error) {
			console.log(error)
			return false;
		}
		return true;
	}

	@Query(() => PaginatedPosts)
	async posts(
		@Arg('limit', () => Int) limit: number,
		@Arg('cursor', () => String, { nullable: true }) cursor: string,
		@Ctx() { dataSource }: MyContext
	): Promise<PaginatedPosts> {
		const realLimit = Math.min(50, limit)
		const realLimitPlusOne = realLimit + 1

		const replacemets: any[] = [realLimitPlusOne]

		if (cursor) {
			replacemets.push(new Date(parseInt(cursor)));
		}

		const posts = await dataSource.query(`
			select p.*,
			json_build_object(
				'id', u.id,
				'username', u.username,
				'email', u.email,
				'createdAt', u."createdAt",
				'updatedAt', u."updatedAt"
				) creator
			from public.post p
			inner join public.user u on u.id = p."creatorId"
			${cursor ? `where p."createdAt" < $2` : ''}
			order by p."createdAt" DESC
			limit $1
		`, replacemets)


		return { posts: posts.slice(0, realLimit), hasMore: posts.length === realLimitPlusOne };
	}

	@Query(() => Post, { nullable: true })
	post(@Arg('id') id: number): Promise<Post | null> {
		return Post.findOne({ where: { id } });

	}

	@Mutation(() => Post)
	@UseMiddleware(isAuth)
	async createPost(
		@Arg('input') input: PostInput,
		@Ctx() { req }: MyContext
	): Promise<Post> {
		return Post.create({
			...input,
			creatorId: req.session.userId
		}).save();
	}

	@Mutation(() => Post, { nullable: true })
	async updatePost(
		@Arg('id') id: number,
		@Arg('title', () => String, { nullable: true }) title: string
	): Promise<Post | null> {
		const post = await Post.findOne({ where: { id } })
		if (!post) {
			return null
		}

		if (title !== undefined) {
			post.title = title;
			await Post.update({ id, }, { title })
		}
		return post;
	}

	@Mutation(() => Boolean)
	async deletePost(
		@Arg('id') id: number
	): Promise<boolean> {
		await Post.delete({ id })
		return true;
	}
}