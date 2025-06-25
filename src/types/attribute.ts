export interface Category {
  id?: string;
  name: string;
  description?: string;
  subcategories: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  slug?: string;
}
export interface Subcategory {
  subcategory_id: number;
  name: string;
  description: string;
}
export interface AttributeFormData {
  name: string;
  description?: string;
  values: string;
}


export interface AttributeFormConfig {
  maxValues: number;
  maxValueLength: number;
  allowDuplicates: boolean;
  separator: string;
  showPreview: boolean;
  enableDragDrop: boolean;
  enableAutoSave: boolean;
}
export interface AttributeValue {
  id: string;
  value: string;
}

export interface Attribute {
  id: string;
  name: string;
  values: AttributeValue[];
}

export interface AttributesListResponse {
  success: boolean;
  data: {
    attributes: Attribute[];
    total: number;
    limit: number;
    offset: number;
  };
  message?: string;
}

export interface AttributeApiResponse {
  success: boolean;
  data: Attribute;
  message?: string;
}


export interface GetAttributesParams {
  limit?: number;
  offset?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface DeleteAttributeResponse {
  success: boolean;
  message: string;
}