import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

// ========== Types ==========
export interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message: string
  errors?: any[] | null
  timestamp: string
}

// ========== Pool Setup ==========
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 2000
let pool: Pool

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:janath@localhost:5432/phone?schema=public"
const fallbackConnectionString = process.env.DATABASE_URL_FALLBACK

async function createPool(): Promise<Pool> {
  return new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })
}

// ========== Pool Initialization ==========
async function initializePool(retries = MAX_RETRIES): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = await createPool()
      const client = await pool.connect()
      await client.query('SELECT 1')
      client.release()

      console.log('✅ Connected to PostgreSQL database')

      pool.on('error', async (err: Error) => {
        console.error('🔥 Pool error. Attempting reconnect...', err)
        await reconnectPool()
      })

      return
    } catch (err) {
      console.error(`❌ Connection attempt ${attempt} failed:`, err)

      if (attempt === retries && fallbackConnectionString) {
        console.warn('⚠️ Trying fallback connection string...')
        pool = new Pool({ connectionString: fallbackConnectionString })
        return
      }

      if (attempt < retries) {
        console.log(`⏳ Retrying in ${RETRY_DELAY_MS}ms...`)
        await new Promise(res => setTimeout(res, RETRY_DELAY_MS))
      } else {
        console.error('❌ Could not connect to PostgreSQL after retries.')
        process.exit(1)
      }
    }
  }
}

async function reconnectPool(): Promise<void> {
  console.warn('♻️ Reinitializing pool due to failure...')
  if (pool) {
    try {
      await pool.end()
    } catch (err) {
      console.warn('⚠️ Error closing old pool:', err)
    }
  }
  await initializePool()
}

// ========== Query ==========
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
  queryTimeout = 5000
): Promise<QueryResult<T>> {
  const start = Date.now()
  let client: PoolClient |undefined

  try {
    client = await pool.connect()
    const res = await client.query<T>({
      text,
      values: params,
      statement_timeout: queryTimeout,
    } as any)
    const duration = Date.now() - start
    console.log('✅ Executed query', { text, duration, rows: res.rowCount })
    return res
  } catch (error: any) {
    console.error('❌ Database query error:', error)

    if (error.code === '57P01' || error.message.includes('terminating connection')) {
      await reconnectPool()
    }

    throw error
  } finally {
    client?.release?.()
  }
}

// ========== Transaction ==========
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// ========== Initialize DB ==========
let initialized = false

export async function initDatabase(): Promise<void> {
  if (!initialized) {
    await initializePool()
    initialized = true
  }
}
