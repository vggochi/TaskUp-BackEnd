import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
    throw new Error(
        "SUPABASE_URL não configurada."
    );
}

if (!SUPABASE_KEY) {
    throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY não configurada."
    );
}

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
