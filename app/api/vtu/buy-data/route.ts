import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to normalize network ID (1: MTN, 2: GLO, 3: AIRTEL, 4: 9MOBILE)
function parseNetworkId(networkInput: any): number {
  if (typeof networkInput === 'number') return networkInput;
  const net = String(networkInput).toLowerCase().trim();
  switch (net) {
    case '1':
    case 'mtn':
      return 1;
    case '2':
    case 'glo':
      return 2;
    case '3':
    case 'airtel':
      return 3;
    case '4':
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
    const network = parseNetworkId(body.network);
    const planId = body.planId || body.plan;
    const phoneNumber = body.phoneNumber || body.phone_number || body.phone;
    const amount = Number(body.amount);

    if (!network || !planId || !phoneNumber || !amount) {
      return NextResponse.json({ message: 'Missing required parameters: network, plan, phone number, or amount' }, { status: 400 });
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
    if (profile.wallet_balance < amount) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 4. Temporarily Deduct Balance
    const newBalance = profile.wallet_balance - amount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process balance deduction' }, { status: 500 });
    }

    // 5. Call Bigisub Data Purchase API V2
    const baseUrl = process.env.BIGISUB_BASE_URL || 'https://api.bigisub.ng';
    const apiKey = process.env.BIGISUB_API_KEY || '1e34035a5330a62c7066697df8cb485c92d85285';

    let bigisubData: any = {};
    let isSuccessful = false;

    try {
      const payload = {
        network,
        plan: Number(planId),
        phone_number: String(phoneNumber).trim(),
        Ported_number: true,
      };

      const bigisubRes = await fetch(`${baseUrl}/api/v2/vtu/data/purchase/`, {
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
         bigisubData?.status === 'success' ||
         bigisubData?.Status === 'successful');

    } catch (apiErr: any) {
      console.error('Bigisub Data purchase network error:', apiErr);
      bigisubData = { error: 'Network error connecting to data provider.' };
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
        'Validation failed on data provider network.';

      return NextResponse.json(
        { success: false, message: errorReason },
        { status: 400 }
      );
    }

    // 7. Record Transaction
    const reference = bigisubData?.data?.reference || bigisubData?.id || Date.now().toString();
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `Data Purchase (₦${amount}) to ${phoneNumber} - Ref: ${reference}`,
      amount,
      status: 'success',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Data purchase successful!',
      newBalance,
      reference 
    });

  } catch (error: any) {
    console.error('Data purchase server error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}