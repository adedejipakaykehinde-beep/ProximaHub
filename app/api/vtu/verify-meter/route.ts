import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { serviceID, meterNumber, type } = await req.json();

    if (!serviceID || !meterNumber || !type) {
      return NextResponse.json({ message: 'ServiceID, Meter Number, and Type are required' }, { status: 400 });
    }

    const res = await fetch('https://sandbox.vtpass.com/api/merchant-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.VTPASS_API_KEY || '',
        'secret-key': process.env.VTPASS_SECRET_KEY || '',
      },
      body: JSON.stringify({
        serviceID,
        billersCode: meterNumber,
        type,
      }),
    });

    const data = await res.json();

    if (data?.code === '000' && data?.content?.Customer_Name) {
      return NextResponse.json({
        success: true,
        customerName: data.content.Customer_Name,
        address: data.content.Address || '',
      });
    }

    return NextResponse.json({
      success: false,
      message: data?.response_description || 'Invalid Meter Number or Provider',
    }, { status: 400 });

  } catch (error: any) {
    console.error('Verify Meter Error:', error);
    return NextResponse.json({ message: 'Verification error' }, { status: 500 });
  }
}