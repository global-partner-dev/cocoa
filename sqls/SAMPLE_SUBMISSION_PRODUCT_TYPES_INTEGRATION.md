# Sample Submission Product Types Integration Guide

This guide explains the database implementation for the enhanced sample submission system that supports multiple product types: beans, liquor/mass, and chocolate.

## Overview

The sample submission system has been extended to support three product types:

- **Bean**: Traditional cocoa bean submissions with origin and processing details
- **Liquor**: Cocoa liquor/mass submissions with processing information
- **Chocolate**: Finished chocolate product submissions with detailed composition

## Database Changes

### 1. New Columns Added to `samples` Table

```sql
-- Core product type support
product_type TEXT NOT NULL CHECK (product_type IN ('bean', 'liquor', 'chocolate'))

-- Additional fields for all product types
lot_number TEXT
harvest_date DATE

-- Bean-specific additional fields
growing_altitude_masl INTEGER
bean_certifications JSONB

-- Product-specific detail storage
chocolate_details JSONB
liquor_details JSONB
```

### 2. Updated Constraints

The table now has flexible constraints based on product type:

- **Bean products**: Require `country`, `farm_name`, and `owner_full_name`
- **Chocolate products**: Require valid `chocolate_details` JSON
- **Liquor products**: Require valid `liquor_details` JSON

### 3. JSON Structure Requirements

#### Bean Certifications Structure

```json
{
  "organic": boolean,
  "fairtrade": boolean,
  "direct_trade": boolean,
  "none": boolean,
  "other": boolean,
  "other_text": "string (optional)"
}
```

#### Chocolate Details Structure

```json
{
  "name": "string (required)",
  "brand": "string (required)",
  "batch": "string (required)",
  "productionDate": "YYYY-MM-DD (optional)",
  "manufacturerCountry": "string (required)",
  "cocoaOriginCountry": "string (required)",
  "region": "string (optional)",
  "municipality": "string (optional)",
  "farmName": "string (optional)",
  "cocoaVariety": "string (required)",
  "fermentationMethod": "string (required)",
  "dryingMethod": "string (required)",
  "type": "string (required)", // Dark, Milk, White, Ruby, Blend
  "cocoaPercentage": number, // 0-100
  "cocoaButterPercentage": number, // optional
  "sweeteners": ["array of strings"],
  "sweetenerOther": "string (optional)",
  "lecithin": ["array of strings"], // Soy, Sunflower, None
  "naturalFlavors": ["array of strings"], // Vanilla, Cinnamon, None, Other
  "naturalFlavorsOther": "string (optional)",
  "allergens": ["array of strings"], // Gluten, Lactose, Nuts, Soy, None
  "certifications": ["array of strings"],
  "certificationsOther": "string (optional)",
  "conchingTimeHours": number, // optional
  "conchingTemperatureCelsius": number, // optional
  "temperingMethod": "string (required)", // Manual, Machine, Untempered
  "finalGranulationMicrons": number, // optional
  "competitionCategory": "string (optional)"
}
```

#### Liquor Details Structure

```json
{
  "name": "string (required)",
  "brand": "string (required)",
  "batch": "string (required)",
  "processingDate": "YYYY-MM-DD (optional)",
  "countryProcessing": "string (required)",
  "lecithinPercentage": number, // 0-100
  "cocoaButterPercentage": number, // optional
  "grindingTemperatureCelsius": number, // optional
  "grindingTimeHours": number, // optional
  "processingMethod": "string (required)", // Artisanal, Industrial, Mixed
  "cocoaOriginCountry": "string (required)",
  "cocoaVariety": "string (optional)"
}
```

## New Database Functions

### 1. `get_available_contests()`

Returns contests available for sample submission.

```sql
SELECT * FROM get_available_contests();
```

### 2. `validate_sample_submission()`

Validates submission data before insertion.

```sql
SELECT validate_sample_submission(
    'chocolate',
    'contest-uuid',
    '{"name": "Dark Chocolate", "brand": "MyBrand", ...}'::jsonb
);
```

### 3. `get_sample_details(sample_id)`

Returns complete sample information with contest and participant details.

```sql
SELECT * FROM get_sample_details('sample-uuid');
```

### 4. `get_user_samples(user_id)`

Returns all samples submitted by a user.

```sql
SELECT * FROM get_user_samples('user-uuid');
```

### 5. `verify_qr_code(tracking_code)`

Verifies QR code and returns sample information.

```sql
SELECT * FROM verify_qr_code('CC-2024-123456');
```

### 6. `get_samples_for_evaluation()`

Returns samples for evaluation with optional filters.

```sql
-- Get all samples
SELECT * FROM get_samples_for_evaluation();

-- Get chocolate samples only
SELECT * FROM get_samples_for_evaluation(NULL, 'chocolate', NULL);

-- Get approved samples for specific contest
SELECT * FROM get_samples_for_evaluation('contest-uuid', NULL, 'approved');
```

## Migration Steps

1. **Run the product types migration**:

   ```sql
   \i samples-product-types-migration.sql
   ```

2. **Add the submission functions**:

   ```sql
   \i samples-submission-functions.sql
   ```

3. **Verify the migration**:

   ```sql
   -- Check table structure
   \d samples

   -- Test function availability
   SELECT * FROM get_available_contests();
   ```

## Frontend Integration

The frontend `SampleSubmission.tsx` component is already configured to work with this database structure. The `SamplesService.submitSample()` method handles the different product types and maps the form data to the appropriate database columns.

### Key Integration Points

1. **Product Type Selection**: The `product_type` field determines which validation rules apply
2. **Dynamic Form Fields**: Different fields are shown/required based on the selected product type
3. **JSON Storage**: Complex product details are stored as JSON in the respective detail columns
4. **Flexible Validation**: Database constraints ensure data integrity while allowing flexibility

## Security Considerations

- All functions use `SECURITY DEFINER` to ensure proper access control
- Row Level Security (RLS) policies remain in effect
- JSON validation functions prevent malformed data insertion
- Product type constraints ensure data consistency

## Performance Optimizations

- GIN indexes on JSONB columns for efficient querying
- Regular indexes on commonly queried fields
- Optimized functions for common query patterns

## Testing

Test the implementation with sample data:

```sql
-- Test bean submission
INSERT INTO samples (
    contest_id, user_id, tracking_code, qr_code_data,
    product_type, country, farm_name, owner_full_name,
    lot_number, harvest_date, agreed_to_terms
) VALUES (
    'contest-uuid', 'user-uuid', 'CC-2024-000001', '{}',
    'bean', 'Colombia', 'Test Farm', 'John Doe',
    'LOT001', '2024-01-15', true
);

-- Test chocolate submission
INSERT INTO samples (
    contest_id, user_id, tracking_code, qr_code_data,
    product_type, chocolate_details, agreed_to_terms
) VALUES (
    'contest-uuid', 'user-uuid', 'CC-2024-000002', '{}',
    'chocolate',
    '{"name": "Dark Chocolate", "brand": "TestBrand", "batch": "B001", "manufacturerCountry": "Colombia", "cocoaOriginCountry": "Ecuador", "cocoaVariety": "Trinitario", "fermentationMethod": "Traditional", "dryingMethod": "Solar", "type": "Dark", "cocoaPercentage": 70, "temperingMethod": "Manual", "sweeteners": ["Cane Sugar"], "lecithin": ["None"], "naturalFlavors": ["Vanilla"], "allergens": ["None"], "certifications": ["Organic"]}'::jsonb,
    true
);
```

This implementation provides a robust, flexible foundation for the multi-product sample submission system while maintaining data integrity and performance.
