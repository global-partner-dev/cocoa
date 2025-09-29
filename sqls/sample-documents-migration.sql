-- Migration to add sample documents support
-- This adds a table to store document attachments for sample submissions

-- Create sample_documents table
CREATE TABLE IF NOT EXISTS public.sample_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sample_id UUID REFERENCES public.sample(id) ON DELETE CASCADE NOT NULL,
    
    -- File Information
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in storage bucket
    file_size INTEGER NOT NULL, -- Size in bytes
    file_type TEXT NOT NULL, -- MIME type
    
    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sample_documents_sample_id ON public.sample_documents(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_documents_uploaded_by ON public.sample_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_sample_documents_uploaded_at ON public.sample_documents(uploaded_at);

-- Enable Row Level Security
ALTER TABLE public.sample_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for sample_documents table

-- Users can view documents for their own samples
CREATE POLICY "Users can view their own sample documents" ON public.sample_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = sample_documents.sample_id AND user_id = auth.uid()
        )
    );

-- Users can insert documents for their own samples
CREATE POLICY "Users can insert their own sample documents" ON public.sample_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = sample_documents.sample_id AND user_id = auth.uid()
        ) AND uploaded_by = auth.uid()
    );

-- Users can delete their own sample documents (only if sample status allows)
CREATE POLICY "Users can delete their own sample documents" ON public.sample_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.sample
            WHERE id = sample_documents.sample_id AND user_id = auth.uid()
            AND status IN ('draft', 'submitted', 'received')
        ) AND uploaded_by = auth.uid()
    );

-- Staff can view all sample documents
CREATE POLICY "Staff can view all sample documents" ON public.sample_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director', 'judge', 'evaluator')
        )
    );

-- Admins and directors can delete any sample document
CREATE POLICY "Admins and directors can delete sample documents" ON public.sample_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- Create storage bucket for sample documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('sample-documents', 'sample-documents', false) -- Private bucket for security
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for sample documents bucket

-- Users can view documents for their own samples
CREATE POLICY "Users can view their own sample documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'sample-documents' AND
        EXISTS (
            SELECT 1 FROM public.sample_documents sd
            JOIN public.sample s ON s.id = sd.sample_id
            WHERE sd.file_path = name AND s.user_id = auth.uid()
        )
    );

-- Users can upload documents for their own samples
CREATE POLICY "Users can upload their own sample documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'sample-documents' AND
        auth.uid() IS NOT NULL
    );

-- Users can delete their own sample documents
CREATE POLICY "Users can delete their own sample documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'sample-documents' AND
        EXISTS (
            SELECT 1 FROM public.sample_documents sd
            JOIN public.sample s ON s.id = sd.sample_id
            WHERE sd.file_path = name AND s.user_id = auth.uid()
            AND s.status IN ('draft', 'submitted', 'received')
        )
    );

-- Staff can view all sample documents
CREATE POLICY "Staff can view all sample documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'sample-documents' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director', 'judge', 'evaluator')
        )
    );

-- Admins and directors can delete any sample document
CREATE POLICY "Admins and directors can delete sample documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'sample-documents' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.sample_documents TO anon, authenticated;

-- Add additional description column to sample table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sample' AND column_name = 'additional_sample_description') THEN
        ALTER TABLE public.sample ADD COLUMN additional_sample_description TEXT;
    END IF;
END $$;