import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserInfo } from '@/utils/userInfo';

export async function GET(request: Request) {
    const supabase = createClient();
    try {
        // Require authentication to prevent public exposure of offer codes
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { data: offerCodeData, error: offerCodeError } = await supabase
            .from('offer_codes')
            .select('offer_code')

        if (offerCodeError) {
            return NextResponse.json({ error: offerCodeError.message }, { status: 400 });
        }

        return NextResponse.json(offerCodeData);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const supabase = createClient();

    const { id, value } = await request.json();

    try {
        const userData = await getUserInfo({ supabase });

        if (!(userData.role === 'admin'))
            return NextResponse.json({ error: "You have no permission for this action!" });

        const { data: offerCodeData, error: offerCodeError } = await supabase
            .from('offer_codes')
            .update(value)
            .eq('id', id)

        if (offerCodeError) {
            return NextResponse.json({ error: offerCodeError.message }, { status: 400 });
        }

        return NextResponse.json({ status: "success" });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = createClient();

    const newOffer = await request.json();
    try {
        const userData = await getUserInfo({ supabase });

        if (!(userData.role === 'admin'))
            return NextResponse.json({ error: "You have no permission for this action!" });

        const { error } = await supabase
            .from('offer_codes')
            .insert(newOffer)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ status: "success" });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = createClient();

    const { id } = await request.json();
    try {
        const userData = await getUserInfo({ supabase });

        if (!(userData.role === 'admin'))
            return NextResponse.json({ error: "You have no permission for this action!" });

        const { error } = await supabase
            .from('offer_codes')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ status: 'success' })
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}