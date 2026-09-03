export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      keyword_pool: {
        Row: {
          id: string;
          keyword: string;
          normalized_keyword: string;
          source: "ai" | "manual";
          status: "active" | "paused" | "completed";
          daily_target: number;
          priority: number;
          created_at: string;
          last_used_at: string | null;
          total_searches: number;
          total_leads_found: number;
          total_new_leads: number;
          total_duplicates: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          keyword: string;
          normalized_keyword: string;
          source: "ai" | "manual";
          status?: "active" | "paused" | "completed";
          daily_target?: number;
          priority?: number;
          created_at?: string;
          last_used_at?: string | null;
          total_searches?: number;
          total_leads_found?: number;
          total_new_leads?: number;
          total_duplicates?: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          keyword?: string;
          normalized_keyword?: string;
          source?: "ai" | "manual";
          status?: "active" | "paused" | "completed";
          daily_target?: number;
          priority?: number;
          created_at?: string;
          last_used_at?: string | null;
          total_searches?: number;
          total_leads_found?: number;
          total_new_leads?: number;
          total_duplicates?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      keyword_usage_log: {
        Row: {
          id: string;
          keyword_id: string;
          keyword: string;
          event_type: "search_started" | "search_completed" | "failed_search";
          leads_found: number;
          new_leads: number;
          duplicates: number;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          keyword_id: string;
          keyword: string;
          event_type: "search_started" | "search_completed" | "failed_search";
          leads_found?: number;
          new_leads?: number;
          duplicates?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          keyword_id?: string;
          keyword?: string;
          event_type?: "search_started" | "search_completed" | "failed_search";
          leads_found?: number;
          new_leads?: number;
          duplicates?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "keyword_usage_log_keyword_id_fkey";
            columns: ["keyword_id"];
            isOneToOne: false;
            referencedRelation: "keyword_pool";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          channel_id: string | null;
          email: string;
          normalized_email: string;
          company: string | null;
          contact: string | null;
          phone: string | null;
          website: string | null;
          instagram: string | null;
          facebook: string | null;
          telegram: string | null;
          country: string | null;
          subscribers: number | null;
          lead_status:
            | "new"
            | "contacted"
            | "replied"
            | "interested"
            | "customer"
            | "blocked"
            | "never_contacted";
          lead_stage: string | null;
          lead_score: number | null;
          source: string | null;
          keyword: string | null;
          matched_keywords: string | null;
          notes: string | null;
          crm_notes: string | null;
          tags: string[] | null;
          verification_status: "valid" | "invalid" | "risky" | "unknown" | "not_verified";
          approval_status: "pending_review" | "approved" | "rejected";
          lead_owner: string | null;
          send_mail: boolean | null;
          status: string | null;
          reply_status: string | null;
          sent_time: string | null;
          last_followup_time: string | null;
          followup_count: number;
          thread_id: string | null;
          campaign_id: string | null;
          demo_sent: boolean | null;
          demo_sent_time: string | null;
          demo_type: string | null;
          interested: boolean | null;
          meeting_scheduled: boolean | null;
          closed_won: boolean | null;
          closed_lost: boolean | null;
          last_reply_time: string | null;
          email_sent_at: string | null;
          email_thread_id: string | null;
          added_date: string;
          last_updated: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_id?: string | null;
          email: string;
          normalized_email: string;
          company?: string | null;
          contact?: string | null;
          phone?: string | null;
          website?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          telegram?: string | null;
          country?: string | null;
          subscribers?: number | null;
          lead_status?:
            | "new"
            | "contacted"
            | "replied"
            | "interested"
            | "customer"
            | "blocked"
            | "never_contacted";
          lead_stage?: string | null;
          lead_score?: number | null;
          source?: string | null;
          keyword?: string | null;
          matched_keywords?: string | null;
          notes?: string | null;
          crm_notes?: string | null;
          tags?: string[] | null;
          verification_status?: "valid" | "invalid" | "risky" | "unknown" | "not_verified";
          approval_status?: "pending_review" | "approved" | "rejected";
          lead_owner?: string | null;
          send_mail?: boolean | null;
          status?: string | null;
          reply_status?: string | null;
          sent_time?: string | null;
          last_followup_time?: string | null;
          followup_count?: number;
          thread_id?: string | null;
          campaign_id?: string | null;
          demo_sent?: boolean | null;
          demo_sent_time?: string | null;
          demo_type?: string | null;
          interested?: boolean | null;
          meeting_scheduled?: boolean | null;
          closed_won?: boolean | null;
          closed_lost?: boolean | null;
          last_reply_time?: string | null;
          email_sent_at?: string | null;
          email_thread_id?: string | null;
          added_date?: string;
          last_updated?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string | null;
          email?: string;
          normalized_email?: string;
          company?: string | null;
          contact?: string | null;
          phone?: string | null;
          website?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          telegram?: string | null;
          country?: string | null;
          subscribers?: number | null;
          lead_status?:
            | "new"
            | "contacted"
            | "replied"
            | "interested"
            | "customer"
            | "blocked"
            | "never_contacted";
          lead_stage?: string | null;
          lead_score?: number | null;
          source?: string | null;
          keyword?: string | null;
          matched_keywords?: string | null;
          notes?: string | null;
          crm_notes?: string | null;
          tags?: string[] | null;
          verification_status?: "valid" | "invalid" | "risky" | "unknown" | "not_verified";
          approval_status?: "pending_review" | "approved" | "rejected";
          lead_owner?: string | null;
          send_mail?: boolean | null;
          status?: string | null;
          reply_status?: string | null;
          sent_time?: string | null;
          last_followup_time?: string | null;
          followup_count?: number;
          thread_id?: string | null;
          campaign_id?: string | null;
          demo_sent?: boolean | null;
          demo_sent_time?: string | null;
          demo_type?: string | null;
          interested?: boolean | null;
          meeting_scheduled?: boolean | null;
          closed_won?: boolean | null;
          closed_lost?: boolean | null;
          last_reply_time?: string | null;
          email_sent_at?: string | null;
          email_thread_id?: string | null;
          added_date?: string;
          last_updated?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      search_history: {
        Row: {
          id: string;
          search_keyword: string;
          keywords: string[];
          searched_at: string;
          total_leads_found: number;
          filters: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          search_keyword: string;
          keywords?: string[];
          searched_at?: string;
          total_leads_found?: number;
          filters?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          search_keyword?: string;
          keywords?: string[];
          searched_at?: string;
          total_leads_found?: number;
          filters?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lead_sheets: {
        Row: {
          id: string;
          name: string;
          lead_ids: string[];
          total_leads: number;
          approved_leads: number;
          rejected_leads: number;
          verification_summary: Json;
          template_id: number | null;
          template_name: string | null;
          template_category: string | null;
          status:
            | "draft"
            | "ready_for_bulk_mail"
            | "scheduled"
            | "sending"
            | "completed"
            | "cancelled"
            | "archived";
          send_at: string | null;
          scheduled_campaign_id: number | null;
          scheduled_batch_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          lead_ids?: string[];
          total_leads?: number;
          approved_leads?: number;
          rejected_leads?: number;
          verification_summary?: Json;
          template_id?: number | null;
          template_name?: string | null;
          template_category?: string | null;
          status?:
            | "draft"
            | "ready_for_bulk_mail"
            | "scheduled"
            | "sending"
            | "completed"
            | "cancelled"
            | "archived";
          send_at?: string | null;
          scheduled_campaign_id?: number | null;
          scheduled_batch_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          lead_ids?: string[];
          total_leads?: number;
          approved_leads?: number;
          rejected_leads?: number;
          verification_summary?: Json;
          template_id?: number | null;
          template_name?: string | null;
          template_category?: string | null;
          status?:
            | "draft"
            | "ready_for_bulk_mail"
            | "scheduled"
            | "sending"
            | "completed"
            | "cancelled"
            | "archived";
          send_at?: string | null;
          scheduled_campaign_id?: number | null;
          scheduled_batch_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      automation_jobs: {
        Row: {
          id: string;
          job_id: string;
          keyword: string;
          normalized_keyword: string;
          filters: Json | null;
          status: "pending" | "running" | "completed" | "failed";
          created_at: string;
          updated_at: string;
          started_at: string | null;
          completed_at: string | null;
          leads_found: number;
          new_leads: number;
          duplicates: number;
          total_found: number;
          error_message: string | null;
          idempotency_key: string;
          new_lead_ids: string[];
        };
        Insert: {
          id?: string;
          job_id?: string;
          keyword: string;
          normalized_keyword: string;
          filters?: Json | null;
          status?: "pending" | "running" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          leads_found?: number;
          new_leads?: number;
          duplicates?: number;
          total_found?: number;
          error_message?: string | null;
          idempotency_key: string;
          new_lead_ids?: string[];
        };
        Update: {
          id?: string;
          job_id?: string;
          keyword?: string;
          normalized_keyword?: string;
          filters?: Json | null;
          status?: "pending" | "running" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          leads_found?: number;
          new_leads?: number;
          duplicates?: number;
          total_found?: number;
          error_message?: string | null;
          idempotency_key?: string;
          new_lead_ids?: string[];
        };
        Relationships: [];
      };
      verification_jobs: {
        Row: {
          id: string;
          job_id: string;
          lead_ids: string[];
          status: "pending" | "running" | "completed" | "failed";
          created_at: string;
          updated_at: string;
          started_at: string | null;
          completed_at: string | null;
          total: number;
          valid: number;
          invalid: number;
          risky: number;
          unknown: number;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string;
          lead_ids?: string[];
          status?: "pending" | "running" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          total?: number;
          valid?: number;
          invalid?: number;
          risky?: number;
          unknown?: number;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          lead_ids?: string[];
          status?: "pending" | "running" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          total?: number;
          valid?: number;
          invalid?: number;
          risky?: number;
          unknown?: number;
          error_message?: string | null;
        };
        Relationships: [];
      };
      bulk_mail_users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password_hash: string | null;
          role: "admin" | "manager" | "viewer";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password_hash?: string | null;
          role?: "admin" | "manager" | "viewer";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          password_hash?: string | null;
          role?: "admin" | "manager" | "viewer";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lead_batches: {
        Row: {
          id: string;
          name: string;
          source: "CSV Import" | "Sheet Sync" | "Manual entry" | "lead_finder";
          status: "empty" | "ready" | "active" | "archived";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          source?: "CSV Import" | "Sheet Sync" | "Manual entry" | "lead_finder";
          status?: "empty" | "ready" | "active" | "archived";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          source?: "CSV Import" | "Sheet Sync" | "Manual entry" | "lead_finder";
          status?: "empty" | "ready" | "active" | "archived";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          name: string;
          category:
            "Initial Outreach" | "Followup 1" | "Followup 2" | "Proposal" | "Meeting Reminder";
          subject: string;
          body: string;
          variables: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category:
            "Initial Outreach" | "Followup 1" | "Followup 2" | "Proposal" | "Meeting Reminder";
          subject?: string;
          body?: string;
          variables?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?:
            "Initial Outreach" | "Followup 1" | "Followup 2" | "Proposal" | "Meeting Reminder";
          subject?: string;
          body?: string;
          variables?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          status: "draft" | "active" | "paused" | "completed";
          template_id: string | null;
          audience_type: "manual" | "batch" | "all";
          audience_ref: string | null;
          daily_limit: number;
          delay_seconds: number;
          scheduled_at: string | null;
          completed_at: string | null;
          sender_account_id: string | null;
          run_status: string;
          started_at: string | null;
          paused_at: string | null;
          cancelled_at: string | null;
          last_enqueued_at: string | null;
          last_processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: "draft" | "active" | "paused" | "completed";
          template_id?: string | null;
          audience_type?: "manual" | "batch" | "all";
          audience_ref?: string | null;
          daily_limit?: number;
          delay_seconds?: number;
          scheduled_at?: string | null;
          completed_at?: string | null;
          sender_account_id?: string | null;
          run_status?: string;
          started_at?: string | null;
          paused_at?: string | null;
          cancelled_at?: string | null;
          last_enqueued_at?: string | null;
          last_processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: "draft" | "active" | "paused" | "completed";
          template_id?: string | null;
          audience_type?: "manual" | "batch" | "all";
          audience_ref?: string | null;
          daily_limit?: number;
          delay_seconds?: number;
          scheduled_at?: string | null;
          completed_at?: string | null;
          sender_account_id?: string | null;
          run_status?: string;
          started_at?: string | null;
          paused_at?: string | null;
          cancelled_at?: string | null;
          last_enqueued_at?: string | null;
          last_processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_audience_ref_fkey";
            columns: ["audience_ref"];
            isOneToOne: false;
            referencedRelation: "lead_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      bulk_mail_leads: {
        Row: {
          id: string;
          lead_id: string | null;
          company: string;
          contact: string | null;
          email: string;
          normalized_email: string;
          status:
            | "new"
            | "contacted"
            | "replied"
            | "interested"
            | "customer"
            | "blocked"
            | "never_contacted";
          batch_id: string | null;
          campaign_count: number;
          last_campaign_id: string | null;
          last_template: string | null;
          last_subject: string | null;
          last_email_sent_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          company: string;
          contact?: string | null;
          email: string;
          normalized_email: string;
          status?:
            | "new"
            | "contacted"
            | "replied"
            | "interested"
            | "customer"
            | "blocked"
            | "never_contacted";
          batch_id?: string | null;
          campaign_count?: number;
          last_campaign_id?: string | null;
          last_template?: string | null;
          last_subject?: string | null;
          last_email_sent_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string | null;
          company?: string;
          contact?: string | null;
          email?: string;
          normalized_email?: string;
          status?:
            | "new"
            | "contacted"
            | "replied"
            | "interested"
            | "customer"
            | "blocked"
            | "never_contacted";
          batch_id?: string | null;
          campaign_count?: number;
          last_campaign_id?: string | null;
          last_template?: string | null;
          last_subject?: string | null;
          last_email_sent_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bulk_mail_leads_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulk_mail_leads_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "lead_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulk_mail_leads_last_campaign_id_fkey";
            columns: ["last_campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_recipients: {
        Row: {
          id: string;
          campaign_id: string;
          lead_id: string;
          status: "pending" | "sent" | "failed" | "skipped" | "cancelled";
          sent_at: string | null;
          queued_at: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          lead_id: string;
          status?: "pending" | "sent" | "failed" | "skipped" | "cancelled";
          sent_at?: string | null;
          queued_at?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          lead_id?: string;
          status?: "pending" | "sent" | "failed" | "skipped" | "cancelled";
          sent_at?: string | null;
          queued_at?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_recipients_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "bulk_mail_leads";
            referencedColumns: ["id"];
          },
        ];
      };
      emails: {
        Row: {
          id: string;
          campaign_id: string | null;
          recipient_id: string | null;
          lead_id: string | null;
          template_id: string | null;
          sender_account_id: string | null;
          from_email: string | null;
          to_email: string;
          subject: string;
          body: string;
          status: "queued" | "sending" | "sent" | "failed" | "cancelled";
          error: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          tracking_id: string | null;
          delivered_at: string | null;
          opened_at: string | null;
          clicked_at: string | null;
          replied_at: string | null;
          provider_message_id: string | null;
          attempts: number;
          last_attempt_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          recipient_id?: string | null;
          lead_id?: string | null;
          template_id?: string | null;
          sender_account_id?: string | null;
          from_email?: string | null;
          to_email: string;
          subject?: string;
          body?: string;
          status?: "queued" | "sending" | "sent" | "failed" | "cancelled";
          error?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          tracking_id?: string | null;
          delivered_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          replied_at?: string | null;
          provider_message_id?: string | null;
          attempts?: number;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          recipient_id?: string | null;
          lead_id?: string | null;
          template_id?: string | null;
          sender_account_id?: string | null;
          from_email?: string | null;
          to_email?: string;
          subject?: string;
          body?: string;
          status?: "queued" | "sending" | "sent" | "failed" | "cancelled";
          error?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          tracking_id?: string | null;
          delivered_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          replied_at?: string | null;
          provider_message_id?: string | null;
          attempts?: number;
          last_attempt_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emails_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emails_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "campaign_recipients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emails_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "bulk_mail_leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emails_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      email_events: {
        Row: {
          id: string;
          email_id: string;
          campaign_id: string | null;
          lead_id: string | null;
          type:
            | "queued"
            | "processing"
            | "sent"
            | "delivered"
            | "open"
            | "click"
            | "bounce"
            | "failed"
            | "blocked_prevented"
            | "rejected"
            | "replied"
            | "temporary_failure"
            | "permanent_failure";
          meta: Json | null;
          provider_message_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          email_id: string;
          campaign_id?: string | null;
          lead_id?: string | null;
          type:
            | "queued"
            | "processing"
            | "sent"
            | "delivered"
            | "open"
            | "click"
            | "bounce"
            | "failed"
            | "blocked_prevented"
            | "rejected"
            | "replied"
            | "temporary_failure"
            | "permanent_failure";
          meta?: Json | null;
          provider_message_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          campaign_id?: string | null;
          lead_id?: string | null;
          type?:
            | "queued"
            | "processing"
            | "sent"
            | "delivered"
            | "open"
            | "click"
            | "bounce"
            | "failed"
            | "blocked_prevented"
            | "rejected"
            | "replied"
            | "temporary_failure"
            | "permanent_failure";
          meta?: Json | null;
          provider_message_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_events_email_id_fkey";
            columns: ["email_id"];
            isOneToOne: false;
            referencedRelation: "emails";
            referencedColumns: ["id"];
          },
        ];
      };
      email_clicks: {
        Row: {
          id: string;
          email_id: string;
          campaign_id: string | null;
          lead_id: string | null;
          target_url: string;
          ip_address: string | null;
          user_agent: string | null;
          clicked_at: string;
        };
        Insert: {
          id?: string;
          email_id: string;
          campaign_id?: string | null;
          lead_id?: string | null;
          target_url: string;
          ip_address?: string | null;
          user_agent?: string | null;
          clicked_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          campaign_id?: string | null;
          lead_id?: string | null;
          target_url?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          clicked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_clicks_email_id_fkey";
            columns: ["email_id"];
            isOneToOne: false;
            referencedRelation: "emails";
            referencedColumns: ["id"];
          },
        ];
      };
      sender_accounts: {
        Row: {
          id: string;
          name: string;
          email: string;
          smtp_host: string;
          smtp_port: number;
          username: string;
          password_secret: string;
          daily_limit: number;
          hourly_limit: number;
          security_mode: "none" | "tls" | "ssl";
          enabled: boolean;
          last_tested_at: string | null;
          last_test_status: string | null;
          last_test_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          smtp_host: string;
          smtp_port?: number;
          username: string;
          password_secret: string;
          daily_limit?: number;
          hourly_limit?: number;
          security_mode?: "none" | "tls" | "ssl";
          enabled?: boolean;
          last_tested_at?: string | null;
          last_test_status?: string | null;
          last_test_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          smtp_host?: string;
          smtp_port?: number;
          username?: string;
          password_secret?: string;
          daily_limit?: number;
          hourly_limit?: number;
          security_mode?: "none" | "tls" | "ssl";
          enabled?: boolean;
          last_tested_at?: string | null;
          last_test_status?: string | null;
          last_test_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_queue: {
        Row: {
          id: string;
          email_id: string;
          campaign_id: string | null;
          lead_id: string | null;
          recipient_email: string;
          sender_account_id: string | null;
          template_id: string | null;
          subject: string;
          body: string;
          scheduled_at: string;
          status: "pending" | "processing" | "sent" | "failed" | "cancelled" | "retry";
          attempts: number;
          last_attempt_at: string | null;
          error: string | null;
          sent_at: string | null;
          provider_message_id: string | null;
          priority: number;
          campaign_recipient_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email_id: string;
          campaign_id?: string | null;
          lead_id?: string | null;
          recipient_email: string;
          sender_account_id?: string | null;
          template_id?: string | null;
          subject?: string;
          body?: string;
          scheduled_at: string;
          status?: "pending" | "processing" | "sent" | "failed" | "cancelled" | "retry";
          attempts?: number;
          last_attempt_at?: string | null;
          error?: string | null;
          sent_at?: string | null;
          provider_message_id?: string | null;
          priority?: number;
          campaign_recipient_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          campaign_id?: string | null;
          lead_id?: string | null;
          recipient_email?: string;
          sender_account_id?: string | null;
          template_id?: string | null;
          subject?: string;
          body?: string;
          scheduled_at?: string;
          status?: "pending" | "processing" | "sent" | "failed" | "cancelled" | "retry";
          attempts?: number;
          last_attempt_at?: string | null;
          error?: string | null;
          sent_at?: string | null;
          provider_message_id?: string | null;
          priority?: number;
          campaign_recipient_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_queue_email_id_fkey";
            columns: ["email_id"];
            isOneToOne: false;
            referencedRelation: "emails";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_queue_campaign_recipient_id_fkey";
            columns: ["campaign_recipient_id"];
            isOneToOne: false;
            referencedRelation: "campaign_recipients";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: "todo" | "in_progress" | "blocked" | "done";
          priority: "high" | "medium" | "low";
          due_date: string | null;
          project: string | null;
          owner: string | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "blocked" | "done";
          priority?: "high" | "medium" | "low";
          due_date?: string | null;
          project?: string | null;
          owner?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: "todo" | "in_progress" | "blocked" | "done";
          priority?: "high" | "medium" | "low";
          due_date?: string | null;
          project?: string | null;
          owner?: string | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      sangita_customers: {
        Row: {
          id: string;
          name: string;
          company: string;
          role: string | null;
          email: string;
          phone: string | null;
          ltv: number;
          deals: number;
          tier: string | null;
          last_touch: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company: string;
          role?: string | null;
          email: string;
          phone?: string | null;
          ltv?: number;
          deals?: number;
          tier?: string | null;
          last_touch?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company?: string;
          role?: string | null;
          email?: string;
          phone?: string | null;
          ltv?: number;
          deals?: number;
          tier?: string | null;
          last_touch?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          team: string | null;
          status: "On Track" | "At Risk" | "Blocked";
          progress: number;
          due_date: string | null;
          budget: number;
          spent: number;
          owner: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          team?: string | null;
          status?: "On Track" | "At Risk" | "Blocked";
          progress?: number;
          due_date?: string | null;
          budget?: number;
          spent?: number;
          owner?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          team?: string | null;
          status?: "On Track" | "At Risk" | "Blocked";
          progress?: number;
          due_date?: string | null;
          budget?: number;
          spent?: number;
          owner?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          client: string;
          client_email: string;
          issue_date: string;
          due_date: string;
          status: "Draft" | "Sent" | "Viewed" | "Paid" | "Overdue" | "Cancelled";
          items: Json;
          notes: string | null;
          timeline: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client: string;
          client_email: string;
          issue_date: string;
          due_date: string;
          status?: "Draft" | "Sent" | "Viewed" | "Paid" | "Overdue" | "Cancelled";
          items?: Json;
          notes?: string | null;
          timeline?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client?: string;
          client_email?: string;
          issue_date?: string;
          due_date?: string;
          status?: "Draft" | "Sent" | "Viewed" | "Paid" | "Overdue" | "Cancelled";
          items?: Json;
          notes?: string | null;
          timeline?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      normalize_keyword: { Args: { input: string }; Returns: string };
      keyword_today_searches: { Args: { kid: string; day?: string }; Returns: number };
      update_updated_at_column: { Args: Record<PropertyKey, never>; Returns: unknown };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
