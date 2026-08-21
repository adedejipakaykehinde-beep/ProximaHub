import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceID = searchParams.get('serviceID') || 'dstv';

    const res = await fetch(`https://sandbox.vtpass.com/api/service-variations?serviceID=${serviceID}`, {
      method: 'GET',
      headers: {
        'api-key': process.env.VTPASS_API_KEY || '',
        'public-key': process.env.VTPASS_PUBLIC_KEY || '',
      },
    });

    const data = await res.json();

    if (data?.response_description === '000' || data?.content?.varations) {
      return NextResponse.json({
        success: true,
        variations: data.content.varations || [],
      });
    }

    return NextResponse.json({ success: false, variations: [] }, { status: 400 });
  } catch (error: any) {
    console.error('Fetch Cable Variations Error:', error);
    return NextResponse.json({ message: 'Failed to fetch bouquets' }, { status: 500 });
  }
}