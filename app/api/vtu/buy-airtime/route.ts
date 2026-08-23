import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Map network name to Bigisub numeric network IDs
function getBigisubNetworkId(network: string): number {
  const net = network.toLowerCase().trim();
  switch (net) {
    case 'mtn':
      return 1;
    case 'glo':
      return 2;
    case 'airtel':
      return 3;
    case '9mobile':
    case 'etisalat':
      return 4;
    default:
      return 1;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { network, phoneNumber, amount } = body;

    if (!network || !phoneNumber || !amount) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (numAmount < 25) {
      return NextResponse.json({ message: 'Minimum airtime purchase is ₦25' }, { status: 400 });
    }

    // 1. Authenticate User session
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
    if (profile.wallet_balance < numAmount) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 4. Temporarily Deduct Balance
    const newBalance = profile.wallet_balance - numAmount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process balance deduction' }, { status: 500 });
    }

    // 5. Call Bigisub Airtime API V2
    const networkId = getBigisubNetworkId(network);
    const baseUrl = process.env.BIGISUB_BASE_URL || 'https://api.bigisub.ng';
    const apiKey = process.env.BIGISUB_API_KEY || '1e34035a5330a62c7066697df8cb485c92d85285';

    let bigisubData: any = {};
    let isSuccessful = false;

    try {
      const payload = {
        network: networkId,
        phone_number: String(phoneNumber).trim(),
        amount: String(numAmount),
        airtime_type: 'vtu',
        pin: '2258',
      };

      const bigisubRes = await fetch(`${baseUrl}/api/v2/vtu/airtime/purchase/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await bigisubRes.text();

      try {
        bigisubData = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error('Bigisub non-JSON response:', responseText);
        bigisubData = { error: 'Invalid response from provider API.' };
      }

      isSuccessful = 
        bigisubRes.ok && 
        (bigisubData?.success === true || 
         bigisubData?.data?.status === 'successful' || 
         bigisubData?.status === 'success');

    } catch (apiErr: any) {
      console.error('Bigisub network error:', apiErr);
      bigisubData = { error: 'Network error connecting to airtime provider.' };
    }

    // 6. Refund if transaction failed
    if (!isSuccessful) {
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      const errorReason = 
        bigisubData?.message || 
        bigisubData?.detail || 
        bigisubData?.error || 
        'Validation failed on provider network.';

      return NextResponse.json(
        { success: false, message: errorReason },
        { status: 400 }
      );
    }

    // 7. Record Transaction
    const reference = bigisubData?.data?.reference || bigisubData?.data?.transaction_id || Date.now().toString();
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${network.toUpperCase()} Airtime Top-up (₦${numAmount}) to ${phoneNumber} - Ref: ${reference}`,
      amount: numAmount,
      status: 'success',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Airtime purchase successful!',
      newBalance,
      reference 
    });

  } catch (error: any) {
    console.error('Airtime purchase server error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}