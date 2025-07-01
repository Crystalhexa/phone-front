import { ApiError } from '../type/api';
import { ServiceContext } from '../type/common';
import { CreateProductRequest } from '../type/product';

export const validateBusinessRules = {
  async product(data: CreateProductRequest, context: ServiceContext): Promise<void> {
    // Validate SKU patterns
    this.validateSkuPatterns(data);
    
    // Validate pricing rules
    this.validatePricingRules(data);
    
    // Validate stock rules
    this.validateStockRules(data);
    
    // Validate variation consistency
    if (data.is_variable) {
      this.validateVariationConsistency(data);
    }
  },

   validateSkuPatterns(data: CreateProductRequest): void {
    const skus = data.is_variable 
      ? data.variations?.map(v => v.sku) || []
      : data.default_variation ? [data.default_variation.sku] : [];

    // Check for duplicate SKUs within the request
    const skuSet = new Set(skus);
    if (skuSet.size !== skus.length) {
      throw new ApiError(
        'Duplicate SKUs found within the request',
        400,
        'DUPLICATE_SKU_IN_REQUEST'
      );
    }

    // Validate SKU format (customize as needed)
    const invalidSkus = skus.filter(sku => 
      !sku.match(/^[A-Za-z0-9\-_]{3,50}$/)
    );
    
    if (invalidSkus.length > 0) {
      throw new ApiError(
        `Invalid SKU format: ${invalidSkus.join(', ')}`,
        400,
        'INVALID_SKU_FORMAT'
      );
    }
  },

   validatePricingRules(data: CreateProductRequest): void {
    const variations = data.is_variable 
      ? data.variations || []
      : data.default_variation ? [data.default_variation] : [];

    for (const variation of variations) {
      // Cost price should be less than wholesale price
      if (variation.cost_price && variation.wholesale_price) {
        if (variation.cost_price > variation.wholesale_price) {
          throw new ApiError(
            `Cost price cannot be higher than wholesale price for SKU: ${variation.sku}`,
            400,
            'INVALID_PRICE_HIERARCHY'
          );
        }
      }

      // Wholesale price should be less than retail price
      if (variation.wholesale_price && variation.retail_price) {
        if (variation.wholesale_price > variation.retail_price) {
          throw new ApiError(
            `Wholesale price cannot be higher than retail price for SKU: ${variation.sku}`,
            400,
            'INVALID_PRICE_HIERARCHY'
          );
        }
      }
    }
  },

   validateStockRules(data: CreateProductRequest): void {
    const variations = data.is_variable 
      ? data.variations || []
      : data.default_variation ? [data.default_variation] : [];

    for (const variation of variations) {
      // Low stock threshold should be reasonable
      if (variation.low_stock_threshold && variation.stock_quantity) {
        if (variation.low_stock_threshold > variation.stock_quantity) {
          throw new ApiError(
            `Low stock threshold cannot be higher than current stock for SKU: ${variation.sku}`,
            400,
            'INVALID_STOCK_THRESHOLD'
          );
        }
      }
    }
  },

   validateVariationConsistency(data: CreateProductRequest): void {
    if (!data.variations || data.variations.length === 0) {
      return;
    }

    // Check that all variations have the same set of attributes
    const attributeSets = data.variations.map(v => 
      new Set((v.attributes || []).map(a => a.attribute_id))
    );

    const firstSet = attributeSets[0];
    const inconsistentVariations = attributeSets.some(set => {
      if (set.size !== firstSet.size) return true;
      for (const attr of set) {
        if (!firstSet.has(attr)) return true;
      }
      return false;
    });

    if (inconsistentVariations) {
      throw new ApiError(
        'All variations must have the same set of attributes',
        400,
        'INCONSISTENT_VARIATION_ATTRIBUTES'
      );
    }
  },
};
