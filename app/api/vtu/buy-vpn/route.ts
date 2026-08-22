import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { planId, durationMonths, amount } = await req.json();

    if (!planId || !amount) {
      return NextResponse.json({ message: 'Plan and amount are required' }, { status: 400 });
    }

    const price = Number(amount);

    // 1. Authenticate User
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    // 2. Fetch User Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    // 3. Check Wallet Balance
    if (profile.wallet_balance < price) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 4. Deduct Wallet Balance
    const newBalance = profile.wallet_balance - price;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process wallet deduction' }, { status: 500 });
    }

    // 5. Call VPNresellers API
    const vpnRes = await fetch('https://vpnresellers.com/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VPNRESELLERS_API_KEY}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        period: durationMonths || 1,
      }),
    });

    const vpnData = await vpnRes.json();

    if (!vpnRes.ok || !vpnData?.success) {
      // Refund user on provider error
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      return NextResponse.json(
        { message: vpnData?.message || 'VPN order failed on provider side' },
        { status: 400 }
      );
    }

    // 6. Record Transaction
    const orderId = vpnData?.data?.id || Date.now().toString();
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `VPN Subscription (${planId}) - Ref: ${orderId}`,
      amount: price,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      message: 'VPN Subscription purchased successfully!',
      credentials: vpnData?.data || vpnData?.account,
      newBalance,
    });

  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}