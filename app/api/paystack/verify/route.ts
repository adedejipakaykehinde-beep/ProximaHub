import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ success: false, message: 'No reference provided' }, { status: 400 });
    }

    // 1. Verify payment status with Paystack API
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 400 });
    }

    const email = paystackData.data.customer.email;
    const amountInNaira = paystackData.data.amount / 100; // Paystack converts Kobo back to Naira

    // 2. Fetch the user profile by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, message: 'User profile not found' }, { status: 404 });
    }

    // 3. Prevent duplicate funding by checking if reference was already recorded
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('details', `Paystack Funding (Ref: ${reference})`)
      .single();

    if (existingTx) {
      return NextResponse.json({ success: true, message: 'Already funded' });
    }

    // 4. Update user wallet balance in Supabase
    const newBalance = (profile.wallet_balance || 0) + amountInNaira;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      throw updateError;
    }

    // 5. Insert transaction history log
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'funding',
      details: `Paystack Funding (Ref: ${reference})`,
      amount: amountInNaira,
      status: 'success',
    });

    return NextResponse.json({ success: true, newBalance });
  } catch (error: any) {
    console.error('Paystack verification error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Server error verifying payment' },
      { status: 500 }
    );
  }
}