-- Supabase Database Schema for Cocoa & Chocolate Quality Competition

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'director', 'judge', 'participant', 'evaluator')),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create evaluator_documents table
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

-- Create storage bucket for certification documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certification', 'certification', false)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluator_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for evaluator_documents table
CREATE POLICY "Users can view their own documents" ON public.evaluator_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON public.evaluator_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.evaluator_documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.evaluator_documents
    FOR DELETE USING (auth.uid() = user_id);

-- Create storage policies for certification bucket
CREATE POLICY "Users can upload their own certification documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'certification' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own certification documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'certification' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own certification documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'certification' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own certification documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'certification' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'participant')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.evaluator_documents TO anon, authenticated;

-- Insert demo data (optional)
-- Note: These will only work if you create the corresponding auth users first
/*
INSERT INTO public.profiles (id, email, name, role, phone, is_verified) VALUES
    ('00000000-0000-0000-0000-000000000001', 'test.admin@gmail.com', 'Admin User', 'admin', '+1234567890', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'test.director@gmail.com', 'Director User', 'director', '+1234567891', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'test.judge@gmail.com', 'Judge User', 'judge', '+1234567892', TRUE),
    ('00000000-0000-0000-0000-000000000004', 'test.participant@gmail.com', 'Participant User', 'participant', '+1234567893', TRUE),
    ('00000000-0000-0000-0000-000000000005', 'test.evaluator@gmail.com', 'Evaluator User', 'evaluator', '+1234567894', TRUE)
ON CONFLICT (id) DO NOTHING;
*/