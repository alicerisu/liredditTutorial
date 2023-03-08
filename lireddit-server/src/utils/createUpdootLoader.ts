import DataLoader from "dataloader";
import { Updoots } from "../entities/Updoots";
import { In } from "typeorm";
import { User } from "../entities/User";

export const createUpdootLoader = () => new DataLoader<{ postId: number, userId: number }, Updoots>(
	async (keys) => {
		const updoots = await Updoots.findBy(keys as any)
		const updootIdsToUpdoot: Record<string, Updoots> = {}
		updoots.forEach(updoot => {
			updootIdsToUpdoot[`${updoot.userId}|${updoot.postId}`] = updoot
		})

		return keys.map(key => updootIdsToUpdoot[`${key.userId}|${key.postId}`])
	})