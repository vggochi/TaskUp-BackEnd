import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
    throw new Error("SUPABASE_URL não configurada.");
}

if (!chave) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
}

export const supabase = createClient(url, chave);