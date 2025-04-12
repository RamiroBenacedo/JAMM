/*
  # Create storage bucket for event images

  1. New Storage Bucket
    - Creates a new public storage bucket named 'events' for storing event images
  
  2. Security
    - Enables public access to read images
    - Allows authenticated users to upload images
    - Sets size limits and allowed mime types
*/

-- Create a new storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true);

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
  (LOWER(storage.extension(name)) = 'jpg' OR
   LOWER(storage.extension(name)) = 'jpeg' OR
   LOWER(storage.extension(name)) = 'png' OR
   LOWER(storage.extension(name)) = 'gif') AND
  octet_length(content) < 10485760
);