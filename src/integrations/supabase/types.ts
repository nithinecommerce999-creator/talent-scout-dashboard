export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          company_domain: string | null
          company_industry: string | null
          company_linkedin_id: string | null
          company_locality: string | null
          company_name: string | null
          company_profile: string | null
          company_size: string | null
          company_uid: number
          company_website: string | null
          industry_category: string | null
          run_id: string | null
          run_label: string | null
        }
        Insert: {
          company_domain?: string | null
          company_industry?: string | null
          company_linkedin_id?: string | null
          company_locality?: string | null
          company_name?: string | null
          company_profile?: string | null
          company_size?: string | null
          company_uid: number
          company_website?: string | null
          industry_category?: string | null
          run_id?: string | null
          run_label?: string | null
        }
        Update: {
          company_domain?: string | null
          company_industry?: string | null
          company_linkedin_id?: string | null
          company_locality?: string | null
          company_name?: string | null
          company_profile?: string | null
          company_size?: string | null
          company_uid?: number
          company_website?: string | null
          industry_category?: string | null
          run_id?: string | null
          run_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_companies_run"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      job_details: {
        Row: {
          applicants: number | null
          apply_url: string | null
          base_salary: string | null
          company_id: number | null
          employment_type: string | null
          industry: string | null
          job_description: string | null
          job_id: number
          job_title: string | null
          job_url: string | null
          location: string | null
          posted_time: string | null
          run_id: string | null
          run_label: string | null
          seniority_level: string | null
        }
        Insert: {
          applicants?: number | null
          apply_url?: string | null
          base_salary?: string | null
          company_id?: number | null
          employment_type?: string | null
          industry?: string | null
          job_description?: string | null
          job_id: number
          job_title?: string | null
          job_url?: string | null
          location?: string | null
          posted_time?: string | null
          run_id?: string | null
          run_label?: string | null
          seniority_level?: string | null
        }
        Update: {
          applicants?: number | null
          apply_url?: string | null
          base_salary?: string | null
          company_id?: number | null
          employment_type?: string | null
          industry?: string | null
          job_description?: string | null
          job_id?: number
          job_title?: string | null
          job_url?: string | null
          location?: string | null
          posted_time?: string | null
          run_id?: string | null
          run_label?: string | null
          seniority_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_job_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_uid"]
          },
          {
            foreignKeyName: "fk_job_details_run"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      job_details_with_poster: {
        Row: {
          applicants: number | null
          apply_url: string | null
          base_salary: string | null
          company_id: number | null
          employment_type: string | null
          industry: string | null
          job_description: string | null
          job_id: number
          job_title: string | null
          job_url: string | null
          location: string | null
          posted_time: string | null
          recruiter_details: string | null
          recruiter_name: string | null
          recruiter_profile: string | null
          run_id: string | null
          run_label: string | null
          seniority_level: string | null
        }
        Insert: {
          applicants?: number | null
          apply_url?: string | null
          base_salary?: string | null
          company_id?: number | null
          employment_type?: string | null
          industry?: string | null
          job_description?: string | null
          job_id: number
          job_title?: string | null
          job_url?: string | null
          location?: string | null
          posted_time?: string | null
          recruiter_details?: string | null
          recruiter_name?: string | null
          recruiter_profile?: string | null
          run_id?: string | null
          run_label?: string | null
          seniority_level?: string | null
        }
        Update: {
          applicants?: number | null
          apply_url?: string | null
          base_salary?: string | null
          company_id?: number | null
          employment_type?: string | null
          industry?: string | null
          job_description?: string | null
          job_id?: number
          job_title?: string | null
          job_url?: string | null
          location?: string | null
          posted_time?: string | null
          recruiter_details?: string | null
          recruiter_name?: string | null
          recruiter_profile?: string | null
          run_id?: string | null
          run_label?: string | null
          seniority_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_poster_run"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "job_details_with_poster_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_uid"]
          },
        ]
      }
      no_poc_companies: {
        Row: {
          company_industry: string | null
          company_name: string | null
          company_uid: number | null
          company_website: string | null
          created_at: string | null
          id: number
          job_titles_searched: string | null
          run_date: string | null
        }
        Insert: {
          company_industry?: string | null
          company_name?: string | null
          company_uid?: number | null
          company_website?: string | null
          created_at?: string | null
          id?: number
          job_titles_searched?: string | null
          run_date?: string | null
        }
        Update: {
          company_industry?: string | null
          company_name?: string | null
          company_uid?: number | null
          company_website?: string | null
          created_at?: string | null
          id?: number
          job_titles_searched?: string | null
          run_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "no_poc_companies_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_uid"]
          },
        ]
      }
      poc_leads: {
        Row: {
          city: string | null
          company_domain: string | null
          company_linkedin: string | null
          company_linkedin_uid: string | null
          company_name: string | null
          company_size: string | null
          company_uid: number | null
          company_website: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          headline: string | null
          industry: string | null
          job_title: string | null
          last_name: string | null
          linkedin: string | null
          mobile_number: string | null
          original_job_titles: string | null
          personal_email: string | null
          poc_id: number
          run_id: string | null
          seniority_level: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          company_domain?: string | null
          company_linkedin?: string | null
          company_linkedin_uid?: string | null
          company_name?: string | null
          company_size?: string | null
          company_uid?: number | null
          company_website?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          headline?: string | null
          industry?: string | null
          job_title?: string | null
          last_name?: string | null
          linkedin?: string | null
          mobile_number?: string | null
          original_job_titles?: string | null
          personal_email?: string | null
          poc_id?: number
          run_id?: string | null
          seniority_level?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          company_domain?: string | null
          company_linkedin?: string | null
          company_linkedin_uid?: string | null
          company_name?: string | null
          company_size?: string | null
          company_uid?: number | null
          company_website?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          headline?: string | null
          industry?: string | null
          job_title?: string | null
          last_name?: string | null
          linkedin?: string | null
          mobile_number?: string | null
          original_job_titles?: string | null
          personal_email?: string | null
          poc_id?: number
          run_id?: string | null
          seniority_level?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poc_leads_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_uid"]
          },
        ]
      }
      ranked_poc_email_validations: {
        Row: {
          email: string | null
          email_quality: string | null
          email_result: string | null
          id: number
          poc_id: number | null
          subresult: string | null
          validated_at: string | null
        }
        Insert: {
          email?: string | null
          email_quality?: string | null
          email_result?: string | null
          id?: number
          poc_id?: number | null
          subresult?: string | null
          validated_at?: string | null
        }
        Update: {
          email?: string | null
          email_quality?: string | null
          email_result?: string | null
          id?: number
          poc_id?: number | null
          subresult?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_validation_poc"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "poc_leads"
            referencedColumns: ["poc_id"]
          },
        ]
      }
      ranked_pocs: {
        Row: {
          company_domain: string | null
          company_name: string | null
          company_uid: number | null
          created_at: string | null
          email: string | null
          email_type: string | null
          first_name: string | null
          full_name: string | null
          industry: string | null
          job_title: string | null
          last_name: string | null
          lead_rank: number | null
          linkedin: string | null
          match_type: string | null
          mobile_number: string | null
          partner_confidence_score: number | null
          personal_email: string | null
          poc_id: number | null
          ranked_poc_id: number
          run_id: string | null
          score_email: number | null
          score_hr_fallback: number | null
          score_linkedin_bonus: number | null
          score_poc_match: number | null
          score_seniority: number | null
          selected_email: string | null
          selection_reason: string | null
          total_leads_found: number | null
        }
        Insert: {
          company_domain?: string | null
          company_name?: string | null
          company_uid?: number | null
          created_at?: string | null
          email?: string | null
          email_type?: string | null
          first_name?: string | null
          full_name?: string | null
          industry?: string | null
          job_title?: string | null
          last_name?: string | null
          lead_rank?: number | null
          linkedin?: string | null
          match_type?: string | null
          mobile_number?: string | null
          partner_confidence_score?: number | null
          personal_email?: string | null
          poc_id?: number | null
          ranked_poc_id?: number
          run_id?: string | null
          score_email?: number | null
          score_hr_fallback?: number | null
          score_linkedin_bonus?: number | null
          score_poc_match?: number | null
          score_seniority?: number | null
          selected_email?: string | null
          selection_reason?: string | null
          total_leads_found?: number | null
        }
        Update: {
          company_domain?: string | null
          company_name?: string | null
          company_uid?: number | null
          created_at?: string | null
          email?: string | null
          email_type?: string | null
          first_name?: string | null
          full_name?: string | null
          industry?: string | null
          job_title?: string | null
          last_name?: string | null
          lead_rank?: number | null
          linkedin?: string | null
          match_type?: string | null
          mobile_number?: string | null
          partner_confidence_score?: number | null
          personal_email?: string | null
          poc_id?: number | null
          ranked_poc_id?: number
          run_id?: string | null
          score_email?: number | null
          score_hr_fallback?: number | null
          score_linkedin_bonus?: number | null
          score_poc_match?: number | null
          score_seniority?: number | null
          selected_email?: string | null
          selection_reason?: string | null
          total_leads_found?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ranked_pocs_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_uid"]
          },
          {
            foreignKeyName: "ranked_pocs_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "poc_leads"
            referencedColumns: ["poc_id"]
          },
        ]
      }
      recruiter_details: {
        Row: {
          city: string | null
          company_uid: number | null
          email: string | null
          first_name: string | null
          full_name: string | null
          headline: string | null
          job_title: string | null
          last_name: string | null
          mobile_no: string | null
          personal_email: string | null
          profile_linkedin: string | null
          recruiter_id: number
          seniority_level: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          company_uid?: number | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          headline?: string | null
          job_title?: string | null
          last_name?: string | null
          mobile_no?: string | null
          personal_email?: string | null
          profile_linkedin?: string | null
          recruiter_id?: number
          seniority_level?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          company_uid?: number | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          headline?: string | null
          job_title?: string | null
          last_name?: string | null
          mobile_no?: string | null
          personal_email?: string | null
          profile_linkedin?: string | null
          recruiter_id?: number
          seniority_level?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recruiter_company"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_uid"]
          },
        ]
      }
      recruiter_poc_scraped: {
        Row: {
          city: string | null
          company_uid: number | null
          connections: number | null
          created_at: string | null
          email: string | null
          first_name: string | null
          followers: number | null
          full_name: string | null
          headline: string | null
          id: number
          is_premium: boolean | null
          is_verified: boolean | null
          job_id: number | null
          job_title: string | null
          last_name: string | null
          linkedin_id: string | null
          mobile_no: string | null
          profile_linkedin: string
          profile_pic: string | null
          recruiter_name: string | null
          run_id: string | null
          run_label: string | null
          scraped_at: string | null
          scraped_company_name: string | null
          scraped_company_website: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          company_uid?: number | null
          connections?: number | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          followers?: number | null
          full_name?: string | null
          headline?: string | null
          id?: number
          is_premium?: boolean | null
          is_verified?: boolean | null
          job_id?: number | null
          job_title?: string | null
          last_name?: string | null
          linkedin_id?: string | null
          mobile_no?: string | null
          profile_linkedin: string
          profile_pic?: string | null
          recruiter_name?: string | null
          run_id?: string | null
          run_label?: string | null
          scraped_at?: string | null
          scraped_company_name?: string | null
          scraped_company_website?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          company_uid?: number | null
          connections?: number | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          followers?: number | null
          full_name?: string | null
          headline?: string | null
          id?: number
          is_premium?: boolean | null
          is_verified?: boolean | null
          job_id?: number | null
          job_title?: string | null
          last_name?: string | null
          linkedin_id?: string | null
          mobile_no?: string | null
          profile_linkedin?: string
          profile_pic?: string | null
          recruiter_name?: string | null
          run_id?: string | null
          run_label?: string | null
          scraped_at?: string | null
          scraped_company_name?: string | null
          scraped_company_website?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_poc_scraped_company_uid_fkey"
            columns: ["company_uid"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_uid"]
          },
          {
            foreignKeyName: "recruiter_poc_scraped_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_details_with_poster"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "recruiter_poc_scraped_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      runs: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          dataset_id: string | null
          duration_secs: number | null
          finished_at: string | null
          record_count: number | null
          run_date: string
          run_id: string
          run_label: string | null
          run_sequence_of_day: number
          started_at: string
          status: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          dataset_id?: string | null
          duration_secs?: number | null
          finished_at?: string | null
          record_count?: number | null
          run_date: string
          run_id: string
          run_label?: string | null
          run_sequence_of_day?: number
          started_at: string
          status?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          dataset_id?: string | null
          duration_secs?: number | null
          finished_at?: string | null
          record_count?: number | null
          run_date?: string
          run_id?: string
          run_label?: string | null
          run_sequence_of_day?: number
          started_at?: string
          status?: string | null
        }
        Relationships: []
      }
      unidentified_poc_leads: {
        Row: {
          city: string | null
          company_size: number | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          headline: string | null
          id: number
          industry: string | null
          inferred_domain: string | null
          job_title: string | null
          last_name: string | null
          linkedin: string | null
          mobile_number: string | null
          personal_email: string | null
          run_id: string | null
          searched_domain: string | null
          seniority_level: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          company_size?: number | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          headline?: string | null
          id?: number
          industry?: string | null
          inferred_domain?: string | null
          job_title?: string | null
          last_name?: string | null
          linkedin?: string | null
          mobile_number?: string | null
          personal_email?: string | null
          run_id?: string | null
          searched_domain?: string | null
          seniority_level?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          company_size?: number | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          headline?: string | null
          id?: number
          industry?: string | null
          inferred_domain?: string | null
          job_title?: string | null
          last_name?: string | null
          linkedin?: string | null
          mobile_number?: string | null
          personal_email?: string | null
          run_id?: string | null
          searched_domain?: string | null
          seniority_level?: string | null
          state?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
