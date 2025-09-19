# Contest Management Database Integration

This document outlines the integration of the Contest Management feature with a real database, replacing the previous mock data implementation.

## Overview

The Contest Management feature has been upgraded to use Supabase as the backend database instead of mock data. This provides persistent storage, user authentication, and proper access control.

## Changes Made

### 1. Database Schema

- **New Table**: `contests` table added to store contest information
- **Location**: `contests-migration.sql`
- **Fields**:
  - `id` (UUID, Primary Key)
  - `name` (Text, Required)
  - `description` (Text, Required)
  - `location` (Text, Required)
  - `start_date` (Date, Required)
  - `end_date` (Date, Required)
  - `sample_price` (Decimal, Required)
  - `status` (Calculated dynamically based on dates - not stored in database)
  - `created_by` (UUID, Foreign Key to profiles)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### 2. Row Level Security (RLS)

- **View Access**: All authenticated users can view contests
- **Management Access**: Only admins and directors can create, update, or delete contests
- **Policies**: Comprehensive RLS policies implemented for data security

### 3. TypeScript Types

- **Updated**: `src/lib/supabase.ts` with contest table types
- **Added**: Type definitions for database operations

### 4. Service Layer

- **New File**: `src/lib/contestsService.ts`
- **Features**:
  - CRUD operations for contests
  - Permission checking
  - Error handling
  - Data transformation between database and UI formats

### 5. UI Components

- **Updated**: `src/components/dashboard/ContestManagement.tsx`
- **Features**:
  - Real-time database operations
  - Loading states
  - Error handling
  - Permission-based access control
  - Optimistic UI updates

### 6. Permissions Hook

- **New File**: `src/hooks/usePermissions.tsx`
- **Purpose**: Centralized permission checking for UI components

## Setup Instructions

### 1. Run Database Migration

Execute the migration script in your Supabase SQL editor:

```sql
-- Run the contents of contests-migration.sql
```

Or via Supabase CLI:

```bash
supabase db reset
# Then apply the migration
```

### 2. Verify Environment Variables

Ensure your `.env` file contains:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 3. Test User Permissions

Make sure you have users with appropriate roles:

- **Admin**: Full access to contest management
- **Director**: Full access to contest management
- **Other roles**: View-only access

## Features

### For Administrators and Directors

- ✅ Create new contests
- ✅ Edit existing contests
- ✅ Delete contests
- ✅ View all contests
- ✅ Real-time updates

### For Other Users

- ✅ View contests (read-only)
- ❌ Create/Edit/Delete contests (permission denied)

### Dynamic Status Calculation

Contest status is automatically calculated based on the current date and contest dates:

- **Upcoming**: Current date is before the start date
- **Active**: Current date is between start date and end date (inclusive)
- **Completed**: Current date is after the end date

This eliminates the need for manual status updates and ensures accuracy.

### Technical Features

- ✅ Real-time database synchronization
- ✅ Optimistic UI updates
- ✅ Comprehensive error handling
- ✅ Loading states
- ✅ Permission-based access control
- ✅ Data validation
- ✅ Responsive design
- ✅ Dynamic status calculation

## API Reference

### ContestsService Methods

```typescript
// Get all contests
ContestsService.getAllContests(): Promise<ContestDisplay[]>

// Get contest by ID
ContestsService.getContestById(id: string): Promise<ContestDisplay | null>

// Create new contest
ContestsService.createContest(contest: Omit<ContestDisplay, 'id'>): Promise<ContestDisplay>

// Update contest
ContestsService.updateContest(id: string, updates: Partial<Omit<ContestDisplay, 'id'>>): Promise<ContestDisplay>

// Delete contest
ContestsService.deleteContest(id: string): Promise<void>

// Note: Contest status is calculated dynamically based on dates

// Get contests by status
ContestsService.getContestsByStatus(status: 'upcoming' | 'active' | 'completed'): Promise<ContestDisplay[]>

// Get contests available for sample submission (upcoming and active)
ContestsService.getAvailableContests(): Promise<ContestDisplay[]>

// Check permissions
ContestsService.canManageContests(): Promise<boolean>
```

## Error Handling

The system includes comprehensive error handling:

- **Database Errors**: Caught and displayed to users with meaningful messages
- **Permission Errors**: Users see appropriate access denied messages
- **Network Errors**: Graceful handling with retry suggestions
- **Validation Errors**: Form validation with user-friendly feedback

## Security

- **Row Level Security**: Database-level access control
- **Authentication**: All operations require valid user session
- **Authorization**: Role-based permissions (admin/director only for management)
- **Data Validation**: Both client-side and server-side validation

## Migration from Mock Data

The integration maintains backward compatibility:

- Same UI interface and user experience
- Same data structure (with minor field name adjustments)
- Demo data automatically inserted during migration
- No breaking changes to existing functionality

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**

   - Verify user role in the `profiles` table
   - Ensure RLS policies are correctly applied

2. **Database Connection Issues**

   - Check environment variables
   - Verify Supabase project status

3. **Migration Errors**
   - Ensure all dependencies are installed
   - Check for existing table conflicts

### Debug Steps

1. Check browser console for detailed error messages
2. Verify user authentication status
3. Test database connection in Supabase dashboard
4. Review RLS policies in Supabase

## Future Enhancements

Potential improvements for future versions:

- Contest categories and tags
- Participant registration system
- Judging criteria management
- Contest results and scoring
- Email notifications
- Contest templates
- Bulk operations
- Advanced filtering and search
- Contest analytics and reporting

## Support

For issues or questions regarding the Contest Management integration:

1. Check the troubleshooting section above
2. Review the error messages in the browser console
3. Verify database schema and permissions
4. Test with different user roles
