import { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Hook that generates a device fingerprint using FingerprintJS.
 * Returns the fingerprint string (visitorId) once loaded.
 */
export function useDeviceFingerprint(): string | null {
    const [fingerprint, setFingerprint] = useState<string | null>(null);

    useEffect(() => {
        const getFingerprint = async () => {
            try {
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                setFingerprint(result.visitorId);
            } catch (error) {
                console.error('Failed to get device fingerprint:', error);
            }
        };

        getFingerprint();
    }, []);

    return fingerprint;
}
