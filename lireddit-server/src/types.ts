import { Request, Response } from "express"
import RedisClient from "ioredis"
import { DataSource } from "typeorm"

export type MyContext = {
    req: Request,
    res: Response,
    redis: RedisClient,
    dataSource: DataSource
} 