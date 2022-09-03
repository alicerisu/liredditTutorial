import { ChakraProvider } from '@chakra-ui/react'
import theme from '../theme'
import { AppProps } from 'next/app'
import { createClient, dedupExchange, fetchExchange, Provider } from 'urql'
import { Cache, cacheExchange, QueryInput } from '@urql/exchange-graphcache'
import { LoginMutation, LogoutMutation, MeDocument, MeQuery, RegisterMutation } from '../generated/graphql'

function betterUpdateQuery<Result, Query>(
  cache: Cache,
  qi: QueryInput,
  result: any,
  fn: (r: Result, q: Query) => Query
) {
  return cache.updateQuery(qi, data => fn(result, data as any) as any)
}

const client = createClient({
  url: 'http://localhost:4000/graphql',
  exchanges: [
    dedupExchange,
    cacheExchange({
      updates: {
        Mutation: {
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
            )
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
    fetchExchange
  ],
  fetchOptions: {
    credentials: "include"
  }
});

function MyApp({ Component, pageProps }: AppProps) {

  return (
    <Provider value={client}>
      <ChakraProvider >
        <Component {...pageProps} />
      </ChakraProvider>
    </Provider>
  )
}

export default MyApp
