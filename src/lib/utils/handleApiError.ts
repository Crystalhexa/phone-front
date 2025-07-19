import { NextResponse } from "next/server"
import { AppError } from "./AppError"

function handleApiError(error: any): NextResponse {
  // Custom application-level errors
  if (error instanceof AppError) {
    return NextResponse.json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: error.statusCode })
  }

  // Zod validation errors
  if (error?.name === 'ZodError') {
    return NextResponse.json({
      success: false,
      message: 'Validation failed',
      errors: error.errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message
      })),
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }

  // Unknown / unexpected error
  console.error('Unexpected error:', error)

  return NextResponse.json({
    success: false,
    message: 'Unexpected server error',
    timestamp: new Date().toISOString()
  }, { status: 500 })
}
