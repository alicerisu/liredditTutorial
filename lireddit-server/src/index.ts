import "reflect-metadata"
import { COOKIE_NAME, __prod__ } from "./constants";
import express from 'express';
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import session from "express-session";
import connectRedis from 'connect-redis'
import { MyContext } from "./types";
import cors from 'cors'
import Redis from 'ioredis'
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";

const main = async () => {
    const dataSource = await new DataSource({
        type: 'postgres',
        database: 'lireddit2',
        username: 'postgres',
        password: 'admin',
        logging: true,
        synchronize: true,
        entities: [Post,User]
    })
    await dataSource.initialize()
    const app = express()

    const RedisStore = connectRedis(session)
    const redis = new Redis()

    app.use(cors({
        origin: ["https://studio.apollographql.com","http://localhost:4000/graphql", "http://localhost:3000"],
        credentials: true
    }))

    app.use(
        session({
            name: COOKIE_NAME,
            store: new RedisStore(
                {
                    client: redis,
                    disableTouch: true,
                })
            ,
            cookie: {
                maxAge: 1000 * 60 * 24 * 365 * 10,
                httpOnly: false,
                sameSite: 'none',
                secure: __prod__
            },
            saveUninitialized: false,
            secret: "ytgftfrdeewsawa",
            resave: false
        })
    )

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
        context: ({ req, res }): MyContext => ({ req, res, redis, dataSource }),
    })

    await apolloServer.start()

    apolloServer.applyMiddleware({
        app,
        cors: false
    })

    app.listen(4000, () => console.log('server started on localhost:4000'))
}

main().catch(err => {
    console.error(err)
});