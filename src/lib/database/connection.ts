import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

// ========== Types ==========
export interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message: string
  errors?: any[] | null
  timestamp: string
}

export interface QueryOptions {
  timeout?: number
  retries?: number
  logQuery?: boolean
}

export interface ConnectionMetrics {
  totalConnections: number
  idleConnections: number
  waitingCount: number
}

// ========== Environment Validation ==========
function validateEnvironment(): void {
  const required = ['DATABASE_URL']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  // Validate connection string format
  const dbUrl = process.env.DATABASE_URL!
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string')
  }
}

// ========== Circuit Breaker ==========
class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 30000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'CLOSED'
  }
  
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
  
  getState(): string {
    return this.state
  }
}

// ========== Pool Configuration ==========
function getPoolConfig() {
  return {
    connectionString: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
    application_name: process.env.APP_NAME || 'nextjs-app',
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  }
}

// ========== Global Pool Management ==========
let pool: Pool | null = null
const circuitBreaker = new CircuitBreaker()

// For Next.js hot reloading in development
declare global {
  var __db_pool: Pool | undefined
}

function createPool(): Pool {
  validateEnvironment()
  
  const config = getPoolConfig()
  const newPool = new Pool(config)
  
  // Pool event handlers
  newPool.on('connect', (client) => {
    console.log('🔗 New database client connected')
    
    // Set up client-level error handling
    client.on('error', (err) => {
      console.error('🔥 Database client error:', err)
    })
  })
  
  newPool.on('acquire', () => {
    console.log('📤 Client acquired from pool')
  })
  
  newPool.on('remove', () => {
    console.log('📥 Client removed from pool')
  })
  
  newPool.on('error', async (err) => {
    console.error('🔥 Pool error:', err)
    await handlePoolError(err)
  })
  
  return newPool
}

function getPool(): Pool {
  if (process.env.NODE_ENV === 'development') {
    if (!global.__db_pool) {
      global.__db_pool = createPool()
    }
    return global.__db_pool
  }
  
  if (!pool) {
    pool = createPool()
  }
  
  return pool
}

// ========== Error Handling ==========
async function handlePoolError(error: Error): Promise<void> {
  console.error('🚨 Handling pool error:', error.message)
  
  // Critical errors that require pool recreation
  const criticalErrors = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'connection terminated unexpectedly'
  ]
  
  const isCritical = criticalErrors.some(errType => 
    error.message.includes(errType) || error.name === errType
  )
  
  if (isCritical) {
    console.warn('♻️ Critical error detected, recreating pool...')
    await recreatePool()
  }
}

async function recreatePool(): Promise<void> {
  try {
    if (pool) {
      console.log('🔚 Ending existing pool...')
      await pool.end()
      pool = null
    }
    
    console.log('🔄 Creating new pool...')
    pool = createPool()
    
    // Test the new pool
    await healthCheck()
    console.log('✅ Pool recreated successfully')
  } catch (error) {
    console.error('❌ Failed to recreate pool:', error)
    throw error
  }
}

// ========== Query Execution ==========
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const {
    timeout = 30000,
    retries = 3,
    logQuery = process.env.LOG_QUERIES === 'true'
  } = options
  
  return await circuitBreaker.execute(async () => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const start = Date.now()
      let client: PoolClient | undefined
      
      try {
        const currentPool = getPool()
        
        // Acquire client with timeout
        client = await Promise.race([
          currentPool.connect(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Connection acquire timeout')), timeout)
          )
        ])
        
        // Execute query with timeout
        const result = await Promise.race([
          client.query<T>(text, params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Query execution timeout')), timeout)
          )
        ])
        
        const duration = Date.now() - start
        
        if (logQuery) {
          console.log('✅ Query executed successfully', {
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            duration,
            rows: result.rowCount,
            attempt
          })
        }
        
        return result
      } catch (error: any) {
        const duration = Date.now() - start
        
        console.error(`❌ Query attempt ${attempt} failed:`, {
          error: error.message,
          code: error.code,
          duration,
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          params: params?.length || 0
        })
        
        // Handle specific PostgreSQL errors
        if (error.code === '57P01' || error.message.includes('terminating connection')) {
          await recreatePool()
        }
        
        if (attempt === retries) {
          throw new Error(`Query failed after ${retries} attempts: ${error.message}`)
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      } finally {
        if (client) {
          try {
            client.release()
          } catch (releaseError) {
            console.warn('⚠️ Error releasing client:', releaseError)
          }
        }
      }
    }
    
    throw new Error('All query attempts failed')
  })
}

// ========== Transaction Support ==========
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const { timeout = 60000 } = options
  
  return await circuitBreaker.execute(async () => {
    let client: PoolClient | undefined
    
    try {
      const currentPool = getPool()
      client = await currentPool.connect()
      
      await client.query('BEGIN')
      
      const result = await Promise.race([
        callback(client),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timeout')), timeout)
        )
      ])
      
      await client.query('COMMIT')
      console.log('✅ Transaction committed successfully')
      
      return result
    } catch (error: any) {
      if (client) {
        try {
          await client.query('ROLLBACK')
          console.log('🔄 Transaction rolled back')
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError)
        }
      }
      
      console.error('❌ Transaction failed:', error.message)
      throw error
    } finally {
      if (client) {
        try {
          client.release()
        } catch (releaseError) {
          console.warn('⚠️ Error releasing transaction client:', releaseError)
        }
      }
    }
  })
}

// ========== Health Check ==========
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health', [], { 
      timeout: 5000, 
      retries: 1,
      logQuery: false 
    })
    return result.rows[0]?.health === 1
  } catch (error) {
    console.error('❌ Health check failed:', error)
    return false
  }
}
// ========== Initialization ==========
let initialized = false

export async function initDatabase(): Promise<void> {
  if (initialized) {
    return
  }
  
  try {
    console.log('🚀 Initializing database connection...')
    
    validateEnvironment()
    const currentPool = getPool()
    
    // Test connection
    const isHealthy = await healthCheck()
    if (!isHealthy) {
      throw new Error('Database health check failed')
    }
    
    console.log('✅ Database initialized successfully')
    console.log('📊 Pool configuration:', {
      max: currentPool.options.max,
      min: currentPool.options.min || 0,
      idleTimeout: currentPool.options.idleTimeoutMillis,
      connectionTimeout: currentPool.options.connectionTimeoutMillis
    })
    
    initialized = true
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

// ========== Graceful Shutdown ==========
export async function closeDatabase(): Promise<void> {
  console.log('🔚 Closing database connections...')
  
  try {
    if (pool) {
      await pool.end()
      pool = null
    }
    
    if (global.__db_pool) {
      await global.__db_pool.end()
      global.__db_pool = undefined
    }
    
    console.log('✅ Database connections closed successfully')
  } catch (error) {
    console.error('❌ Error closing database connections:', error)
    throw error
  }
}

// ========== Process Event Handlers ==========
if (typeof process !== 'undefined') {
  const gracefulShutdown = async (signal: string) => {
    console.log(`📡 Received ${signal}, shutting down gracefully...`)
    
    try {
      await closeDatabase()
      console.log('✅ Graceful shutdown completed')
      process.exit(0)
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error)
      process.exit(1)
    }
  }
  
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught exception:', error)
    gracefulShutdown('uncaughtException')
  })
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled rejection at:', promise, 'reason:', reason)
    gracefulShutdown('unhandledRejection')
  })
}

// ========== Development Helpers ==========
if (process.env.NODE_ENV === 'development') {
  initDatabase().catch(console.error)
}

// ========== Exports ==========
export {
  getPool,
  recreatePool
}