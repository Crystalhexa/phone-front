import { DatabaseConnection, ServiceContext } from '@/lib/type/common';
import { logger } from '@/lib/utils/logger';
import { DatabaseService } from '../database/DatabaseService';
import cuid from 'cuid';
import { CreateProductResult,CreateProductRequest, GetProductsQuery,  GetProductsResult  } from '../type/product';

export class ProductRepository {
  async createProduct(
    data: CreateProductRequest,
    transaction: DatabaseConnection,
    context: ServiceContext
  ): Promise<CreateProductResult> {
    const productId = cuid();
    const { requestId } = context;

    try {
      // Insert product
      await transaction.query(
        `INSERT INTO products (id, name, description, subcategory_id, brand_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          productId,
          data.name,
          data.description || null,
          data.subcategory_id || null,
          data.brand_id || null,
        ]
      );

      // Insert product attributes
      if (data.attributes && data.attributes.length > 0) {
        await this.insertProductAttributes(productId, data.attributes, transaction);
      }

      // Insert variations
      if (data.is_variable && data.variations) {
        await this.insertVariations(productId, data.variations, transaction, context);
      } else if (data.default_variation) {
        await this.insertDefaultVariation(productId, data.name, data.default_variation, transaction, context);
      }

      return { productId };

    } catch (error) {
      logger.error('Product repository creation error', {
        requestId,
        productId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getProducts(
    query: GetProductsQuery,
    context: ServiceContext
  ): Promise<GetProductsResult> {
    const { page = 1, limit = 10, search = '' } = query;
    const offset = (page - 1) * limit;

    const searchCondition = search.trim() 
      ? 'WHERE p.name ILIKE $3 OR p.description ILIKE $3'
      : '';
    
    const searchParam = search.trim() ? `%${search.trim()}%` : null;

    // Build query parameters
    const queryParams: any[] = [limit, offset];
    const countParams: any[] = [];
    
    if (searchParam) {
      queryParams.push(searchParam);
      countParams.push(searchParam);
    }

    // Get products
    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        COALESCE(s.name, '') AS subcategory_name,
        COALESCE(b.name, '') AS brand_name,
        COUNT(DISTINCT v.id) AS variation_count,
        MIN(v.retail_price) AS min_price,
        MAX(v.retail_price) AS max_price,
        SUM(v.stock_quantity) AS total_stock
      FROM products p
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variations v ON p.id = v.product_id
      ${searchCondition}
      GROUP BY p.id, p.name, p.description, p.created_at, p.updated_at, s.name, b.name
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const [productsResult, countResult] = await Promise.all([
      DatabaseService.query(productsQuery, queryParams),
      this.getTotalCount(searchCondition, countParams)
    ]);

    const total = parseInt(countResult.rows[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    return {
      products: productsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findExistingSkus(skus: string[]): Promise<string[]> {
    const result = await DatabaseService.query(
      'SELECT sku FROM product_variations WHERE sku = ANY($1)',
      [skus]
    );
    return result.rows.map((row: { sku: any; }) => row.sku);
  }

  async findExistingBarcodes(barcodes: string[]): Promise<string[]> {
    const result = await DatabaseService.query(
      'SELECT code FROM barcodes WHERE code = ANY($1)',
      [barcodes]
    );
    return result.rows.map((row: { code: any; }) => row.code);
  }

  async validateSubcategory(subcategoryId: string): Promise<boolean> {
    const result = await DatabaseService.query(
      'SELECT 1 FROM subcategories WHERE id = $1 LIMIT 1',
      [subcategoryId]
    );
    return result.rows.length > 0;
  }

  async validateBrand(brandId: string): Promise<boolean> {
    const result = await DatabaseService.query(
      'SELECT 1 FROM brands WHERE id = $1 LIMIT 1',
      [brandId]
    );
    return result.rows.length > 0;
  }

  async validateAttributes(attributeIds: string[]): Promise<string[]> {
    const result = await DatabaseService.query(
      'SELECT id FROM attributes WHERE id = ANY($1)',
      [attributeIds]
    );
    const existingIds = new Set(result.rows.map((row: { id: any; }) => row.id));
    return attributeIds.filter(id => !existingIds.has(id));
  }

  async validateAttributeValues(attributeValueIds: string[]): Promise<string[]> {
    const result = await DatabaseService.query(
      'SELECT id FROM attribute_values WHERE id = ANY($1)',
      [attributeValueIds]
    );
    const existingIds = new Set(result.rows.map((row: { id: any; }) => row.id));
    return attributeValueIds.filter(id => !existingIds.has(id));
  }

  private async insertProductAttributes(
    productId: string,
    attributes: Array<{ attribute_id: string }>,
    transaction: DatabaseConnection
  ): Promise<void> {
    const values = attributes.map(attr => 
      `('${cuid()}', '${productId}', '${attr.attribute_id}', NOW())`
    ).join(', ');

    await transaction.query(
      `INSERT INTO product_attributes (id, product_id, attribute_id, created_at) VALUES ${values}`
    );
  }

  private async insertVariations(
    productId: string,
    variations: any[],
    transaction: DatabaseConnection,
    context: ServiceContext
  ): Promise<void> {
    for (const variation of variations) {
      const variationId =cuid();

      await transaction.query(
        `INSERT INTO product_variations (
          id, product_id, sku, name, cost_price, wholesale_price, retail_price,
          stock_quantity, low_stock_threshold, warranty_period, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          variationId,
          productId,
          variation.sku,
          variation.name || null,
          variation.cost_price || 0,
          variation.wholesale_price || null,
          variation.retail_price || 0,
          variation.stock_quantity || 0,
          variation.low_stock_threshold || 5,
          variation.warranty_period || null,
        ]
      );

      // Insert variation attributes
      if (variation.attributes && variation.attributes.length > 0) {
        await this.insertVariationAttributes(variationId, variation.attributes, transaction);
      }

      // Insert barcode
      if (variation.barcode) {
        await this.insertBarcode(variationId, variation.barcode, transaction);
      }
    }
  }

  private async insertDefaultVariation(
    productId: string,
    productName: string,
    defaultVariation: any,
    transaction: DatabaseConnection,
    context: ServiceContext
  ): Promise<void> {
    const variationId =cuid();

    await transaction.query(
      `INSERT INTO product_variations (
        id, product_id, sku, name, cost_price, wholesale_price, retail_price,
        stock_quantity, low_stock_threshold, warranty_period, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        variationId,
        productId,
        defaultVariation.sku,
        productName,
        defaultVariation.cost_price || 0,
        defaultVariation.wholesale_price || null,
        defaultVariation.retail_price || 0,
        defaultVariation.stock_quantity || 0,
        defaultVariation.low_stock_threshold || 5,
        defaultVariation.warranty_period || null,
      ]
    );

    if (defaultVariation.barcode) {
      await this.insertBarcode(variationId, defaultVariation.barcode, transaction);
    }
  }

  private async insertVariationAttributes(
    variationId: string,
    attributes: Array<{ attribute_id: string; attribute_value_id: string }>,
    transaction: DatabaseConnection
  ): Promise<void> {
    const values = attributes.map(attr => 
      `('${cuid()}', '${variationId}', '${attr.attribute_id}', '${attr.attribute_value_id}', NOW())`
    ).join(', ');

    await transaction.query(
      `INSERT INTO product_variation_attributes 
        (id, variation_id, attribute_id, attribute_value_id, created_at) 
       VALUES ${values}`
    );
  }

  private async insertBarcode(
    variationId: string,
    barcode: string,
    transaction: DatabaseConnection
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO barcodes (id, variation_id, code, type, is_active, created_at)
       VALUES ($1, $2, $3, 'INTERNAL', true, NOW())`,
      [cuid(), variationId, barcode]
    );
  }

  private async getTotalCount(searchCondition: string, params: any[]): Promise<any> {
    const countQuery = `SELECT COUNT(*) AS total FROM products p ${searchCondition}`;
    return DatabaseService.query(countQuery, params);
  }
}