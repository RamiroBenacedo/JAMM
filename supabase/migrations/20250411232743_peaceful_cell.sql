/*
  # Create storage bucket for event images

  1. New Storage Bucket
    - Creates a new public storage bucket named 'events' for storing event images
  
  2. Security
    - Enables public access to read images
    - Allows authenticated users to upload images
    - Sets allowed mime types for images
*/

-- Create a new storage bucket for event images if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'events'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('events', 'events', true);
    END IF;
END $$;

-- Allow public access to read images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'events');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'events' AND
    (LOWER(RIGHT(name, 4)) IN ('.jpg', 'jpeg', '.png', '.gif') OR
     LOWER(RIGHT(name, 5)) = '.jpeg')
);