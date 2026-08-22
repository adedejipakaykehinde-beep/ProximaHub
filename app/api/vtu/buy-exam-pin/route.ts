import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to generate VTpass-required Request ID
function generateRequestId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timestamp = `${year}${month}${day}${hours}${minutes}`;
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${randomStr}`;
}

export async function POST(req: Request) {
  try {
    const { examType, quantity, amount, phoneNumber } = await req.json();

    if (!examType || !quantity || !amount || !phoneNumber) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

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
    const totalCost = Number(amount) * Number(quantity);
    if (profile.wallet_balance < totalCost) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 4. Deduct Balance Temporarily
    const newBalance = profile.wallet_balance - totalCost;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process wallet deduction' }, { status: 500 });
    }

    // 5. Call VTpass API for Exam Pin
    const requestId = generateRequestId();
    const vtpassRes = await fetch('https://vtpass.com/api/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.VTPASS_API_KEY || '',
        'secret-key': process.env.VTPASS_SECRET_KEY || '',
      },
      body: JSON.stringify({
        request_id: requestId,
        serviceID: examType, // 'waec', 'neco', or 'nabteb'
        variation_code: examType,
        quantity: Number(quantity),
        amount: totalCost,
        phone: phoneNumber,
      }),
    });

    const vtpassData = await vtpassRes.json();

    // 6. Handle Failure & Refund
    if (vtpassData?.code !== '000') {
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      return NextResponse.json(
        { message: vtpassData?.response_description || 'Exam pin purchase failed' },
        { status: 400 }
      );
    }

    // 7. Extract Pins & Tokens from VTpass Response
    const cards = vtpassData?.cards || vtpassData?.purchased_code || [];

    // Log Transaction
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${examType.toUpperCase()} Result Checker Pin (x${quantity}) - Ref: ${requestId}`,
      amount: totalCost,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      message: 'Exam pin purchased successfully!',
      cards,
      newBalance,
      requestId,
    });

  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}