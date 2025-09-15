import { initDatabase, transaction } from '@/lib/database/connection';
import { OrderService } from '@/lib/services/order.service';
import { ValidationService } from '@/lib/services/validation.service';
import { AuthenticatedRequest, withPermission } from '@/middleware/auth'
import { ApiResponse } from '@/types/customer';
import { changeOrderstatuSchema } from '@/validation/order.schemas';
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
    return withPermission('create_product')(async (authedReq: AuthenticatedRequest) => {
        try {
            await initDatabase();

            const { user: userDetails } = authedReq.user;
            const body = await authedReq.json();

            const validationResult = changeOrderstatuSchema.safeParse(body);

            if (!validationResult.success) {
                const errors = validationResult.error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }))
                return NextResponse.json<ApiResponse>({
                    success: false,
                    data: null,
                    message: 'validation failed',
                    errors,
                    timestamp: new Date().toISOString()
                },{status:400})
            }
            const {customer_id, order_id} = validationResult.data;

            const preValidation = await transaction(async (client)=>{
                return ValidationService.validateCustomerAndOrderById(customer_id,order_id);
            })
            if(!preValidation.isValid){
                return NextResponse.json<ApiResponse>({
                    success: false,
                    data: null,
                    message: "validation failed",
                    errors: preValidation.errors.map(error => ({message: error})),
                    timestamp: new Date().toISOString()
                },{status:400})
            }            

            await OrderService.changeOrderStatus( order_id, 'ON_ACCOUNT');
            
            return NextResponse.json<ApiResponse>({
                success: true,
                data:  null,
                message: 'Order added to account successfully',
                errors: [],
                timestamp: new Date().toISOString()
            },{status:200});

            
        } catch (error: any) {

            return NextResponse.json({
                success:false,
                data:null,
                message: error.message || 'Internal Server Error',
                errors: [{message: error.message || 'Internal Server Error'}],
                timestamp: new Date().toISOString()
            },{status:500})
        }

    })(request)
}
