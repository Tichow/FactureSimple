import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kqynxzzwcincrerpxgoi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeW54enp3Y2luY3JlcnB4Z29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTQyMjgsImV4cCI6MjA3MjEzMDIyOH0.hl5YziJtIaFUKyI1vxJV9IeJHs-TkZltuqwG3tX5DuM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)