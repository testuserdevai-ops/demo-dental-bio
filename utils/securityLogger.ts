import supabaseAdmin from '@/utils/supabase/supabaseAdmin';

export type SecurityEventType =
    | 'blocked_domain'
    | 'blocked_fingerprint'
    | 'blocked_ip'
    | 'blocked_user';

export interface SecurityLogEntry {
    event_type: SecurityEventType;
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    ip_address?: string;
    user_agent?: string;
    fingerprint?: string;
    country?: string;
    location?: string;
    route?: string;
    details?: Record<string, any>;
}

/**
 * Logs a security event to the security_logs table.
 * Fire-and-forget — does not throw on failure.
 */
export async function logSecurityEvent(entry: SecurityLogEntry): Promise<void> {
    try {
        await supabaseAdmin
            .from('security_logs')
            .insert(entry);
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
}

/**
 * Helper to extract common request metadata for logging.
 */
export function getRequestMeta(request: Request) {
    const forwarded = request.headers.get('x-forwarded-for');
    return {
        ip_address: forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
    };
}
