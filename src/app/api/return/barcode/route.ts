import { CartService } from "@/lib/services/cart.services";
import { AuthenticatedRequest, withPermission } from "@/middleware/auth";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const scanRequestSchema = z.object({
    barcode: z.string().min(1, 'Barcode is required').trim()
})
export async function POST(request: NextRequest){
    return withPermission('create_product')(async(authedReq: AuthenticatedRequest)=>{
        try {
           const body = await request.json();
           const validation = scanRequestSchema.safeParse(body);
           const   {user: userDetails} = authedReq.user;
              if(!validation.success){
                return NextResponse.json({
                    success: false,
                    data: null,
                    error: validation.error.errors.map(e => e.message).join(', ')
                }, {status: 400})
              }
              const { barcode } = validation.data;

              let ScannedProduct = await CartService.handleIndividualItemScan(barcode,userDetails.branch_id);
              return NextResponse.json({
                success: true,
                data: {
                    scannedProduct: ScannedProduct
                },
                error: null
              }, {status: 200})
        } catch (error) {
            return NextResponse.json({
                success: false,
                data: null,
                error: 'Internal Server Error'
            }, {status: 500})
        }
    })(request)
}