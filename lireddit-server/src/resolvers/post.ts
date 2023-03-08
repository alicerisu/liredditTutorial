import { isAuth } from "../middleware/isAuth";
import { MyContext } from "src/types";
import { Arg, Ctx, Field, FieldResolver, Info, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { Post } from "../entities/Post";
import { Db, getConnection } from "typeorm";
import { Updoots } from "../entities/Updoots";
import { User } from "../entities/User";

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

	@FieldResolver(() => User)
	creator(
		@Root() post: Post,
		@Ctx() { userLoader }: MyContext
	) {
		return userLoader.load(post.creatorId)
	}

	@FieldResolver(() => User)
	async voteStatus(
		@Root() post: Post,
		@Ctx() { updootLoader, req }: MyContext
	) {
		if (!req.session.userId) {
			return null
		}

		const updoot = await updootLoader.load({ postId: post.id, userId: req.session.userId })

		return updoot ? updoot.value : null;
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

		const updoot = await Updoots.findOne({ where: { postId, userId } })

		if (updoot && updoot.value !== realValue) {
			await dataSource.transaction(async (tm) => {
				await tm.query(`
					update updoots
					set value = ${realValue}
					where "postId" = ${postId} and "userId" = ${userId}
				`)

				await tm.query(
					`update post p
					set points = p.points + ${2 * realValue}
					where p.id = ${postId};`
				)
			})

		} else if (!updoot) {
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
			replacemets.push(new Date(parseInt(cursor)))
		}

		const posts = await dataSource.query(`
			select p.*
			from public.post p
			${cursor ? `where p."createdAt" < $2` : ''}
			order by p."createdAt" DESC
			limit $1
		`, replacemets)


		return { posts: posts.slice(0, realLimit), hasMore: posts.length === realLimitPlusOne };
	}

	@Query(() => Post, { nullable: true })
	post(@Arg('id', () => Int) id: number): Promise<Post | null> {
		return Post.findOne({
			where: {
				id
			}
		});
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
	@UseMiddleware(isAuth)
	async updatePost(
		@Arg('id', () => Int) id: number,
		@Arg('title', () => String, { nullable: true }) title: string,
		@Arg('text', () => String, { nullable: true }) text: string,
		@Ctx() { req, dataSource }: MyContext
	): Promise<Post | null> {
		const post =
			await dataSource
				.createQueryBuilder()
				.update(Post)
				.set({
					title,
					text
				})
				.where('id = :id and "creatorId" = :creatorId', { id, creatorId: req.session.userId })
				.returning("*")
				.execute()

		return post.raw[0]
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async deletePost(
		@Arg('id', () => Int) id: number,
		@Ctx() { req }: MyContext
	): Promise<boolean> {
		const post = await Post.findOne({ where: { id } })

		if (!post) {
			return false
		}

		if (post.creatorId !== req.session.userId) {
			throw new Error('not authorized')
		}

		await Updoots.delete({ postId: id })
		await Post.delete({ id })
		return true
	}
}