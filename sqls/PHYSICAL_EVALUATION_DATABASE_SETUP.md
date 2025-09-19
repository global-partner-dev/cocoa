# Physical Evaluation Database Integration Setup Guide

This guide will help you set up the database integration for the Physical Evaluation feature in the Director panel.

## Prerequisites

1. Supabase project already set up (see `SUPABASE_SETUP.md`)
2. Basic schema already applied (`supabase-schema.sql`)
3. Samples table already created (`samples-migration.sql`)
4. Contests table already created (`contests-migration.sql`)

## Step 1: Apply Physical Evaluations Migration

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `physical-evaluations-migration.sql` into the SQL Editor
4. Execute the SQL script to create the physical_evaluations table and related functionality

### Option B: Using Supabase CLI (if available)

```bash
supabase db push
```

## Step 2: Verify Database Setup

After running the migration, verify that the following have been created:

### Tables

- ✅ `physical_evaluations` table with all required columns
- ✅ Proper foreign key relationship to `samples` table
- ✅ Indexes for performance optimization

### Policies (Row Level Security)

- ✅ Directors and admins can view/insert/update all physical evaluations
- ✅ Judges and evaluators can view physical evaluations (read-only)
- ✅ Participants can view their own sample evaluations (when completed)

### Triggers

- ✅ Automatic `updated_at` timestamp updates
- ✅ Automatic sample status updates when evaluation is saved

### Sample Status Updates

- ✅ Sample status constraint updated to include 'physical_evaluation'
- ✅ Automatic status transitions based on evaluation results

## Step 3: Test the Integration

### 3.1 Create Test Data (Optional)

If you need test samples for evaluation, you can create some:

```sql
-- Insert a test contest (if not exists)
INSERT INTO public.contests (id, name, location, start_date, end_date, status)
VALUES (
    gen_random_uuid(),
    'Test Physical Evaluation Contest',
    'Test Location',
    NOW(),
    NOW() + INTERVAL '30 days',
    'active'
) ON CONFLICT DO NOTHING;

-- Insert test samples for physical evaluation
INSERT INTO public.samples (
    contest_id,
    user_id,
    tracking_code,
    qr_code_data,
    country,
    farm_name,
    owner_full_name,
    status,
    agreed_to_terms
) VALUES (
    (SELECT id FROM public.contests WHERE name = 'Test Physical Evaluation Contest' LIMIT 1),
    (SELECT id FROM public.profiles WHERE role = 'participant' LIMIT 1),
    'CC-2024-TEST001',
    '{"code": "CC-2024-TEST001"}',
    'Test Country',
    'Test Farm',
    'Test Owner',
    'received',
    true
);
```

### 3.2 Test the Physical Evaluation Interface

1. Start your development server: `npm run dev`
2. Login as a director account
3. Navigate to the Physical Evaluation section
4. Verify that:
   - ✅ Samples load from the database
   - ✅ Evaluation form works correctly
   - ✅ Saving evaluations updates the database
   - ✅ Sample status changes appropriately
   - ✅ Disqualification logic works
   - ✅ Approval functionality works

## Database Schema Details

### Physical Evaluations Table Structure

```sql
physical_evaluations (
    id UUID PRIMARY KEY,
    sample_id UUID UNIQUE REFERENCES samples(id),

    -- Evaluation Criteria (11 parameters)
    undesirable_aromas TEXT[],
    has_undesirable_aromas BOOLEAN,
    percentage_humidity DECIMAL(5,2),
    broken_grains DECIMAL(5,2),
    violated_grains BOOLEAN,
    flat_grains DECIMAL(5,2),
    affected_grains_insects INTEGER,
    has_affected_grains BOOLEAN,
    well_fermented_beans DECIMAL(5,2),
    lightly_fermented_beans DECIMAL(5,2),
    purple_beans DECIMAL(5,2),
    slaty_beans DECIMAL(5,2),
    internal_moldy_beans DECIMAL(5,2),
    over_fermented_beans DECIMAL(5,2),

    -- Evaluation Metadata
    notes TEXT,
    evaluated_by TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE,
    global_evaluation TEXT CHECK (IN 'passed', 'disqualified'),
    disqualification_reasons TEXT[],
    warnings TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
```

### Sample Status Flow

```
received → physical_evaluation → approved/disqualified
```

- **received**: Sample has been received and is ready for physical evaluation
- **physical_evaluation**: Sample has been evaluated and passed physical criteria
- **approved**: Sample has been manually approved by director after evaluation
- **disqualified**: Sample failed physical evaluation criteria

## Features Implemented

### ✅ Database Integration

- Real-time sample loading from database
- Comprehensive evaluation data persistence
- Automatic sample status management
- Evaluation history preservation

### ✅ Physical Evaluation Criteria (11 Parameters)

1. **Undesirable Aromas** - Immediate disqualification if detected
2. **Humidity** - Must be 5.5%-8.5%
3. **Broken Grains** - Maximum 10%
4. **Violated Grains** - Immediate disqualification if detected
5. **Flat Grains** - Warning at 15% (not disqualifying)
6. **Affected Grains/Insects** - Immediate disqualification if ≥1
7. **Fermentation** - Well-fermented + Lightly fermented must be ≥60%
8. **Purple Beans** - Maximum 10%
9. **Slaty Beans** - Maximum 5%
10. **Internal Moldy Beans** - Maximum 3%
11. **Over-fermented Beans** - Maximum 5%

### ✅ User Interface Features

- Loading states and error handling
- Real-time evaluation feedback
- Automatic disqualification logic
- Manual sample approval
- Comprehensive evaluation notes
- Refresh functionality
- Empty states handling

### ✅ Security & Permissions

- Row Level Security enabled
- Role-based access control
- Directors can evaluate and approve
- Judges can view evaluations
- Participants can view their own results (when completed)

## API Methods Available

The `PhysicalEvaluationService` provides these methods:

```typescript
// Get samples ready for evaluation
PhysicalEvaluationService.getSamplesForEvaluation();

// Save physical evaluation
PhysicalEvaluationService.savePhysicalEvaluation(sampleId, evaluationData);

// Approve sample after evaluation
PhysicalEvaluationService.approveSample(sampleId);

// Get evaluation statistics
PhysicalEvaluationService.getEvaluationStatistics();

// Evaluate criteria (utility function)
PhysicalEvaluationService.evaluatePhysicalCriteria(data);
```

## Troubleshooting

### Common Issues

1. **Migration fails**

   - Check that samples table exists first
   - Verify contests table exists
   - Ensure proper permissions in Supabase

2. **Samples not loading**

   - Check that user has director role
   - Verify RLS policies are applied
   - Check browser console for errors

3. **Evaluation not saving**

   - Verify physical_evaluations table exists
   - Check user permissions
   - Look for constraint violations in database logs

4. **Status not updating**
   - Check that the trigger function was created
   - Verify sample status constraint includes 'physical_evaluation'

### Database Verification Queries

```sql
-- Check if physical_evaluations table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'physical_evaluations';

-- Check sample status constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%samples_status%';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'physical_evaluations';

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'physical_evaluations';
```

## Production Considerations

1. **Performance**: Indexes are created for optimal query performance
2. **Security**: RLS policies ensure proper data access control
3. **Data Integrity**: Foreign key constraints and check constraints ensure data quality
4. **Audit Trail**: All evaluations are timestamped and include evaluator information
5. **Backup**: Ensure regular database backups include the physical_evaluations table

## Next Steps

After setting up the database integration:

1. Test the complete evaluation workflow
2. Train directors on the new interface
3. Set up monitoring for evaluation metrics
4. Consider adding email notifications for status changes
5. Plan for integration with judge assignment system

The Physical Evaluation feature is now fully integrated with the database and ready for production use!
