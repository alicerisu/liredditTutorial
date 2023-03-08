import { cacheExchange, Resolver, Cache } from "@urql/exchange-graphcache";
import { dedupExchange, Exchange, fetchExchange, stringifyVariables } from "urql";
import { pipe, tap } from 'wonka';
import {
	DeletePostMutationVariables,
	LoginMutation,
	LogoutMutation,
	MeDocument,
	MeQuery,
	PostSnippetFragment,
	RegisterMutation,
	VoteMutationVariables
} from "../generated/graphql";
import { betterUpdateQuery } from "./betterUpdateQuery";
import Router from 'next/router'
import gql from "graphql-tag";

const errorExchange: Exchange = ({ forward }) => ops$ => {
	return pipe(
		forward(ops$),
		tap(({ error }) => {
			if (error?.message.includes("not authenticated")) {
				Router.replace("/login")
			}
		})
	);
};

export const cursorPagination = (): Resolver => {
	return (_parent, fieldArgs, cache, info) => {
		const { parentKey: entityKey, fieldName } = info;
		const allFields = cache.inspectFields(entityKey);
		const fieldInfos = allFields.filter(info => info.fieldName === fieldName);
		const size = fieldInfos.length;
		if (size === 0) {
			return undefined;
		}
		const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`
		const isItInTheCache = cache.resolve(cache.resolve(entityKey, fieldKey) as string, "posts")
		info.partial = !isItInTheCache;

		const results: string[] = [];
		let hasMore = true;
		fieldInfos.forEach(fi => {
			const key = cache.resolve(entityKey, fi.fieldKey) as string
			const data = cache.resolve(key, "posts") as string[]
			const _hasMore = cache.resolve(key, "hasMore") as boolean
			if (!_hasMore) {
				hasMore = _hasMore;
			}
			results.push(...data)
		})

		return {
			__typename: "PaginatedPosts",
			hasMore,
			posts: results
		}
	};
};

const invalidateAllPosts = (cache: Cache) => {
	const allfields = cache.inspectFields("Query")
	const fieldInfos = allfields.filter(
		(info) => info.fieldName === "posts"
	)
	fieldInfos.forEach((fi) => {
		cache.invalidate('Query', 'posts', fi.arguments)
	})
}

export const createUrqlClient = (ssrExchange: any, ctx: any) => ({
	url: 'http://localhost:4000/graphql',
	fetchOptions: () => ({
		credentials: 'include',
		headers: {
			cookie: ctx?.req?.headers?.cookie,
		},
	}),
	exchanges: [
		dedupExchange,
		cacheExchange({
			keys: {
				PaginatedPosts: () => null
			},
			resolvers: {
				Query: {
					posts: cursorPagination(),
				}
			},
			updates: {
				Mutation: {
					deletePost: (_result, args, cache, info) => {
						cache.invalidate({
							__typename: 'Post',
							id: (args as DeletePostMutationVariables).id
						})
					},
					vote: (_result, args, cache, info) => {
						const { postId, value } = args as VoteMutationVariables
						const data = cache.readFragment(
							gql`
								fragment _ on Post {
									id
									points
									voteStatus
								}
							`,
							{ id: postId } as PostSnippetFragment
						);

						if (data) {
							if (data.voteStatus === value) {
								return;
							}
							const newPoints = data.points + (value * (!data.voteStatus ? 1 : 2));

							cache.writeFragment(
								gql`
									fragment __ on Post {
										points
										voteStatus
									}
								`,
								{ id: postId, points: newPoints, voteStatus: value }
							);
						}

					},
					createPost: (_result, args, cache, info) => {
						invalidateAllPosts(cache)
					},
					logout: (_result: LoginMutation, args, cache, info) => {
						betterUpdateQuery<LogoutMutation, MeQuery>(
							cache,
							{ query: MeDocument },
							_result,
							(result, query) => ({ me: null })
						)
					},
					login: (_result: LoginMutation, args, cache, info) => {
						betterUpdateQuery<LoginMutation, MeQuery>(
							cache,
							{ query: MeDocument },
							_result,
							(result, query) => {
								if (result.login.errors) {
									return query
								} else {
									return {
										me: result.login.user
									}
								}
							}
						);
						invalidateAllPosts(cache)
					},
					register: (_result: RegisterMutation, args, cache, info) => {
						betterUpdateQuery<RegisterMutation, MeQuery>(
							cache,
							{ query: MeDocument },
							_result,
							(result, query) => {
								if (result.register.errors) {
									return query
								} else {
									return {
										me: result.register.user
									}
								}
							}
						)
					}
				}
			}
		}),
		errorExchange,
		ssrExchange,
		fetchExchange
	],
})