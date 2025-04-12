/*
  # Add hide quantities option to events

  1. Changes
    - Add hide_quantities column to events table
    - Default to false (quantities are shown by default)
*/

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS hide_quantities BOOLEAN DEFAULT false;