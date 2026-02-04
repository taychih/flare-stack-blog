// src/features/logbook/logbook.server.ts
import { getEvent } from 'vinxi/http'

/**
 * 安全地在服务器端获取 D1 数据库实例
 */
export const getDB = () => {
  const { context } = getEvent()
  const db = context.cloudflare.env.DB as D1Database
  if (!db) throw new Error("Database binding 'DB' not found")
  return db
}