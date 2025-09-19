# 🔧 Storage Fix Guide - Document Upload Issue

## 🎯 **Problem**

Evaluator documents are not being saved to Supabase Storage during registration.

## 🛠️ **Solution Steps**

### **Step 1: Run the Storage Setup SQL**

1. **Go to your Supabase Dashboard**
2. **Navigate to**: SQL Editor
3. **Run the script**: `fix-storage-setup.sql`

This will:

- ✅ Create the `certification` bucket
- ✅ Create the `evaluator_documents` table
- ✅ Set up proper RLS policies
- ✅ Grant necessary permissions

### **Step 2: Verify Setup**

After running the SQL script, you should see output like:

```
✅ certification bucket exists
✅ evaluator_documents table exists
✅ RLS enabled on evaluator_documents
```

### **Step 3: Test Document Upload**

1. **Go to**: `http://localhost:8081/register`
2. **Select role**: "Evaluator"
3. **Upload test documents** (PDF, JPEG, or PNG)
4. **Complete registration**
5. **Check browser console** for detailed logs

### **Step 4: Verify in Supabase Dashboard**

#### **Check Storage:**

1. **Go to**: Storage > certification bucket
2. **Look for**: `evaluator-documents/[user-id]/[filename]`

#### **Check Database:**

1. **Go to**: Table Editor > evaluator_documents
2. **Verify**: Document metadata is saved

---

## 🔍 **Debugging Information**

### **Enhanced Logging**

The code now includes detailed console logging:

- ✅ File upload start/completion
- ✅ Authentication status
- ✅ Storage upload details
- ✅ Database insert details
- ✅ Error details with codes

### **Common Issues & Solutions**

#### **Issue 1: "User not authenticated"**

- **Cause**: User session expired during registration
- **Solution**: Refresh page and try again

#### **Issue 2: "Storage upload failed"**

- **Cause**: Bucket doesn't exist or wrong permissions
- **Solution**: Run the `fix-storage-setup.sql` script

#### **Issue 3: "Database error"**

- **Cause**: `evaluator_documents` table missing or RLS issues
- **Solution**: Run the `fix-storage-setup.sql` script

#### **Issue 4: "Policy violation"**

- **Cause**: RLS policies too restrictive
- **Solution**: The new policies are more permissive

---

## 📋 **Files Modified**

### **Enhanced Files:**

1. **`src/lib/storage.ts`** - Added detailed logging and error handling
2. **`src/hooks/useAuth.tsx`** - Improved document upload process
3. **`fix-storage-setup.sql`** - Comprehensive setup script

### **New Files:**

1. **`test-storage.js`** - Storage testing utility
2. **`STORAGE_FIX_GUIDE.md`** - This guide

---

## 🧪 **Testing Checklist**

- [ ] Run `fix-storage-setup.sql` in Supabase
- [ ] Verify bucket exists in Storage dashboard
- [ ] Verify table exists in Table Editor
- [ ] Test evaluator registration with documents
- [ ] Check console logs for errors
- [ ] Verify files appear in Storage
- [ ] Verify metadata appears in database

---

## 🎉 **Expected Result**

After following these steps:

1. **Evaluator registration** with documents should work
2. **Files** should appear in `certification` bucket
3. **Metadata** should be saved in `evaluator_documents` table
4. **Console logs** should show successful uploads
5. **No errors** in browser console

---

## 🆘 **Still Having Issues?**

If problems persist:

1. **Check browser console** for detailed error messages
2. **Check Supabase logs** in Dashboard > Logs
3. **Verify your Supabase URL and keys** in environment variables
4. **Test with the `test-storage.js` script** (update with your credentials)

The enhanced logging will help identify exactly where the process is failing!
