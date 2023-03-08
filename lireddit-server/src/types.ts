import { Request, Response } from "express"
import RedisClient from "ioredis"
import { DataSource } from "typeorm"
import { createUpdootLoader } from "./utils/createUpdootLoader"
import { createUserLoader } from "./utils/createUserLoader"

export type MyContext = {
    req: Request,
    res: Response,
    redis: RedisClient,
    dataSource: DataSource,
    userLoader: ReturnType<typeof createUserLoader>,
    updootLoader: ReturnType<typeof createUpdootLoader>
} 