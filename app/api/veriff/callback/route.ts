import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createClient();

    const body = await req.json();
    const { status, id: session_id } = body; // Adjust fields based on Veriff's callback payload

    if (status === 'approved') {
      const { error } = await supabase
        .from('users') // Your Supabase table
        .update({ isVerified: true })
        .eq('session_id', session_id)

      // console.log(body);

      if (error) {
        throw new Error(`Supabase update error: ${error.message}`);
      }
    }

    const { data, error } = await supabase
    .from('users') // Your Supabase table
    .select('*')
    .eq('session_id', session_id)
    .single();

    return NextResponse.redirect(process.env.VERIFF_CALLBACK_URL!);
    // return NextResponse.json({ message: 'Callback handled successfully' });
  } catch (error) {
    console.error('Error handling Veriff callback:', error);
    return NextResponse.json(
      { error: 'Failed to handle callback' },
      { status: 500 }
    );
  }
}