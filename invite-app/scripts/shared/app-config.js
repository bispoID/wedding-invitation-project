// Public browser configuration. Never put service_role or backend secrets here.
export const SUPABASE_URL = 'https://bkkienyemqlkueygknzl.supabase.co';
export const SUPABASE_PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJra2llbnllbXFsa3VleWdrbnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxOTI3MTgsImV4cCI6MjEwMjc2ODcxOH0.GYi2Fspdjg4RVhNu372xyvT_R-BG7iVjSQaph93Ku34';

export const FUNCTIONS_BASE_URL = new URL('/functions/v1/', SUPABASE_URL).href;
// This module lives two directories below the invitation root, on any host.
export const APP_BASE_URL = new URL('../../', import.meta.url).href;
