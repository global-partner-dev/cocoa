# Sensory Evaluation Database Integration

## Overview

The Sensory Evaluation feature has been fully integrated with the Supabase database to store comprehensive sensory evaluation data from judges, including detailed flavor profiles, scores, and final verdicts.

## Database Schema

### New Table: `sensory_evaluations`

The `sensory_evaluations` table stores all sensory evaluation data with the following structure:

```sql
sensory_evaluations (
    id UUID PRIMARY KEY,
    sample_id UUID REFERENCES samples(id),
    judge_id UUID REFERENCES profiles(id),

    -- Meta Information
    evaluation_id TEXT,
    evaluation_date DATE,
    evaluation_time TIME,
    evaluator_name TEXT,
    sample_code TEXT,
    sample_notes TEXT,
    evaluation_type TEXT ('cocoa_mass' | 'chocolate'),

    -- Main Sensory Scores (0-10 scale)
    cacao DECIMAL(3,1),
    bitterness DECIMAL(3,1),
    astringency DECIMAL(3,1),
    caramel_panela DECIMAL(3,1),

    -- Calculated Group Totals (0-10 scale)
    acidity_total DECIMAL(3,1),
    fresh_fruit_total DECIMAL(3,1),
    brown_fruit_total DECIMAL(3,1),
    vegetal_total DECIMAL(3,1),
    floral_total DECIMAL(3,1),
    wood_total DECIMAL(3,1),
    spice_total DECIMAL(3,1),
    nut_total DECIMAL(3,1),
    roast_degree DECIMAL(3,1),
    defects_total DECIMAL(3,1),

    -- Sub-attributes for each category (0-10 scale)
    -- Acidity: frutal, acetic, lactic, mineral_butyric
    -- Fresh Fruit: berries, citrus, yellow_pulp, dark, tropical
    -- Brown Fruit: dry, brown, overripe
    -- Vegetal: grass_herb, earthy
    -- Floral: orange_blossom, flowers
    -- Wood: light, dark, resin
    -- Spice: spices, tobacco, umami
    -- Nut: kernel, skin
    -- Defects: dirty, animal, rotten, smoke, humid, moldy, overfermented, other

    -- Chocolate-specific attributes
    sweetness DECIMAL(3,1), -- Only for chocolate evaluation
    texture_notes TEXT,

    -- Overall Quality (calculated)
    overall_quality DECIMAL(3,1),

    -- Comments
    flavor_comments TEXT,
    producer_recommendations TEXT,
    additional_positive TEXT,

    -- Final Verdict
    verdict TEXT ('Approved' | 'Disqualified'),
    disqualification_reasons TEXT[],
    other_disqualification_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
```

### Key Features

1. **Comprehensive Flavor Profiling**: Stores detailed sensory attributes including main categories and sub-attributes
2. **Automatic Calculations**: Group totals are calculated from sub-attributes
3. **Flexible Evaluation Types**: Supports both cocoa mass and chocolate evaluations
4. **Judge-Sample Relationship**: One evaluation per judge per sample (unique constraint)
5. **Automatic Sample Status Updates**: Sample status changes to 'evaluated' when evaluation is saved

## Database Setup

### Step 1: Run the Migration

Execute the SQL migration file to create the necessary database structure:

```bash
# Using Supabase Dashboard
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `sensory-evaluations-migration.sql`
4. Execute the SQL script
```

### Step 2: Verify Setup

After running the migration, verify that:

- ✅ `sensory_evaluations` table exists with all columns
- ✅ Proper foreign key relationships to `samples` and `profiles` tables
- ✅ Row Level Security policies are in place
- ✅ Triggers for automatic updates are created
- ✅ Sample status constraint includes 'evaluated'

## Integration Features

### ✅ Database Integration

- **Real-time evaluation saving**: All sensory data is immediately saved to database
- **Comprehensive data persistence**: Every aspect of the evaluation form is stored
- **Automatic sample status management**: Sample status updates to 'evaluated' automatically
- **Evaluation history preservation**: Complete audit trail of all evaluations

### ✅ Judge Dashboard Integration

- **Seamless form integration**: SensoryEvaluationForm now saves to database
- **Real-time feedback**: Success/error messages for save operations
- **Evaluation status tracking**: Dashboard shows which samples have been evaluated
- **Progress indicators**: Visual feedback on evaluation completion

### ✅ Data Validation

- **Score range validation**: All scores constrained to 0-10 range
- **Required field validation**: Essential fields are enforced
- **Unique evaluation constraint**: One evaluation per judge per sample
- **Data type validation**: Proper decimal precision for scores

### ✅ Security Features

- **Row Level Security**: Judges can only access their own evaluations
- **Role-based access**: Different permissions for judges, directors, admins
- **Participant visibility**: Participants can view evaluations of their samples
- **Secure data handling**: All database operations use authenticated users

## API Methods Available

The `SensoryEvaluationService` provides these methods:

```typescript
// Get samples assigned to judge for sensory evaluation
SensoryEvaluationService.getSamplesForJudge();

// Save sensory evaluation data
SensoryEvaluationService.saveSensoryEvaluation(sampleId, evaluationResult);

// Get existing sensory evaluation
SensoryEvaluationService.getSensoryEvaluation(sampleId, judgeId);
```

## Sample Status Flow

```
approved → evaluated (after sensory evaluation is saved)
```

- **approved**: Sample has passed physical evaluation and is ready for sensory evaluation
- **evaluated**: Sample has been sensory evaluated by assigned judges

## Usage in Judge Dashboard

1. **Judge logs in** and sees assigned samples
2. **Selects a sample** for sensory evaluation
3. **Completes the evaluation form** with detailed sensory scores
4. **Submits the evaluation** - data is saved to database automatically
5. **Sample status updates** to 'evaluated'
6. **Dashboard reflects** the completed evaluation

## Data Structure

### Sensory Evaluation Result

```typescript
interface SensoryEvaluationResult {
  meta: {
    evaluationDate?: string;
    evaluationTime?: string;
    evaluatorName?: string;
    sampleCode?: string;
    sampleNotes?: string;
    evaluationType?: "cocoa_mass" | "chocolate";
  };
  scores: {
    // Main attributes (0-10)
    cacao: number;
    bitterness: number;
    astringency: number;
    caramelPanela: number;

    // Calculated totals (0-10)
    acidityTotal: number;
    freshFruitTotal: number;
    // ... other totals

    // Sub-attributes for detailed profiling
    acidity: { frutal: number; acetic: number /* ... */ };
    freshFruit: { berries: number; citrus: number /* ... */ };
    // ... other sub-attributes

    // Defects
    defects: { dirty: number; animal: number /* ... */ };

    // Overall quality (calculated)
    overallQuality: number;
  };
  comments: {
    flavorComments?: string;
    producerRecommendations?: string;
    additionalPositive?: string;
  };
  verdict: {
    result: "Approved" | "Disqualified";
    reasons?: string[];
    otherReason?: string;
  };
}
```

## Troubleshooting

### Common Issues

1. **Migration fails**

   - Check if `samples` and `profiles` tables exist
   - Verify foreign key constraints
   - Ensure proper permissions

2. **Evaluation not saving**

   - Verify `sensory_evaluations` table exists
   - Check user authentication
   - Look for constraint violations in database logs

3. **Sample status not updating**

   - Check that the trigger function was created
   - Verify sample status constraint includes 'evaluated'

4. **Permission errors**
   - Verify Row Level Security policies
   - Check user role assignments
   - Ensure proper authentication

### Database Verification Queries

```sql
-- Check if sensory_evaluations table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'sensory_evaluations';

-- Check sample status constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE table_name = 'samples' AND constraint_name LIKE '%status%';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'sensory_evaluations';

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'sensory_evaluations';
```

## Production Considerations

1. **Performance**: Indexes are created on frequently queried columns
2. **Data Integrity**: Constraints ensure data quality
3. **Security**: Row Level Security protects sensitive evaluation data
4. **Scalability**: Efficient queries and proper indexing support growth
5. **Backup**: Regular database backups recommended for evaluation data

## Next Steps

1. **Testing**: Thoroughly test the evaluation flow with real data
2. **Monitoring**: Set up monitoring for evaluation completion rates
3. **Reporting**: Consider adding evaluation analytics and reporting features
4. **Integration**: Connect with other parts of the contest management system
