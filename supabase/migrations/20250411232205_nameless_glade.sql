/*
  # Add event image support

  1. Changes
    - Add image_url column to events table
    - Default to a placeholder image URL
    - Allow NULL values for custom images

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80';