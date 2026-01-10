-- Migration to add user_specific targeting to notifications

-- 1. Add user_id column
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id);

-- 2. Update RLS Policies
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;

-- Policy: Users can see their own notifications OR notifications with no user_id (global/admin only?)
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (
  auth.uid() = user_id OR 
  (user_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- Policy: Enable system logic (and public forms) to insert notifications
CREATE POLICY "Enable insert for system logic"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 4. Update Type Check Constraint to include 'system' and 'inquiry'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('appraisal', 'payment', 'report', 'system', 'inquiry', 'alert'));
