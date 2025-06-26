// supabaseConfig.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = 'https://luianzvmrcnfqoqboiok.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1aWFuenZtcmNuZnFvcWJvaW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTQ2ODAsImV4cCI6MjA2NTI5MDY4MH0._eICXqXrsKQRVXFd4SzXzZGOLVWCeUBKm1fH-r5AV6I';
 
// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey); 