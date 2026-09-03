export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          channel_id: string | null
          email: string
          normalized_email: string
          company: string | null
          contact: string | null
          phone: string | null
          website: string | null
          instagram: string | null
          facebook: string | null
          telegram: string | null
          country: string | null
          subscribers: number | null
          lead_status: string
          lead_stage: string | null
          lead_score: string | null
          source: string | null
          keyword: string | null
          matched_keywords: string | null
          notes: string | null
          crm_notes: string | null
          tags: string[] | null
          verification_status: string
          approval_status: string
          lead_owner: string | null
          send_mail: boolean | null
          status: string | null
          reply_status: string | null
          sent_time: string | null
          last_followup_time: string | null
          followup_count: number
          thread_id: string | null
          campaign_id: string | null
          demo_sent: boolean | null
          demo_sent_time: string | null
          demo_type: string | null
          interested: boolean | null
          meeting_scheduled: boolean | null
          closed_won: boolean | null
          closed_lost: boolean | null
          last_reply_time: string | null
          email_sent_at: string | null
          email_thread_id: string | null
          added_date: string
          last_updated: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id?: string | null
          email: string
          normalized_email: string
          company?: string | null
          contact?: string | null
          phone?: string | null
          website?: string | null
          instagram?: string | null
          facebook?: string | null
          telegram?: string | null
          country?: string | null
          subscribers?: number | null
          lead_status?: string
          lead_stage?: string | null
          lead_score?: string | null
          source?: string | null
          keyword?: string | null
          matched_keywords?: string | null
          notes?: string | null
          crm_notes?: string | null
          tags?: string[] | null
          verification_status?: string
          approval_status?: string
          lead_owner?: string | null
          send_mail?: boolean | null
          status?: string | null
          reply_status?: string | null
          sent_time?: string | null
          last_followup_time?: string | null
          followup_count?: number
          thread_id?: string | null
          campaign_id?: string | null
          demo_sent?: boolean | null
          demo_sent_time?: string | null
          demo_type?: string | null
          interested?: boolean | null
          meeting_scheduled?: boolean | null
          closed_won?: boolean | null
          closed_lost?: boolean | null
          last_reply_time?: string | null
          email_sent_at?: string | null
          email_thread_id?: string | null
          added_date?: string
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string | null
          email?: string
          normalized_email?: string
          company?: string | null
          contact?: string | null
          phone?: string | null
          website?: string | null
          instagram?: string | null
          facebook?: string | null
          telegram?: string | null
          country?: string | null
          subscribers?: number | null
          lead_status?: string
          lead_stage?: string | null
          lead_score?: string | null
          source?: string | null
          keyword?: string | null
          matched_keywords?: string | null
          notes?: string | null
          crm_notes?: string | null
          tags?: string[] | null
          verification_status?: string
          approval_status?: string
          lead_owner?: string | null
          send_mail?: boolean | null
          status?: string | null
          reply_status?: string | null
          sent_time?: string | null
          last_followup_time?: string | null
          followup_count?: number
          thread_id?: string | null
          campaign_id?: string | null
          demo_sent?: boolean | null
          demo_sent_time?: string | null
          demo_type?: string | null
          interested?: boolean | null
          meeting_scheduled?: boolean | null
          closed_won?: boolean | null
          closed_lost?: boolean | null
          last_reply_time?: string | null
          email_sent_at?: string | null
          email_thread_id?: string | null
          added_date?: string
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          id: string
          search_keyword: string
          keywords: string[]
          searched_at: string
          total_leads_found: number
          filters: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          search_keyword: string
          keywords?: string[]
          searched_at?: string
          total_leads_found?: number
          filters?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          search_keyword?: string
          keywords?: string[]
          searched_at?: string
          total_leads_found?: number
          filters?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      lead_sheets: {
        Row: {
          id: string
          name: string
          lead_ids: string[]
          total_leads: number
          approved_leads: number
          rejected_leads: number
          verification_summary: Json
          template_id: number | null
          template_name: string | null
          template_category: string | null
          status: string
          send_at: string | null
          scheduled_campaign_id: number | null
          scheduled_batch_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          lead_ids?: string[]
          total_leads?: number
          approved_leads?: number
          rejected_leads?: number
          verification_summary?: Json
          template_id?: number | null
          template_name?: string | null
          template_category?: string | null
          status?: string
          send_at?: string | null
          scheduled_campaign_id?: number | null
          scheduled_batch_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          lead_ids?: string[]
          total_leads?: number
          approved_leads?: number
          rejected_leads?: number
          verification_summary?: Json
          template_id?: number | null
          template_name?: string | null
          template_category?: string | null
          status?: string
          send_at?: string | null
          scheduled_campaign_id?: number | null
          scheduled_batch_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_jobs: {
        Row: {
          id: string
          jobId: string
          keyword: string
          normalizedKeyword: string
          filters: Json | null
          status: string
          createdAt: string
          updatedAt: string
          startedAt: string | null
          completedAt: string | null
          leadsFound: number
          newLeads: number
          duplicates: number
          totalFound: number
          errorMessage: string | null
          idempotencyKey: string
          newLeadIds: string[]
        }
        Insert: {
          id?: string
          jobId: string
          keyword: string
          normalizedKeyword: string
          filters?: Json | null
          status?: string
          createdAt?: string
          updatedAt?: string
          startedAt?: string | null
          completedAt?: string | null
          leadsFound?: number
          newLeads?: number
          duplicates?: number
          totalFound?: number
          errorMessage?: string | null
          idempotencyKey: string
          newLeadIds?: string[]
        }
        Update: {
          id?: string
          jobId?: string
          keyword?: string
          normalizedKeyword?: string
          filters?: Json | null
          status?: string
          createdAt?: string
          updatedAt?: string
          startedAt?: string | null
          completedAt?: string | null
          leadsFound?: number
          newLeads?: number
          duplicates?: number
          totalFound?: number
          errorMessage?: string | null
          idempotencyKey?: string
          newLeadIds?: string[]
        }
        Relationships: []
      }
      verification_jobs: {
        Row: {
          id: string
          jobId: string
          leadIds: string[]
          status: string
          createdAt: string
          updatedAt: string
          startedAt: string | null
          completedAt: string | null
          total: number
          valid: number
          invalid: number
          risky: number
          unknown: number
          not_verified: number
          errorMessage: string | null
        }
        Insert: {
          id?: string
          jobId: string
          leadIds?: string[]
          status?: string
          createdAt?: string
          updatedAt?: string
          startedAt?: string | null
          completedAt?: string | null
          total?: number
          valid?: number
          invalid?: number
          risky?: number
          unknown?: number
          not_verified?: number
          errorMessage?: string | null
        }
        Update: {
          id?: string
          jobId?: string
          leadIds?: string[]
          status?: string
          createdAt?: string
          updatedAt?: string
          startedAt?: string | null
          completedAt?: string | null
          total?: number
          valid?: number
          invalid?: number
          risky?: number
          unknown?: number
          not_verified?: number
          errorMessage?: string | null
        }
        Relationships: []
      }
      app_kv: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          id: string
          lead_id: string
          thread_id: string | null
          event_type: string | null
          sent_at: string | null
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          thread_id?: string | null
          event_type?: string | null
          sent_at?: string | null
          data: Json
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          thread_id?: string | null
          event_type?: string | null
          sent_at?: string | null
          data?: Json
          created_at?: string
        }
        Relationships: []
      }
      deleted_leads: {
        Row: {
          id: number
          channel_id: string | null
          email: string
          normalized_email: string
          company: string | null
          deleted_at: string
        }
        Insert: {
          id?: number
          channel_id?: string | null
          email: string
          normalized_email: string
          company?: string | null
          deleted_at?: string
        }
        Update: {
          id?: number
          channel_id?: string | null
          email?: string
          normalized_email?: string
          company?: string | null
          deleted_at?: string
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