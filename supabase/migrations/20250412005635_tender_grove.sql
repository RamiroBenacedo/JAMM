-- Add columns to auth.users if they don't exist
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

-- Create or replace the handle_new_user function to set email confirmation requirement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Set email_confirmed_at to NULL by default to require confirmation
  NEW.email_confirmed_at = NULL;
  -- Store full_name from raw_user_meta_data
  NEW.full_name = (NEW.raw_user_meta_data->>'full_name')::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      BEFORE INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Update existing users to require email confirmation if not already confirmed
UPDATE auth.users
SET email_confirmed_at = NULL
WHERE email_confirmed_at IS NOT NULL;