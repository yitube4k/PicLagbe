-- =========================================================================
-- PHOTOLAGBE V9 — MIGRATION: KYC & DIRECT CHAT TABLES & POLICIES
-- =========================================================================

-- 1. KYC SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    nid_front_url TEXT NOT NULL,
    nid_back_url TEXT,
    selfie_url TEXT NOT NULL,
    phone TEXT NOT NULL,
    note TEXT,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT unique_photographer_kyc UNIQUE (photographer_id)
);

-- 2. CONVERSATIONS TABLE (Direct Chat)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_customer_photographer UNIQUE (customer_id, photographer_id)
);

-- 3. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_submissions
-- Photographer: can INSERT and SELECT own only (NO self-approve via UPDATE)
CREATE POLICY "Photographer can insert own KYC" ON public.kyc_submissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.photographers p 
            WHERE p.id = kyc_submissions.photographer_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Photographer can view own KYC" ON public.kyc_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.photographers p 
            WHERE p.id = kyc_submissions.photographer_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view and update all KYC" ON public.kyc_submissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles pr 
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
        )
    );

-- Photographer re-submit: may edit own pending/rejected submission (always resets to pending, can never touch approved)
CREATE POLICY "Photographer can resubmit own KYC" ON public.kyc_submissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.photographers p
            WHERE p.id = kyc_submissions.photographer_id AND p.user_id = auth.uid()
        )
        AND kyc_submissions.status <> 'approved'
    )
    WITH CHECK (
        kyc_submissions.status = 'pending' AND
        EXISTS (
            SELECT 1 FROM public.photographers p
            WHERE p.id = kyc_submissions.photographer_id AND p.user_id = auth.uid()
        )
    );

-- RLS Policies for conversations & messages (Admin-visible policy)
CREATE POLICY "Participants and Admins can view conversations" ON public.conversations
    FOR SELECT USING (
        customer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_id AND p.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
    );

CREATE POLICY "Participants can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (
        customer_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Participants and Admins can view messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id AND (
                c.customer_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = c.photographer_id AND p.user_id = auth.uid()) OR
                EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
            )
        )
    );

CREATE POLICY "Participants can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id AND (
                c.customer_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = c.photographer_id AND p.user_id = auth.uid())
            )
        )
    );

-- Messages: participants can mark read (UPDATE read_at only via trigger-safe policy)
CREATE POLICY "Participants can update messages read state" ON public.messages
    FOR UPDATE USING (
        sender_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id AND (
                c.customer_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = c.photographer_id AND p.user_id = auth.uid()) OR
                EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.role = 'admin')
            )
        )
    );

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON public.conversations (customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_photographer ON public.conversations (photographer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id, created_at);-- Admin manual photographer creation support
-- photographers.user_id was NOT NULL; admin-created profiles have no auth user yet
ALTER TABLE public.photographers ALTER COLUMN user_id DROP NOT NULL;

-- KYC review surface: make review indexes handy (already added in v10 if re-run safe)
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_submissions (status, created_at DESC);
