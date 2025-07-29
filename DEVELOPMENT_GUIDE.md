# 🚀 Development Guide - Higo Backend

## 📁 Project Architecture & Conventions

### Directory Structure
```
src/
├── api/endpoints/        # HTTP route handlers
├── auth/                 # Authentication & authorization  
├── core/                 # Core configurations (config, database, redis)
├── middleware/           # Express middleware functions
├── models/               # Mongoose models & schemas
├── repositories/         # Data access layer
├── services/             # Business logic layer
├── schemas/              # TypeScript DTOs & interfaces
├── validations/          # Request validation rules
└── utils/                # Utility functions
```

### File Naming Conventions
- **All files use simple `.ts` extension only**
- **NO suffixes**: `user.ts` ❌ NOT `user.service.ts`
- **Consistent across all directories**:
  - `models/base.ts`, `models/user.ts`
  - `services/base.ts`, `services/user.ts` 
  - `repositories/base.ts`, `repositories/user.ts`
  - `schemas/base.ts`, `schemas/user.ts`
  - `validations/base.ts`, `validations/user.ts`

## 🏗️ Adding New Features

### 1. Creating New Entity/Table

When adding a new entity (e.g., `Product`), implement in this order:

#### Step 1: Model Layer (`models/`)
```typescript
// models/product.ts
import { IBaseModel, baseSchema } from './base';
import { ProductStatus } from './enums';

export interface IProduct extends IBaseModel {
  name: string;
  price: number;
  status: ProductStatus;
}

export const Product = mongoose.model<IProduct>('Product', productSchema);
```

#### Step 2: Enums (`models/enums.ts`)
```typescript
// Add to existing enums.ts
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}
```

#### Step 3: Schemas/DTOs (`schemas/`)
```typescript
// schemas/product.ts
export interface CreateProductDto {
  name: string;
  price: number;
}

export interface ProductResponseDto {
  _id: string;
  name: string;
  price: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Step 4: Repository Layer (`repositories/`)
```typescript
// repositories/product.ts
import { BaseRepository } from './base';
import { IProduct, Product } from '../models/product';

export class ProductRepository extends BaseRepository<IProduct> {
  constructor() {
    super(Product);
  }

  protected getSearchFields(): string[] {
    return ['name', 'description'];
  }

  async findByName(name: string): Promise<IProduct | null> {
    return this.findOne({ name });
  }
}
```

#### Step 5: Service Layer (`services/`)
```typescript
// services/product.ts
import { BaseService } from './base';
import { ProductRepository } from '../repositories/product';
import { IProduct } from '../models/product';

export class ProductService extends BaseService<IProduct> {
  constructor() {
    super(new ProductRepository());
  }

  private toResponseDto(product: IProduct): ProductResponseDto {
    return {
      _id: product._id,
      name: product.name,
      price: product.price,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }
}
```

#### Step 6: Validations (`validations/`)
```typescript
// validations/product.ts
import { body } from 'express-validator';
import { 
  paginationValidation,
  mongoIdValidation 
} from './base';

export const createProductValidation = [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be positive')
];

export const updateProductValidation = [
  body('name').optional().trim().isLength({ min: 1 }),
  body('price').optional().isFloat({ min: 0 })
];

export const productIdValidation = [mongoIdValidation('id')];
```

#### Step 7: API Endpoints (`api/endpoints/`)
```typescript
// api/endpoints/products.ts
import { Router } from 'express';
import { ProductService } from '../../services/product';
import { authMiddleware } from '../../auth/jwt';
import { validateRequest } from '../../middleware/validation';

const router = Router();
const productService = new ProductService();

// GET /products
router.get('/', authMiddleware, paginationValidation, validateRequest, async (req, res) => {
  // Implementation
});

// POST /products  
router.post('/', authMiddleware, createProductValidation, validateRequest, async (req, res) => {
  // Implementation
});

export default router;
```

#### Step 8: Update Router (`api/router.ts`)
```typescript
// api/router.ts
import productRoutes from './endpoints/products';

// Add to existing router
router.use('/products', productRoutes);
```


## 🔄 Request Flow Architecture

### Complete Request Lifecycle
```
1. HTTP Request → Express App
2. Global Middleware Chain:
   ├── Helmet (Security)
   ├── CORS  
   ├── Correlation ID
   ├── Request Logging
   ├── Body Parsing
   └── Rate Limiting

3. Route Matching → API Router → Specific Endpoint

4. Endpoint Middleware Chain:
   ├── Authentication (authMiddleware)
   ├── Authorization (checkPermission) 
   ├── Validation (validateRequest)
   └── Controller Function

5. Business Logic Flow:
   Controller → Service → Repository → MongoDB

6. Response Flow:
   MongoDB → Repository → Service → Controller → Express → Client

7. Error Handling:
   Any Layer → globalErrorHandler → Standardized Error Response
```

## 🔐 Authentication & Authorization

### Adding Protected Endpoints
```typescript
// For admin-only endpoints
router.get('/admin-only', 
  authMiddleware, 
  checkPermission(['admin']), 
  validationMiddleware,
  controllerFunction
);

// For multiple roles
router.get('/multi-role', 
  authMiddleware, 
  checkPermission(['admin', 'moderator']),
  controllerFunction  
);
```

## 📝 Validation Patterns

### Reusable Validation Components
```typescript
// Use base validations from validations/base.ts
import { 
  emailValidation,
  paginationValidation,
  mongoIdValidation 
} from './base';

// Combine for specific endpoints
export const createUserValidation = [
  emailValidation,
  passwordValidation,
  firstNameValidation
];
```

## 🧪 Testing Guidelines

### When Adding New Features
1. **Unit Tests**: Test service layer business logic
2. **Integration Tests**: Test API endpoints  
3. **Validation Tests**: Test validation schemas
4. **Repository Tests**: Test data access methods

### Test File Structure
```
tests/
├── unit/
│   ├── services/
│   └── repositories/
├── integration/
│   └── api/
└── validation/
```

## 🏃‍♂️ Development Workflow

### Before Starting Development
1. Check this guide for architecture patterns
2. Follow the layer-by-layer implementation order
3. Use consistent naming conventions
4. Implement proper error handling
5. Add appropriate validations
6. Test thoroughly

### Code Review Checklist
- [ ] Follows established architecture patterns
- [ ] Consistent file naming (no suffixes)
- [ ] Proper error handling
- [ ] Validation implemented
- [ ] DTOs for request/response
- [ ] Repository pattern followed
- [ ] Service layer contains business logic
- [ ] Authentication/authorization applied
- [ ] Tests written

## 🔧 Common Patterns

### Error Handling
```typescript
// In services
try {
  const result = await this.repository.findById(id);
  return {
    success: true,
    message: 'Success',
    data: result
  };
} catch (error) {
  return this.handleError(error, 'methodName');
}
```

### Response Format
```typescript
// Standard API Response
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
```

### Caching Pattern
```typescript
// In services - automatic caching via BaseService
const result = await this.findById(id, true); // useCache = true
```

## 📚 Key Principles

1. **Separation of Concerns**: Each layer has specific responsibility
2. **DRY**: Reuse validations, base classes, common utilities
3. **Type Safety**: Use TypeScript interfaces and DTOs
4. **Consistency**: Follow established patterns and naming
5. **Security**: Always validate input, authenticate, authorize
6. **Performance**: Use caching, pagination, proper indexing
7. **Maintainability**: Clear code structure, proper error handling

---

*This guide ensures all developers maintain consistency and follow established architectural patterns when extending the Higo Backend.*