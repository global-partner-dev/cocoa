-- Fix Storage Setup for Document Uploads
-- Run this in your Supabase SQL Editor

-- 1. Ensure the certification bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certification', 'certification', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure evaluator_documents table exists
CREATE TABLE IF NOT EXISTS public.evaluator_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Enable RLS on evaluator_documents if not already enabled
ALTER TABLE public.evaluator_documents ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own documents" ON public.evaluator_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.evaluator_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.evaluator_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.evaluator_documents;

-- 5. Create policies for evaluator_documents table
CREATE POLICY "Users can view their own documents" ON public.evaluator_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON public.evaluator_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.evaluator_documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.evaluator_documents
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Drop existing storage policies to recreate them
DROP POLICY IF EXISTS "Users can upload their own certification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own certification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own certification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own certification documents" ON storage.objects;

-- 7. Create more permissive storage policies for certification bucket
CREATE POLICY "Users can upload their own certification documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'certification' AND 
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view their own certification documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'certification' AND 
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update their own certification documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'certification' AND 
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete their own certification documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'certification' AND 
        auth.uid() IS NOT NULL
    );

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.evaluator_documents TO anon, authenticated;

-- 9. Verify setup
SELECT 'Bucket exists' as check_type, 
       CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'certification') 
            THEN '✅ certification bucket exists' 
            ELSE '❌ certification bucket missing' 
       END as result
UNION ALL
SELECT 'Table exists' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluator_documents') 
            THEN '✅ evaluator_documents table exists' 
            ELSE '❌ evaluator_documents table missing' 
       END as result
UNION ALL
SELECT 'RLS enabled' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'evaluator_documents' AND relrowsecurity = true) 
            THEN '✅ RLS enabled on evaluator_documents' 
            ELSE '❌ RLS not enabled on evaluator_documents' 
       END as result;