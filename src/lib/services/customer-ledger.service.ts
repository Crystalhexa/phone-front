import { createId } from "@paralleldrive/cuid2";
import { PoolClient } from "pg";
function generateCuid(): string {
  return createId()
}
export class CustomerLedgerService {
  
  static async createCustomerLedger(
    client: PoolClient,
    transaction_id: string,
    transaction_type: string,
    customer_id: string,
    reference_number?: string|null,
    description?: string|null,
    debit_amount?: number|null,
    credit_amount?: number|null 
  ):Promise<{previousBalance:number|undefined}> {
    
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

    const  updateCustomerBalanceQuery = `
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

    return {previousBalance};
  }
}
