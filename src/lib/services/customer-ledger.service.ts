import { createId } from "@paralleldrive/cuid2";
import { PoolClient } from "pg";
import { query } from "../database/connection";
function generateCuid(): string {
  return createId()
}
interface LedgerCursor {
  cursorDate: string
  cursorId: string
}

interface GetLedgerOptions {
  id: string
  limit?: number
  cursor?: LedgerCursor
  searchTransactionId?: string
  startDate?: string
  endDate?: string
}
export class CustomerLedgerService {

  static async createCustomerLedger(
    client: PoolClient,
    transaction_id: string,
    transaction_type: string,
    customer_id: string,
    reference_number?: string | null,
    description?: string | null,
    debit_amount?: number | null,
    credit_amount?: number | null
  ): Promise<{ previousBalance: number | undefined }> {

    // Step 1: Fetch latest running balance for this customer
    const lastBalanceQuery = `
      SELECT running_balance 
      FROM customers 
      WHERE id = $1
      LIMIT 1
    `;

    const lastBalanceResult = await client.query(lastBalanceQuery, [customer_id]);
    let previousBalance = 0;

    if (lastBalanceResult.rows.length > 0) {
      previousBalance = parseFloat(lastBalanceResult.rows[0].running_balance);
    }

    // Step 2: Calculate new running balance
    const debit = debit_amount ?? 0;
    const credit = credit_amount ?? 0;
    const newBalance = previousBalance + debit - credit;

    // Step 3: Insert new ledger entry

    const updateCustomerBalanceQuery = `
      UPDATE customers 
      SET running_balance = $1
      WHERE id = $2
    `;

    await client.query(updateCustomerBalanceQuery, [newBalance, customer_id]);

    const customerLedgerId = generateCuid();
    const insertQuery = `
      INSERT INTO customer_ledger (
        id,
        customer_id, 
        transaction_id, 
        transaction_type, 
        reference_number, 
        description, 
        debit_amount, 
        credit_amount, 
        running_balance, 
        transaction_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9, NOW())
      RETURNING *
    `;

    const values = [
      customerLedgerId,
      customer_id,
      transaction_id,
      transaction_type,
      reference_number,
      description,
      debit || null,
      credit || null,
      newBalance,
    ];

    const result = await client.query(insertQuery, values);

    return { previousBalance };
  }

  static async getCustomerLedger({
    id,
    limit = 10,
    cursor,
    searchTransactionId,
    startDate,
    endDate
  }: GetLedgerOptions) {
    const params: any[] = [id]
    let where = `WHERE customer_id = $1`

    // Transaction ID filter
    if (searchTransactionId) {
      params.push(`%${searchTransactionId}%`)
      where += ` AND transaction_id ILIKE $${params.length}`
    }

    // Date range filter
    if (startDate && endDate) {
      params.push(startDate, endDate)
      where += ` AND transaction_date BETWEEN $${params.length - 1} AND $${params.length}`
    }

    // Cursor (transaction_date + id for stable ordering)
    if (cursor) {
      params.push(cursor.cursorDate, cursor.cursorId)
      where += ` AND (transaction_date, id) < ($${params.length - 1}, $${params.length})`
    }

    // Limit (+1 to check next page)
    params.push(limit + 1)

    const sql = `
    SELECT *
    FROM customer_ledger
    ${where}
    ORDER BY transaction_date DESC, id DESC
    LIMIT $${params.length};
  `

    const result = await query(sql, params)

    let nextCursor: LedgerCursor | null = null
    const rows = result.rows

    if (rows.length > limit) {
      const last = rows[limit - 1]
      nextCursor = {
        cursorDate: last.transaction_date,
        cursorId: last.id
      }
      rows.pop() // remove the extra record
    }

    return {
      data: rows,
      nextCursor,
      hasNextPage: !!nextCursor
    }

  }
}
