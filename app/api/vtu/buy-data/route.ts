import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { network, planId, phoneNumber, amount } = body;

    if (!network || !planId || !phoneNumber) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    const numAmount = Number(amount || 0);

    // 1. Authenticate user session
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    // 2. Fetch User Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (!profile || profile.wallet_balance < numAmount) {
      return NextResponse.json({ 
        success: false, 
        message: `Insufficient wallet balance. Balance: ₦${profile?.wallet_balance || 0}` 
      }, { status: 400 });
    }

    // 3. Deduct balance temporarily
    await supabase
      .from('profiles')
      .update({ wallet_balance: profile.wallet_balance - numAmount })
      .eq('id', profile.id);

    // 4. Send Request to Bigisub
    const baseUrl = process.env.BIGISUB_BASE_URL || 'https://api.bigisub.ng';
    const apiKey = process.env.BIGISUB_API_KEY || '1e34035a5330a62c7066697df8cb485c92d85285';

    const cleanPhone = String(phoneNumber).trim();

    const payload = {
      network: Number(network),
      mobile_number: cleanPhone,
      phone_number: cleanPhone,
      plan: Number(planId),
      plan_id: Number(planId),
      ported_number: false,
      pin: "1234", // Make sure this matches your 4-digit PIN in your Bigisub portal settings
    };

    const bigisubRes = await fetch(`${baseUrl}/api/v2/vtu/data/purchase/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await bigisubRes.text();
    let bigisubData: any = {};

    try {
      bigisubData = JSON.parse(responseText);
    } catch {
      bigisubData = { error: responseText };
    }

    const isSuccessful = 
      bigisubRes.ok && 
      (bigisubData?.status === 'success' || 
       bigisubData?.status === 'successful' || 
       bigisubData?.success === true);

    if (!isSuccessful) {
      // Refund user balance
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      let errorReason = 'Validation failed on provider network.';
      if (typeof bigisubData === 'object') {
        errorReason = 
          bigisubData?.message || 
          bigisubData?.detail || 
          bigisubData?.error || 
          JSON.stringify(bigisubData);
      } else if (responseText) {
        errorReason = responseText;
      }

      return NextResponse.json({ success: false, message: errorReason }, { status: 400 });
    }

    // 5. Insert successful transaction
    const newBalance = profile.wallet_balance - numAmount;
    const reference = bigisubData?.data?.reference || bigisubData?.reference || Date.now().toString();

    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `Data Purchase to ${cleanPhone}`,
      amount: numAmount,
      status: 'success',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Data purchase successful!', 
      newBalance, 
      reference 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}