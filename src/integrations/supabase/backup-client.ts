import { createClient } from '@supabase/supabase-js';

const BACKUP_URL = "https://thuxlgabdcbkdppffsds.supabase.co";
const BACKUP_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodXhsZ2FiZGNia2RwcGZmc2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDIzMTAsImV4cCI6MjA5NTI3ODMxMH0.jn5loNhDQ3D8nHF99m_hsG9psOgb9-Z72BZsZiqZidM";

export const supabaseBackup = createClient(BACKUP_URL, BACKUP_KEY);
