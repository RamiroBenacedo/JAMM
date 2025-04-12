/*
  # Add full name field and enable email confirmation

  1. Changes
    - Add full_name column to auth.users table
    - Enable email confirmation requirement
*/

-- Enable email confirmations in auth.users
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

-- Update auth settings to require email confirmation
UPDATE auth.config 
SET email_confirm_required = true
WHERE id = 1;