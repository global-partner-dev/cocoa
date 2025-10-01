# Contest-Specific Rankings Implementation

## Overview

This document describes the implementation of contest-specific results viewing in the ParticipantResults.tsx and FinalResults.tsx dashboards. Rankings are now calculated independently for each contest rather than globally across all contests.

## Problem Statement

Previously, the system calculated rankings globally across all contests. This meant that if multiple contests were running, participants from different contests would be ranked together, which was incorrect. Each contest should have its own independent ranking system.

## Solution Architecture

The solution was implemented across three layers:

### 1. Database Layer (SQL)

**Files Modified:**

- `sqls/top-results-table.sql` (updated)
- `sqls/fix-contest-specific-rankings.sql` (new migration file - **USE THIS ONE**)

**Changes:**

1. Fixed table reference from `public.samples` to `public.sample` (lines 9 and 60)
2. Modified the `recompute_top_results()` function (line 58)
   - Changed from: `row_number() over (order by a.avg_score desc, a.latest_date desc)`
   - Changed to: `row_number() over (partition by s.contest_id order by a.avg_score desc, a.latest_date desc)`

**Impact:**

- The `top_results` table now correctly references the `sample` table (not `samples`)
- Rankings are calculated independently per contest using `PARTITION BY s.contest_id`
- The trigger `trg_refresh_top_results` automatically recomputes these rankings when sensory evaluations change
- Rankings reset to 1 for each contest_id

### 2. Service Layer (TypeScript)

**File Modified:** `src/lib/resultsService.ts`

**Changes Made:**

1. **getTopSamplesByScore(limit, contestId?)**

   - Added optional `contestId` parameter
   - Applies `.eq('contest_id', contestId)` filter when provided
   - Returns top samples filtered by contest

2. **getAllEvaluatedSamples(contestId?)**

   - Added optional `contestId` parameter
   - Uses `.eq('sample.contest_id', contestId)` with inner join
   - Returns all evaluated samples for a specific contest

3. **getSamplesByUser(userId, contestId?)**

   - Added optional `contestId` parameter
   - Filters user-specific results by contest
   - Maintains backward compatibility

4. **getResultsStats(contestId?)**
   - Added optional `contestId` parameter
   - Filters both samples count and evaluations aggregation
   - Returns statistics for a specific contest or all contests

**Key Design Decision:**

- All contestId parameters are optional (defaults to undefined)
- This maintains backward compatibility with existing code
- When contestId is not provided, all contests are included

### 3. UI Layer (React Components)

#### ParticipantResults.tsx

**Changes:**

1. Added imports:

   - `ContestsService`
   - `ContestDisplay` type

2. Added state variables:

   ```typescript
   const [contests, setContests] = useState<ContestDisplay[]>([]);
   const [selectedContestId, setSelectedContestId] = useState<string>("all");
   ```

3. Added `loadContests()` function:

   - Fetches all available contests on component mount
   - Populates the contest selector dropdown

4. Modified data loading functions:

   - `loadResultsData()`: Passes `contestId` parameter to service calls
   - `loadMyResults()`: Passes `contestId` parameter for user-specific results

5. Added contest selector UI (lines 810-822):

   - Dropdown with "All Contests" option (value='all')
   - Dynamic list of all contests from database
   - Responsive design (full width on mobile, 200px on desktop)

6. Auto-reload on contest change:
   - useEffect dependency on `selectedContestId`
   - Results automatically reload when contest selection changes

#### FinalResults.tsx

**Changes:**

1. Added imports:

   - `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
   - `ContestsService`
   - `ContestDisplay` type

2. Added state variables:

   ```typescript
   const [contests, setContests] = useState<ContestDisplay[]>([]);
   const [selectedContestId, setSelectedContestId] = useState<string>("all");
   ```

3. Added `loadContests()` function:

   - Fetches all available contests on component mount

4. Modified `load()` function:

   - Changed query to use `sample:sample_id!inner` for proper filtering
   - Added `contest_id` to sample selection
   - Applies `.eq('sample.contest_id', selectedContestId)` when not 'all'

5. Added contest selector UI:

   - Dropdown in header section alongside refresh button
   - "All Contests" option (value='all')
   - Dynamic list of all contests
   - Responsive design

6. Auto-reload on contest change:
   - useEffect dependency on `selectedContestId`

## Technical Details

### Database Schema

- The `top_results` table already had a `contest_id` column
- No schema changes were required
- The `contest_id` is a foreign key with an index for performance

### Query Optimization

- Used inner joins (`sample!inner`) to ensure proper filtering
- Leveraged existing indexes on `contest_id`
- Rankings are calculated at the database level for consistency

### Row Level Security (RLS)

- Existing RLS policies continue to work correctly
- Contest filtering doesn't conflict with RLS
- Judges can view all evaluations across contests

## Testing Recommendations

1. **Database Level:**

   - Run the SQL migration to update the `recompute_top_results()` function
   - Verify rankings are calculated per contest by querying `top_results` table
   - Check that rankings reset to 1 for each contest_id

2. **Service Level:**

   - Test each service method with and without contestId parameter
   - Verify backward compatibility (no contestId = all contests)
   - Check that filtering works correctly with inner joins

3. **UI Level:**

   - Test contest selector in both ParticipantResults and FinalResults
   - Verify "All Contests" option shows combined results
   - Test contest-specific filtering
   - Verify responsive design on mobile and desktop
   - Check that results reload automatically when contest changes

4. **Integration Testing:**
   - Create multiple contests with samples
   - Submit evaluations for samples in different contests
   - Verify rankings are independent per contest
   - Check that switching contests updates the displayed results

## Future Enhancements

1. **Contest Column in Results Tables:**

   - When "All Contests" is selected, consider adding a "Contest" column to show which contest each result belongs to

2. **PDF Reports:**

   - Update PDF report generation to include contest-specific information
   - Consider adding contest name to report headers

3. **Performance Monitoring:**

   - Monitor query performance with large numbers of contests
   - Consider adding caching if needed

4. **Additional Filtering:**
   - Consider adding date range filters
   - Add ability to compare results across contests

## Files Modified

1. `sqls/top-results-table.sql` - Database ranking function (updated)
2. `sqls/fix-contest-specific-rankings.sql` - **Migration file to apply (NEW)**
3. `src/lib/resultsService.ts` - Service layer filtering
4. `src/components/dashboard/ParticipantResults.tsx` - UI with contest selector
5. `src/components/dashboard/FinalResults.tsx` - UI with contest selector

## Deployment Notes

1. **SQL Migration:**

   - **IMPORTANT:** Run the migration file `sqls/fix-contest-specific-rankings.sql` on your database
   - This file fixes the table reference from `samples` to `sample` and implements contest-specific rankings
   - The migration will:
     - Drop and recreate the `top_results` table with correct foreign key reference
     - Update the `recompute_top_results()` function with `PARTITION BY contest_id`
     - Recreate the trigger to keep rankings up to date
     - Automatically populate the table with contest-specific rankings
   - Existing data in `top_results` table will be cleared and recomputed correctly

2. **Application Deployment:**

   - No breaking changes to existing functionality
   - All changes are backward compatible
   - No environment variables or configuration changes needed

3. **Data Migration:**
   - No manual data migration required
   - Rankings will be automatically recomputed by the migration script
   - The trigger will keep rankings updated automatically going forward

## Conclusion

The implementation successfully adds contest-specific ranking functionality while maintaining backward compatibility. Rankings are now calculated independently for each contest at the database level, ensuring consistency across the application. The UI provides an intuitive way to filter results by contest, with responsive design for mobile and desktop users.
