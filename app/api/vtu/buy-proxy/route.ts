import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { proxyType, quantity, amount } = await req.json();

    if (!proxyType || !quantity || !amount) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const price = Number(amount);
    const qty = Number(quantity);

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

    // 3. Check Balance
    if (profile.wallet_balance < price) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 4. Deduct Balance
    const newBalance = profile.wallet_balance - price;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process wallet deduction' }, { status: 500 });
    }

    // 5. Call Webshare API to Fetch/Assign Proxies
    const webshareRes = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?page=1&page_size=' + qty, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${process.env.WEBSHARE_API_KEY}`,
      },
    });

    const webshareData = await webshareRes.json();

    if (!webshareRes.ok || !webshareData?.results) {
      // Refund user on provider error
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      return NextResponse.json(
        { message: 'Failed to generate proxies. Please try again later.' },
        { status: 400 }
      );
    }

    // Format proxy list
    const proxyList = webshareData.results.map((p: any) => `${p.proxy_address}:${p.port}:${p.username}:${p.password}`);

    // 6. Record Transaction
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${qty}x ${proxyType.toUpperCase()} Proxy Order`,
      amount: price,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      message: 'Proxies purchased successfully!',
      proxies: proxyList,
      newBalance,
    });

  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}