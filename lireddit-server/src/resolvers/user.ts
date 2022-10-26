import argon2 from 'argon2';
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { v4 } from 'uuid';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/User";
import { MyContext } from "../types";
import { sendEmail } from "../utils/sendEmails";
import { validateRegister } from "../utils/validateRegister";
import { UsernamePasswordInput } from "./UsernamePasswordInput";

const ERROR_CODE_ALREADY_EXISTS = '23505'

@ObjectType()
class FieldError {
	@Field()
	field: string

	@Field()
	message: string
}

@ObjectType()
class UserResponse {
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[]

	@Field(() => User, { nullable: true })
	user?: User
}

@Resolver()
export class UserResolver {
	@Query(() => User, { nullable: true })
	me(
		@Ctx() { req }: MyContext
	) {
		if (!req.session.userId) {
			return null
		}

		return User.findOne({ where: { id: req.session.userId } })
	}

	@Mutation(() => UserResponse)
	async changePassword(
		@Arg("newPassword") newPassword: string,
		@Arg("token") token: string,
		@Ctx() { redis, req }: MyContext
	) {
		if (newPassword.length <= 2) {
			return {
				errors: [{
					field: 'newPassword',
					message: 'length must be greater than 2'
				}]
			}
		}

		const userId = await redis.get(FORGET_PASSWORD_PREFIX + token)
		if (!userId) {
			return {
				errors: [
					{
						field: 'token',
						message: 'expired session'
					}
				]
			}
		}

		const userIdNum = parseInt(userId)

		const user = await User.findOne({ where: { id: userIdNum } })

		if (!user) {
			return {
				errors: [
					{
						field: 'token',
						message: 'user no longer exists'
					}
				]
			}
		}


		const hashedPassword = await argon2.hash(newPassword)
		user.password = hashedPassword

		User.update(
			{ id: userIdNum },
			{
				password: hashedPassword
			}
		)

		await redis.del(FORGET_PASSWORD_PREFIX + token)
		req.session.userId = user.id

		return { user }
	}

	@Mutation(() => Boolean)
	async forgotPassword(
		@Arg("email") email: string,
		@Ctx() { redis }: MyContext
	) {
		const user = await User.findOne({ where: { email } });
		if (!user) {
			return true;
		}

		const token = v4()

		redis.set(FORGET_PASSWORD_PREFIX + token, user.id, 'EX', 1000 * 60 * 60 * 24 * 3)

		await sendEmail(email, `<a href="localhost:3000/change-password/${token}"> reset password<a/>`)

		return true;
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg('options',) options: UsernamePasswordInput,
		@Ctx() { dataSource, req }: MyContext
	): Promise<UserResponse> {
		
		const errors = validateRegister(options)
		if (errors) {
			return { errors };
		}

		const hashedPassword = await argon2.hash(options.password)
		let user;

		try {
			const result = await dataSource
				.createQueryBuilder()
				.insert()
				.into(User)
				.values({
					username: options.username,
					email: options.email,
					password: hashedPassword
				})
				.returning('*')
				.execute()
			user = result.generatedMaps[0] as any
		} catch (err) {
			if (err.code === ERROR_CODE_ALREADY_EXISTS) {
				return {
					errors: [{
						field: "username",
						message: "username already taken"
					}]
				}
			}
			console.log("message: ", err)
			return {
				errors: [{
					field: "username",
					message: "username already taken"
				}]
			}
		}

		req.session.userId = user.id;

		return { user };
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg("usernameOrEmail",) usernameOrEmail: string,
		@Arg("password") password: string,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		const user = await User.findOne({
			where:
				usernameOrEmail.includes('@')
					? { email: usernameOrEmail }
					: { username: usernameOrEmail }
		})
		if (!user) {
			return {
				errors: [{
					field: 'usernameOrEmail',
					message: "that username doesn't exist"
				}]
			}
		}
		const valid = await argon2.verify(user.password, password)
		if (!valid) {
			return {
				errors: [{
					field: 'password',
					message: "password doesn't match"
				}]
			}
		}

		req.session.userId = user.id;

		return { user };
	}

	@Mutation(() => Boolean)
	logout(
		@Ctx() { req, res }: MyContext
	) {
		return new Promise(resolve => req.session.destroy(err => {
			res.clearCookie(COOKIE_NAME)
			if (err) {
				console.log(err)
				resolve(false)
				return
			}

			resolve(true)
		}))
	}

}