# Complete Sample Submission Implementation Guide

This document provides a comprehensive overview of the enhanced sample submission system implementation, including database schema, functions, and integration instructions.

## System Overview

The sample submission system now supports three product types:

- **Bean**: Traditional cocoa bean submissions with detailed origin and processing information
- **Liquor**: Cocoa liquor/mass submissions with processing specifications
- **Chocolate**: Finished chocolate products with comprehensive composition details

## Implementation Files

### 1. Database Migration Files

Execute these files in order:

1. **`samples-product-types-migration.sql`**

   - Adds product type support to existing samples table
   - Adds new columns for lot number, harvest date, altitude, and certifications
   - Adds JSONB columns for chocolate and liquor details
   - Updates constraints to handle different product types
   - Creates validation functions

2. **`samples-submission-functions.sql`**

   - Core functions for sample submission workflow
   - Contest availability checking
   - Sample validation and retrieval functions
   - QR code verification functions

3. **`samples-views-and-helpers.sql`**
   - Convenient views for different product types
   - Search and statistics functions
   - Status management functions
   - Performance optimization indexes

### 2. Documentation Files

- **`SAMPLE_SUBMISSION_PRODUCT_TYPES_INTEGRATION.md`**: Detailed technical integration guide
- **`SAMPLE_SUBMISSION_COMPLETE_IMPLEMENTATION.md`**: This comprehensive overview

## Database Schema Summary

### Core Table: `samples`

```sql
-- Key columns added/modified:
product_type TEXT NOT NULL CHECK (product_type IN ('bean', 'liquor', 'chocolate'))
lot_number TEXT
harvest_date DATE
growing_altitude_masl INTEGER
bean_certifications JSONB
chocolate_details JSONB
liquor_details JSONB

-- Existing columns made flexible:
country TEXT -- Required only for beans
farm_name TEXT -- Required only for beans
owner_full_name TEXT -- Required only for beans
```

### Product-Specific Data Storage

#### Bean Products

- Use existing table columns for origin, owner, and processing data
- Additional certifications stored in `bean_certifications` JSONB
- All traditional bean fields remain available

#### Chocolate Products

- All product details stored in `chocolate_details` JSONB
- Includes composition, processing, certifications, and competition category
- Rich metadata for evaluation and categorization

#### Liquor Products

- All product details stored in `liquor_details` JSONB
- Processing method, temperature, and timing information
- Origin tracking through cocoa source country

## Key Functions

### Submission Workflow

```sql
-- Check available contests
SELECT * FROM get_available_contests();

-- Validate submission before insert
SELECT validate_sample_submission('chocolate', contest_id, chocolate_json);

-- Get user's submissions
SELECT * FROM get_user_samples(user_id);
```

### Evaluation Workflow

```sql
-- Get samples for evaluation
SELECT * FROM get_samples_for_evaluation(contest_id, 'chocolate', 'approved');

-- Update sample status
SELECT update_sample_status(sample_id, 'evaluated', judge_id);
```

### Verification and Search

```sql
-- Verify QR code
SELECT * FROM verify_qr_code('CC-2024-123456');

-- Search samples
SELECT * FROM search_samples('search_term', contest_id, 'chocolate');
```

## Views for Easy Access

### Unified Sample View

```sql
SELECT * FROM sample_summary; -- All samples with product-specific names
```

### Product-Specific Views

```sql
SELECT * FROM chocolate_samples; -- Chocolate products with details
SELECT * FROM liquor_samples;    -- Liquor products with details
SELECT * FROM bean_samples;      -- Bean products with details
```

## Frontend Integration

The existing `SampleSubmission.tsx` component is fully compatible with this database implementation:

1. **Product Type Selection**: Step 1 sets the `product_type` field
2. **Dynamic Forms**: Different forms shown based on product type
3. **Data Mapping**: `SamplesService.submitSample()` maps form data to database structure
4. **Validation**: Client-side validation matches database constraints

### Service Integration Points

```typescript
// The SamplesService handles all product types
await SamplesService.submitSample({
  contestId: string,
  productType: "bean" | "liquor" | "chocolate",
  // Product-specific fields based on type
  chocolate: ChocolateDetails,
  liquor: LiquorDetails,
  // Bean fields use direct properties
  country: string,
  farmName: string,
  // ... other fields
});
```

## Security and Permissions

### Row Level Security (RLS)

- Users can only view/edit their own samples
- Staff (admin, director, judge, evaluator) can view all samples
- Admins and directors can update any sample

### Function Security

- All functions use `SECURITY DEFINER` for controlled access
- Validation functions prevent malformed data
- Status transition validation ensures proper workflow

### Data Validation

- JSON schema validation for chocolate and liquor details
- Product type constraints ensure required fields
- Status transition validation prevents invalid updates

## Performance Optimizations

### Indexes

```sql
-- Product type and search indexes
CREATE INDEX idx_samples_product_type ON samples(product_type);
CREATE INDEX idx_samples_search_text ON samples USING GIN (...);

-- JSONB indexes for efficient querying
CREATE INDEX idx_samples_chocolate_details ON samples USING GIN (chocolate_details);
CREATE INDEX idx_samples_liquor_details ON samples USING GIN (liquor_details);
```

### Query Optimization

- Views pre-join common tables
- Functions use efficient query patterns
- Pagination support in search functions

## Migration Instructions

### 1. Backup Current Data

```sql
-- Create backup of current samples table
CREATE TABLE samples_backup AS SELECT * FROM samples;
```

### 2. Run Migrations

```bash
# Execute in order:
psql -f samples-product-types-migration.sql
psql -f samples-submission-functions.sql
psql -f samples-views-and-helpers.sql
```

### 3. Verify Migration

```sql
-- Check table structure
\d samples

-- Test functions
SELECT * FROM get_available_contests();
SELECT * FROM get_product_type_distribution();

-- Verify existing data
SELECT product_type, COUNT(*) FROM samples GROUP BY product_type;
```

### 4. Update Application

The frontend is already compatible, but verify:

- Environment variables are set correctly
- Supabase client has proper permissions
- QR code storage bucket exists

## Testing

### Sample Test Data

```sql
-- Test bean submission
INSERT INTO samples (contest_id, user_id, tracking_code, qr_code_data, product_type, country, farm_name, owner_full_name, agreed_to_terms)
VALUES ('contest-uuid', 'user-uuid', 'CC-2024-000001', '{}', 'bean', 'Colombia', 'Test Farm', 'John Doe', true);

-- Test chocolate submission
INSERT INTO samples (contest_id, user_id, tracking_code, qr_code_data, product_type, chocolate_details, agreed_to_terms)
VALUES ('contest-uuid', 'user-uuid', 'CC-2024-000002', '{}', 'chocolate',
'{"name": "Dark Chocolate", "brand": "TestBrand", "batch": "B001", "manufacturerCountry": "Colombia", "cocoaOriginCountry": "Ecuador", "cocoaVariety": "Trinitario", "fermentationMethod": "Traditional", "dryingMethod": "Solar", "type": "Dark", "cocoaPercentage": 70, "temperingMethod": "Manual", "sweeteners": ["Cane Sugar"], "lecithin": ["None"], "naturalFlavors": ["Vanilla"], "allergens": ["None"], "certifications": ["Organic"]}'::jsonb, true);

-- Test liquor submission
INSERT INTO samples (contest_id, user_id, tracking_code, qr_code_data, product_type, liquor_details, lot_number, harvest_date, agreed_to_terms)
VALUES ('contest-uuid', 'user-uuid', 'CC-2024-000003', '{}', 'liquor',
'{"name": "Premium Liquor", "brand": "TestBrand", "batch": "L001", "countryProcessing": "Colombia", "lecithinPercentage": 0.5, "processingMethod": "Artisanal", "cocoaOriginCountry": "Peru", "cocoaVariety": "Criollo"}'::jsonb, 'LOT003', '2024-01-15', true);
```

## Monitoring and Maintenance

### Regular Checks

```sql
-- Monitor submission distribution
SELECT * FROM get_product_type_distribution();

-- Check for data quality issues
SELECT product_type, COUNT(*) as count,
       COUNT(CASE WHEN chocolate_details IS NULL AND product_type = 'chocolate' THEN 1 END) as missing_chocolate_details,
       COUNT(CASE WHEN liquor_details IS NULL AND product_type = 'liquor' THEN 1 END) as missing_liquor_details
FROM samples GROUP BY product_type;
```

### Performance Monitoring

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'samples';
```

This implementation provides a robust, scalable foundation for the multi-product sample submission system while maintaining backward compatibility and ensuring data integrity.
