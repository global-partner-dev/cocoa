# Results Dashboard Database Integration

## Overview

The Results Dashboard has been successfully integrated with the database to display real-time evaluation results instead of mock data. The dashboard now shows the top 10 samples based on sensory evaluation scores.

## Key Changes Made

### 1. New Results Service (`src/lib/resultsService.ts`)

- **`getTopSamplesByScore(limit)`**: Fetches top samples ordered by overall_quality score
- **`getAllEvaluatedSamples()`**: Retrieves all evaluated samples with full details
- **`getResultsStats()`**: Provides statistics about total samples, evaluations, and scores
- **Data transformation**: Converts database records to UI-friendly format
- **Score calculations**: Derives sensory scores from detailed evaluation data
- **Award assignment**: Automatically assigns medals and special awards based on ranking

### 2. Updated ParticipantResults Component

- **Database integration**: Replaced mock data with real database queries
- **Loading states**: Added proper loading and error handling
- **Empty states**: Graceful handling when no data is available
- **Real-time refresh**: Added refresh functionality to reload latest results
- **Optional physical evaluation**: Handles cases where only sensory evaluation exists

### 3. Data Flow

```
Database (sensory_evaluations + samples + contests + profiles)
    ↓
ResultsService (data transformation & scoring)
    ↓
ParticipantResults Component (UI rendering)
```

### 4. Features Implemented

- **Top 10 ranking**: Shows highest scoring samples based on sensory evaluation
- **Detailed scoring**: Breaks down sensory attributes (aroma, flavor, texture, etc.)
- **Award system**: Automatic medal assignment (Gold, Silver, Bronze) and special awards
- **Statistics dashboard**: Overview of total samples, evaluations, and performance metrics
- **Sample details**: Full evaluation breakdown with judge comments and recommendations
- **Internal code generation**: Automatic generation of internal sample codes
- **Status filtering**: Filter results by evaluation status

## Database Dependencies

### Required Tables

- `sensory_evaluations`: Core evaluation data with scores
- `samples`: Sample information and tracking codes
- `contests`: Contest details (name, description, location, dates)
- `profiles`: Participant and judge information

### Key Fields Used

- `sensory_evaluations.overall_quality`: Primary ranking field
- `sensory_evaluations.verdict`: Must be 'Approved' to appear in results
- All sensory attribute scores for detailed breakdown
- Sample tracking codes and internal code generation
- Contest and participant information for display

## Testing

### Test Data Script

Run `sqls/test-results-data.sql` to create sample data for testing:

- Creates 5 test samples with varying scores (9.2, 8.8, 8.5, 8.1, 7.9)
- Includes complete sensory evaluation data
- Sets up test contest and participant profiles
- Provides realistic score distributions for ranking

### Verification Steps

1. Navigate to `/dashboard/results` in the application
2. Verify top 10 samples are displayed in descending score order
3. Check that statistics show correct totals and averages
4. Click on individual results to view detailed breakdowns
5. Test refresh functionality to reload data
6. Verify empty states when no data exists

## API Integration Points

### Supabase Queries

- Uses Row Level Security (RLS) policies for data access
- Joins multiple tables for complete sample information
- Filters by `verdict = 'Approved'` to show only valid evaluations
- Orders by `overall_quality DESC` for ranking

### Error Handling

- Network error handling with user-friendly messages
- Graceful degradation when data is unavailable
- Retry functionality for failed requests
- Loading states during data fetching

## Future Enhancements

### Potential Improvements

1. **Real-time updates**: WebSocket integration for live score updates
2. **Export functionality**: PDF/Excel export of results
3. **Advanced filtering**: Filter by contest, category, date range
4. **Comparison tools**: Side-by-side sample comparisons
5. **Historical data**: Track performance over multiple contests
6. **Judge-specific views**: Results filtered by evaluating judge

### Performance Optimizations

1. **Pagination**: For large datasets (>100 samples)
2. **Caching**: Cache frequently accessed results
3. **Indexing**: Database indexes on key query fields
4. **Lazy loading**: Load detailed data only when needed

## Configuration

### Environment Variables

No additional environment variables required - uses existing Supabase configuration.

### Database Permissions

Ensure proper RLS policies are in place:

- Participants can view results of their own samples
- Judges can view evaluations they've completed
- Admins/Directors can view all results
- Public access to published results (if desired)

## Troubleshooting

### Common Issues

1. **No results showing**: Check if sensory evaluations exist with `verdict = 'Approved'`
2. **Loading errors**: Verify Supabase connection and RLS policies
3. **Incorrect rankings**: Ensure `overall_quality` scores are properly set
4. **Missing sample data**: Check foreign key relationships between tables

### Debug Steps

1. Check browser console for API errors
2. Verify database has evaluation data using test script
3. Test ResultsService methods directly in browser console
4. Check network tab for failed API requests
