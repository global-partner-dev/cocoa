# Payment System Fix - Sample Table Update Issue

## Problem Description

After a successful PayPal payment, the payment fields in the `sample` table were not being updated. The system was only creating records in the `payments` table but not updating the corresponding sample's payment status.

## Root Cause

The PayPal capture edge function (`supabase/functions/paypal-capture/index.ts`) was:

1. ✅ Creating payment records in the `payments` table
2. ❌ **NOT updating** the payment fields in the `sample` table

The `sample` table has three payment-related fields that should be updated after successful payment:

- `payment_method` - Should be set to 'paypal'
- `payment_status` - Should be set to 'completed'
- `payment_reference` - Should be set to the PayPal order ID

## Changes Made

### 1. Fixed Table Name References

Changed from `'samples'` (plural) to `'sample'` (singular) to match the current database schema:

- Line 106: `.from('sample')` for evaluator payment lookup
- Line 122: `.from('sample')` for director payment lookup

### 2. Added Sample Table Updates for Evaluator Payments

After creating the payment record in the `payments` table, the function now updates the sample:

```typescript
// Update sample payment fields
const { error: updateErr } = await admin
  .from("sample")
  .update({
    payment_method: "paypal",
    payment_status: "completed",
    payment_reference: orderId,
  })
  .eq("id", sampleId);
```

### 3. Added Sample Table Updates for Director Payments

After creating payment records for multiple samples, the function now updates all samples:

```typescript
// Update sample payment fields for all paid samples
const { error: updateErr } = await admin
  .from("sample")
  .update({
    payment_method: "paypal",
    payment_status: "completed",
    payment_reference: orderId,
  })
  .in("id", sampleIds);
```

## Error Handling

The sample table updates are designed to be non-blocking:

- If the update fails, it logs an error but doesn't fail the entire transaction
- The payment record in the `payments` table is already created successfully
- This ensures payment data is preserved even if the sample update fails

## Deployment Instructions

To deploy the updated edge function to Supabase:

### Option 1: Using Supabase CLI

```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Deploy the edge function
supabase functions deploy paypal-capture
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** section
3. Find the `paypal-capture` function
4. Click **Edit** or **Deploy**
5. Copy the contents of `supabase/functions/paypal-capture/index.ts`
6. Paste and save

### Option 3: Manual Deployment via API

If you have the Supabase management API access, you can deploy programmatically.

## Testing

After deployment, test the payment flow:

### For Evaluator Payments:

1. Log in as an evaluator
2. Navigate to a top-ranked sample
3. Click to pay for evaluation access
4. Complete PayPal payment
5. Verify in database:
   - `payments` table has new record with `role='evaluator'`
   - `sample` table has updated fields:
     - `payment_method = 'paypal'`
     - `payment_status = 'completed'`
     - `payment_reference = <PayPal Order ID>`

### For Director Payments:

1. Log in as a director
2. Navigate to Sample Management
3. Select multiple samples with status='received'
4. Click to pay for physical evaluation
5. Complete PayPal payment
6. Verify in database:
   - `payments` table has multiple records (one per sample)
   - All samples in `sample` table have updated payment fields

## Database Schema Reference

### `sample` table payment fields:

```sql
payment_method TEXT CHECK (payment_method IN ('credit_card', 'bank_transfer', 'paypal'))
payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'))
payment_reference TEXT
```

### `payments` table:

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
role TEXT CHECK (role IN ('participant','evaluator','director'))
amount_cents BIGINT
currency TEXT DEFAULT 'USD'
status TEXT CHECK (status IN ('paid','refunded','failed','pending'))
source TEXT
sample_id UUID REFERENCES sample(id)
created_at TIMESTAMPTZ
```

## Impact

This fix ensures:

- ✅ Complete payment tracking in both `payments` and `sample` tables
- ✅ Sample payment status is visible in sample queries
- ✅ Payment reference (PayPal order ID) is stored for auditing
- ✅ Consistent data across the system
- ✅ Better reporting and analytics capabilities

## Files Modified

- `supabase/functions/paypal-capture/index.ts` - Updated to include sample table updates

## Related Files (No Changes Required)

- `src/lib/financeService.ts` - Payment service (no changes needed)
- `src/components/payments/PayPalButton.tsx` - PayPal button component (no changes needed)
- `sqls/samples_new_schema.sql` - Sample table schema definition (reference only)
