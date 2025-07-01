import { DatabaseService } from '../database/DatabaseService';
import { logger } from '../utils/logger';
import { validateBusinessRules } from '../validations/businessValidation';
import { ServiceContext } from '../type/common';
import { ApiError } from '../type/api';
import { ProductRepository } from '../reositories/ProductRepository';
import { GetProductsResult,CreateProductRequest, GetProductsQuery, CreateProductResult  } from '../type/product';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  async createProduct(
    data: CreateProductRequest, 
    context: ServiceContext
  ): Promise<CreateProductResult> {
    const { requestId } = context;
    
    try {
      // Validate business rules
      await this.validateCreateProduct(data, context);

      // Use database transaction
      const result = await DatabaseService.executeTransaction(async (transaction) => {
        return await this.productRepository.createProduct(data, transaction, context);
      });

      // Log activity
      logger.info('Product created', {
        requestId,
        productId: result.productId,
        productName: data.name,
        variationCount: data.is_variable ? data.variations?.length : 1
      });

      return result;

    } catch (error) {
      logger.error('Product creation service error', {
        requestId,
        
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getProducts(
    query: GetProductsQuery, 
    context: ServiceContext
  ): Promise<GetProductsResult> {
    const { requestId } = context;
    
    try {
      const result = await this.productRepository.getProducts(query, context);
      
      logger.info('Products retrieved', {
        requestId,
        page: query.page,
        limit: query.limit,
        search: query.search,
        totalFound: result.pagination.total
      });

      return result;

    } catch (error) {
      logger.error('Products fetch service error', {
        requestId,
        
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async validateCreateProduct(
    data: CreateProductRequest, 
    context: ServiceContext
  ): Promise<void> {
    // Check for duplicate SKUs
    const skus = data.is_variable 
      ? data.variations?.map((v: { sku: any; }) => v.sku) || []
      : data.default_variation ? [data.default_variation.sku] : [];

    if (skus.length > 0) {
      const existingSkus = await this.productRepository.findExistingSkus(skus);
      if (existingSkus.length > 0) {
        throw new ApiError(
          `SKU(s) already exist: ${existingSkus.join(', ')}`,
          409,
          'DUPLICATE_SKU'
        );
      }
    }

    // Check for duplicate barcodes
    const barcodes: string[] = [];
    if (data.is_variable) {
      data.variations?.forEach((v) => {
        if (v.barcode) barcodes.push(v.barcode);
      });
    } else if (data.default_variation?.barcode) {
      barcodes.push(data.default_variation.barcode);
    }

    if (barcodes.length > 0) {
      const existingBarcodes = await this.productRepository.findExistingBarcodes(barcodes);
      if (existingBarcodes.length > 0) {
        throw new ApiError(
          `Barcode(s) already exist: ${existingBarcodes.join(', ')}`,
          409,
          'DUPLICATE_BARCODE'
        );
      }
    }

    // Validate foreign key references
    await this.validateReferences(data, context);

    // Apply business rules validation
    await validateBusinessRules.product(data, context);
  }

  private async validateReferences(
    data: CreateProductRequest, 
    context: ServiceContext
  ): Promise<void> {
    const validationPromises = [];

    if (data.subcategory_id) {
      validationPromises.push(
        this.productRepository.validateSubcategory(data.subcategory_id)
          .then((exists: any) => {
            if (!exists) throw new ApiError('Invalid subcategory ID', 400, 'INVALID_SUBCATEGORY');
          })
      );
    }

    if (data.brand_id) {
      validationPromises.push(
        this.productRepository.validateBrand(data.brand_id)
          .then((exists: any) => {
            if (!exists) throw new ApiError('Invalid brand ID', 400, 'INVALID_BRAND');
          })
      );
    }

    // Validate attributes
    const attributeIds = new Set<string>();
    data.attributes?.forEach((attr: { attribute_id: string; }) => attributeIds.add(attr.attribute_id));
    
    if (data.is_variable) {
      data.variations?.forEach((variation) => {
        variation.attributes?.forEach(attr => attributeIds.add(attr.attribute_id));
      });
    }

    if (attributeIds.size > 0) {
      validationPromises.push(
        this.productRepository.validateAttributes(Array.from(attributeIds))
          .then((invalidIds: any[]) => {
            if (invalidIds.length > 0) {
              throw new ApiError(
                `Invalid attribute ID(s): ${invalidIds.join(', ')}`,
                400,
                'INVALID_ATTRIBUTES'
              );
            }
          })
      );
    }

    // Validate attribute values
    const attributeValueIds = new Set<string>();
    if (data.is_variable) {
      data.variations?.forEach((variation) => {
        variation.attributes?.forEach(attr => attributeValueIds.add(attr.attribute_value_id));
      });
    }

    if (attributeValueIds.size > 0) {
      validationPromises.push(
        this.productRepository.validateAttributeValues(Array.from(attributeValueIds))
          .then((invalidIds: any[]) => {
            if (invalidIds.length > 0) {
              throw new ApiError(
                `Invalid attribute value ID(s): ${invalidIds.join(', ')}`,
                400,
                'INVALID_ATTRIBUTE_VALUES'
              );
            }
          })
      );
    }

    await Promise.all(validationPromises);
  }
}
