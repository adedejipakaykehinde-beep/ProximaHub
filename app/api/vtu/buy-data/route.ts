import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getBigisubNetworkId(network: string): number {
  const net = network.toLowerCase().trim();
  switch (net) {
    case 'mtn': return 1;
    case 'glo': return 2;
    case 'airtel': return 3;
    case '9mobile':
    case 'etisalat': return 4;
    default: return 1;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { network, phoneNumber, planId, amount } = body;

    if (!network || !phoneNumber || !planId) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const numAmount = Number(amount || 0);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (!profile || profile.wallet_balance < numAmount) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // Deduct
    await supabase
      .from('profiles')
      .update({ wallet_balance: profile.wallet_balance - numAmount })
      .eq('id', profile.id);

    const networkId = getBigisubNetworkId(network);
    const baseUrl = process.env.BIGISUB_BASE_URL || 'https://api.bigisub.ng';
    const apiKey = process.env.BIGISUB_API_KEY || '1e34035a5330a62c7066697df8cb485c92d85285';

    const payload = {
      network: networkId,
      mobile_number: String(phoneNumber).trim(),
      phone_number: String(phoneNumber).trim(),
      plan: Number(planId),
      plan_id: Number(planId),
      ported_number: false,
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
      // Refund
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      const rawError = typeof bigisubData === 'object' ? JSON.stringify(bigisubData) : responseText;
      const errorReason = 
        bigisubData?.message || 
        bigisubData?.detail || 
        bigisubData?.error || 
        rawError;

      return NextResponse.json({ success: false, message: errorReason }, { status: 400 });
    }

    const newBalance = profile.wallet_balance - numAmount;
    const reference = bigisubData?.data?.reference || Date.now().toString();

    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${network.toUpperCase()} Data Purchase to ${phoneNumber}`,
      amount: numAmount,
      status: 'success',
    });

    return NextResponse.json({ success: true, message: 'Data purchase successful!', newBalance, reference });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}