import { createClient } from '@/utils/supabase/server';

/**
 * Checks if the email domain is in the blocked_email_domains table.
 * Returns the domain string if blocked, or null if allowed.
 */
export async function getBlockedDomain(email: string): Promise<string | null> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    const supabase = createClient();
    const { data } = await supabase
        .from('blocked_email_domains')
        .select('domain')
        .eq('domain', domain)
        .single();

    return data ? domain : null;
}
