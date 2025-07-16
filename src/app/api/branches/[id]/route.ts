// ---- Handler: Get, Update, Delete by ID ----
// File: app/api/branches/handlers/[id].ts
import { ApiResponse, initDatabase, query } from '@/lib/database/connection'
import { NextRequest, NextResponse } from 'next/server'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDatabase();
  const { id: idParam } = await params;
  const id = idParam;
  const timestamp = new Date().toISOString()
  try {
    const { rows } = await query('SELECT * FROM branches WHERE id = $1', [id])
    if (!rows[0]) return NextResponse.json<ApiResponse>({ success: false, data: null, message: 'Branch not found', timestamp }, { status: 404 })
    return NextResponse.json<ApiResponse>({ success: true, data: rows[0], message: 'Branch fetched', timestamp })
  } catch (err: any) {
    return NextResponse.json<ApiResponse>({ success: false, data: null, message: 'Error fetching branch', errors: [err.message], timestamp }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    await initDatabase();

      const { id: idParam } = await params;
  const id = idParam;
  const json = await req.json()
  const timestamp = new Date().toISOString()
  try {
    const keys = Object.keys(json)
    const values = Object.values(json)
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')
    const queryText = `UPDATE branches SET ${setClause}, updated_at = now() WHERE id = $${keys.length + 1} RETURNING *`

    const { rows } = await query(queryText, [...values, id])
    if (!rows[0]) return NextResponse.json<ApiResponse>({ success: false, data: null, message: 'Branch not found', timestamp }, { status: 404 })
    return NextResponse.json<ApiResponse>({ success: true, data: rows[0], message: 'Branch updated', timestamp })
  } catch (err: any) {
    return NextResponse.json<ApiResponse>({ success: false, data: null, message: 'Failed to update', errors: [err.message], timestamp }, { status: 500 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    await initDatabase();
      const { id: idParam } = await params;
  const id = idParam;
  const timestamp = new Date().toISOString()
  try {
    const { rowCount } = await query('DELETE FROM branches WHERE id = $1', [id])
    if (!rowCount) return NextResponse.json<ApiResponse>({ success: false, data: null, message: 'Branch not found', timestamp }, { status: 404 })
    return NextResponse.json<ApiResponse>({ success: true, data: null, message: 'Branch deleted', timestamp })
  } catch (err: any) {
    return NextResponse.json<ApiResponse>({ success: false, data: null, message: 'Failed to delete', errors: [err.message], timestamp }, { status: 500 })
  }
}
