import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          role: 'admin' | 'director' | 'judge' | 'participant' | 'evaluator'
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          phone?: string | null
          role: 'admin' | 'director' | 'judge' | 'participant' | 'evaluator'
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string | null
          role?: 'admin' | 'director' | 'judge' | 'participant' | 'evaluator'
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      evaluator_documents: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          uploaded_at?: string
        }
      }
      contests: {
        Row: {
          id: string
          name: string
          description: string
          location: string
          start_date: string
          end_date: string
          sample_price: number
          evaluation_price: number
          final_evaluation: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          location: string
          start_date: string
          end_date: string
          sample_price: number
          evaluation_price: number
          final_evaluation?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          location?: string
          start_date?: string
          end_date?: string
          sample_price?: number
          evaluation_price?: number
          final_evaluation?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      samples: {
        Row: {
          id: string
          contest_id: string
          user_id: string
          tracking_code: string
          qr_code_data: string
          qr_code_url: string | null
          country: string
          department: string | null
          municipality: string | null
          district: string | null
          farm_name: string
          cocoa_area_hectares: number | null
          owner_full_name: string
          identification_document: string | null
          phone_number: string | null
          email: string | null
          home_address: string | null
          belongs_to_cooperative: boolean
          cooperative_name: string | null
          quantity: number
          genetic_material: string | null
          crop_age: number | null
          sample_source_hectares: number | null
          moisture_content: number | null
          fermentation_percentage: number | null
          fermenter_type: string | null
          fermentation_time: number | null
          drying_type: string | null
          drying_time: number | null
          variety: string | null
          payment_method: 'credit_card' | 'bank_transfer' | 'paypal' | null
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_reference: string | null
          status: 'submitted' | 'received' | 'disqualified' | 'approved' | 'evaluated'
          agreed_to_terms: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contest_id: string
          user_id: string
          tracking_code: string
          qr_code_data?: string
          qr_code_url?: string | null
          country: string
          department?: string | null
          municipality?: string | null
          district?: string | null
          farm_name: string
          cocoa_area_hectares?: number | null
          owner_full_name: string
          identification_document?: string | null
          phone_number?: string | null
          email?: string | null
          home_address?: string | null
          belongs_to_cooperative: boolean
          cooperative_name?: string | null
          quantity: number
          genetic_material?: string | null
          crop_age?: number | null
          sample_source_hectares?: number | null
          moisture_content?: number | null
          fermentation_percentage?: number | null
          fermenter_type?: string | null
          fermentation_time?: number | null
          drying_type?: string | null
          drying_time?: number | null
          variety?: string | null
          payment_method?: 'credit_card' | 'bank_transfer' | 'paypal' | null
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_reference?: string | null
          status?: 'submitted' | 'received' | 'disqualified' | 'approved' | 'evaluated'
          agreed_to_terms: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contest_id?: string
          user_id?: string
          tracking_code?: string
          qr_code_data?: string
          qr_code_url?: string | null
          country?: string
          department?: string | null
          municipality?: string | null
          district?: string | null
          farm_name?: string
          cocoa_area_hectares?: number | null
          owner_full_name?: string
          identification_document?: string | null
          phone_number?: string | null
          email?: string | null
          home_address?: string | null
          belongs_to_cooperative?: boolean
          cooperative_name?: string | null
          quantity?: number
          genetic_material?: string | null
          crop_age?: number | null
          sample_source_hectares?: number | null
          moisture_content?: number | null
          fermentation_percentage?: number | null
          fermenter_type?: string | null
          fermentation_time?: number | null
          drying_type?: string | null
          drying_time?: number | null
          variety?: string | null
          payment_method?: 'credit_card' | 'bank_transfer' | 'paypal' | null
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          payment_reference?: string | null
          status?: 'submitted' | 'received' | 'disqualified' | 'approved' | 'evaluated'
          agreed_to_terms?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      final_evaluations: {
        Row: {
          id: string
          contest_id: string
          sample_id: string
          evaluator_id: string
          evaluation_date: string
          overall_quality: number
          flavor_comments: string | null
          producer_recommendations: string | null
          additional_positive: string | null
          cacao: number | null
          bitterness: number | null
          astringency: number | null
          caramel_panela: number | null
          acidity_total: number | null
          fresh_fruit_total: number | null
          brown_fruit_total: number | null
          vegetal_total: number | null
          floral_total: number | null
          wood_total: number | null
          spice_total: number | null
          nut_total: number | null
          roast_degree: number | null
          defects_total: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contest_id: string
          sample_id: string
          evaluator_id: string
          evaluation_date?: string
          overall_quality: number
          flavor_comments?: string | null
          producer_recommendations?: string | null
          additional_positive?: string | null
          cacao?: number | null
          bitterness?: number | null
          astringency?: number | null
          caramel_panela?: number | null
          acidity_total?: number | null
          fresh_fruit_total?: number | null
          brown_fruit_total?: number | null
          vegetal_total?: number | null
          floral_total?: number | null
          wood_total?: number | null
          spice_total?: number | null
          nut_total?: number | null
          roast_degree?: number | null
          defects_total?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contest_id?: string
          sample_id?: string
          evaluator_id?: string
          evaluation_date?: string
          overall_quality?: number
          flavor_comments?: string | null
          producer_recommendations?: string | null
          additional_positive?: string | null
          cacao?: number | null
          bitterness?: number | null
          astringency?: number | null
          caramel_panela?: number | null
          acidity_total?: number | null
          fresh_fruit_total?: number | null
          brown_fruit_total?: number | null
          vegetal_total?: number | null
          floral_total?: number | null
          wood_total?: number | null
          spice_total?: number | null
          nut_total?: number | null
          roast_degree?: number | null
          defects_total?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      physical_evaluations: {
        Row: {
          id: string
          sample_id: string
          undesirable_aromas: string[]
          has_undesirable_aromas: boolean
          percentage_humidity: number
          broken_grains: number
          violated_grains: boolean
          flat_grains: number
          affected_grains_insects: number
          has_affected_grains: boolean
          well_fermented_beans: number
          lightly_fermented_beans: number
          purple_beans: number
          slaty_beans: number
          internal_moldy_beans: number
          over_fermented_beans: number
          notes: string
          evaluated_by: string
          evaluated_at: string
          global_evaluation: 'passed' | 'disqualified'
          disqualification_reasons: string[]
          warnings: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sample_id: string
          undesirable_aromas?: string[]
          has_undesirable_aromas?: boolean
          percentage_humidity?: number
          broken_grains?: number
          violated_grains?: boolean
          flat_grains?: number
          affected_grains_insects?: number
          has_affected_grains?: boolean
          well_fermented_beans?: number
          lightly_fermented_beans?: number
          purple_beans?: number
          slaty_beans?: number
          internal_moldy_beans?: number
          over_fermented_beans?: number
          notes?: string
          evaluated_by?: string
          evaluated_at?: string
          global_evaluation?: 'passed' | 'disqualified'
          disqualification_reasons?: string[]
          warnings?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sample_id?: string
          undesirable_aromas?: string[]
          has_undesirable_aromas?: boolean
          percentage_humidity?: number
          broken_grains?: number
          violated_grains?: boolean
          flat_grains?: number
          affected_grains_insects?: number
          has_affected_grains?: boolean
          well_fermented_beans?: number
          lightly_fermented_beans?: number
          purple_beans?: number
          slaty_beans?: number
          internal_moldy_beans?: number
          over_fermented_beans?: number
          notes?: string
          evaluated_by?: string
          evaluated_at?: string
          global_evaluation?: 'passed' | 'disqualified'
          disqualification_reasons?: string[]
          warnings?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          role: 'participant' | 'evaluator'
          amount_cents: number
          currency: string
          status: 'paid' | 'refunded' | 'failed' | 'pending'
          source: string | null
          sample_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'participant' | 'evaluator'
          amount_cents: number
          currency?: string
          status?: 'paid' | 'refunded' | 'failed' | 'pending'
          source?: string | null
          sample_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'participant' | 'evaluator'
          amount_cents?: number
          currency?: string
          status?: 'paid' | 'refunded' | 'failed' | 'pending'
          source?: string | null
          sample_id?: string | null
          created_at?: string
        }
      }
      judge_assignments: {
        Row: {
          id: string
          sample_id: string
          judge_id: string
          assigned_by: string
          assigned_at: string
          status: 'assigned' | 'evaluating' | 'completed'
          notes: string | null
        }
        Insert: {
          id?: string
          sample_id: string
          judge_id: string
          assigned_by: string
          assigned_at?: string
          status?: 'assigned' | 'evaluating' | 'completed'
          notes?: string | null
        }
        Update: {
          id?: string
          sample_id?: string
          judge_id?: string
          assigned_by?: string
          assigned_at?: string
          status?: 'assigned' | 'evaluating' | 'completed'
          notes?: string | null
        }
      }
    }
  }
}