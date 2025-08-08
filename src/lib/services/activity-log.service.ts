import { createId } from '@paralleldrive/cuid2'
import { PoolClient } from 'pg'
function generateCuid(): string {
  return createId()
}
export class ActivityLogService {
  static async createActivityLog(
    client: PoolClient,
    userId: string,
    action: string,
    entityId: string,
    metadata: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const logId = generateCuid()

    await client.query(`
      INSERT INTO user_activity_logs (
        id, user_id, action, entity, entity_id, ip_address, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      logId,
      userId,
      action,
      'sales_orders',
      entityId,
      ipAddress || null,
      userAgent || null,
      JSON.stringify(metadata)
    ])
  }
}