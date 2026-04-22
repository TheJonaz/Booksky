import { getDb } from '@booksky/db';
import { env } from '$env/dynamic/private';

export const db = getDb(env.DATABASE_URL);
