import { NextRequest, NextResponse } from 'next/server'
import { CustomerLedgerService } from '@/lib/services/customer-ledger.service';
import { ApiResponse } from '@/lib/database/connection';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const id = idParam;
  const searchParams = req.nextUrl.searchParams

  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const cursorDate = searchParams.get('cursorDate') || undefined
  const cursorId = searchParams.get('cursorId') || undefined
  const searchTransactionId = searchParams.get('searchTransactionId') || undefined
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  try {
    const result = await CustomerLedgerService.getCustomerLedger({
      id,
      limit,
      cursor: cursorDate && cursorId ? { cursorDate, cursorId } : undefined,
      searchTransactionId,
      startDate,
      endDate,
    })

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Ledger entries fetched successfully',
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('❌ Ledger fetch failed:', error)

    const response: ApiResponse = {
      success: false,
      data: null,
      message: error.message || 'Internal Server Error',
      errors: [error],
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 500 })
  }
}