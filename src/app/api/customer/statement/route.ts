import { query } from "@/lib/database/connection";
import { ApiResponse } from "@/types/customer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const customer_id = url.searchParams.get('customer_id');
        const limit = Number(url.searchParams.get('limit') || '50');
        const page = Number(url.searchParams.get('page') || '1');
        const dateFrom = url.searchParams.get('date_from');
        const dateTo = url.searchParams.get('date_to');

        if (!customer_id) {
            return new NextResponse('Bad Request: Missing customer_id', { status: 400 });
        }
        if (isNaN(limit) || limit <= 0 || limit > 500) {
            return new NextResponse('Bad Request: Invalid limit', { status: 400 });
        }
        if (isNaN(page) || page < 0) {
            return new NextResponse('Bad Request: Invalid offset', { status: 400 });
        }

        const offset = (page-1)*limit;

        const [ledgerResult, customerResult] = await Promise.all([
            query(
                `SELECT *
                FROM customer_ledger
                WHERE customer_id=$1
                ORDER by transaction_date DESC
                LIMIT $2 OFFSET $3`,
                [customer_id, limit, offset]
            ),
            query(
                `SELECT *
                FROM customers
                WHERE id = $1
                LIMIT 1`,
                [customer_id]
            )
        ]);

        const countQuery = `SELECT COUNT(*) FROM customer_ledger WHERE customer_id=$1`;
        let countResult = await query(countQuery,[customer_id]);
        console.log(countResult.rows);
        const total = parseInt(countResult.rows[0].count);
        const totalPage = Math.ceil(total/limit)
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
            errors: [{message: error.message}],
            timestamp: new Date().toISOString()
        },{status: 500});
    }
}