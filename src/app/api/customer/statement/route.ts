import { query } from "@/lib/database/connection";
import { ApiResponse } from "@/types/customer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const customer_id = url.searchParams.get('customer_id');
        const limit = Number(url.searchParams.get('limit') || '10');
        const page = Number(url.searchParams.get('page') || '1');
        const dateFrom = url.searchParams.get('start_date');
        const dateTo = url.searchParams.get('end_date');

        let whereConditions = ['1=1'];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (!customer_id) {
            return new NextResponse('Bad Request: Missing customer_id', { status: 400 });
        }
        if (isNaN(limit) || limit <= 0 || limit > 500) {
            return new NextResponse('Bad Request: Invalid limit', { status: 400 });
        }
        if (isNaN(page) || page < 0) {
            return new NextResponse('Bad Request: Invalid offset', { status: 400 });
        }
        if (customer_id) {
            console.log("customer_id", customer_id)
            whereConditions.push(`customer_id = $${paramIndex}`);
            queryParams.push(customer_id);
            paramIndex++;
        }
                    console.log("dateFrom, dateTo", dateFrom, dateTo)

        if (dateFrom && dateTo) {
            whereConditions.push(`transaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            queryParams.push(dateFrom, dateTo);
            paramIndex += 2;
        }
        const offset = (page - 1) * limit;
        const whereClause = whereConditions.join(' AND ');

        const ledgerQuery = `
            SELECT
            transaction_id as transaction_number,
            transaction_type,
            description,
            debit_amount as debit,
            credit_amount as credit,
            running_balance as balance,
            transaction_date as date
            FROM customer_ledger
            WHERE ${whereClause}
            ORDER by transaction_date DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const customerQuery = `SELECT id, customer_number, name, email, phone, nic, address, date_of_birth, credit_limit, running_balance, loyalty_points, is_active, created_at, updated_at FROM customers WHERE id=$1`;
        queryParams.push(limit, offset);
        const ledgerResult = await query(ledgerQuery, queryParams);
        const customerResult = await query(customerQuery,[customer_id])

        const countQuery = `SELECT COUNT(*) FROM customer_ledger WHERE customer_id=$1`;
        let countResult = await query(countQuery, [customer_id]);
        const total = parseInt(countResult.rows[0].count);
        const totalPage = Math.ceil(total / limit)
        return NextResponse.json({
            customer: customerResult.rows[0] ?? null,
            ledger: ledgerResult.rows,
            pagination: {
                current_page: page,
                total_pages: totalPage,
                total_items: total,
                items_per_page: limit,
                has_next_page: page < totalPage,
                has_prev_page: page > 1
            },
        });
    } catch (error: any) {
        return NextResponse.json<ApiResponse>({
            success: false,
            data: null,
            message: "Failed to retrive customer ledger",
            errors: [{ message: error.message }],
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}