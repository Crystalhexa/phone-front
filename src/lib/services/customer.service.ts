import { Customer } from "@/types/customer";
import { PoolClient } from "pg";


export class CustomerService {

    static async getCustomerById(
        client: PoolClient,
        customer_id: string
    ): Promise<Customer>{

        const customerQuery = `
            SELECT * 
            FROM customers 
            WHERE id = $1
            LIMIT 1
        `;

        const customerResult = await client.query(customerQuery,[customer_id]);

        if(customerResult.rows.length ===0 ){
            throw new Error('Customer not found');
        }
        return customerResult.rows[0];
        
    }

}