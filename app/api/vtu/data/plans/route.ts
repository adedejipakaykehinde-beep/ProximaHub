import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const network = searchParams.get('network') || '1';

    const baseUrl = process.env.BIGISUB_BASE_URL || 'https://api.bigisub.ng';
    const apiKey = process.env.BIGISUB_API_KEY || '1e34035a5330a62c7066697df8cb485c92d85285';

    const response = await fetch(`${baseUrl}/api/v2/vtu/data/plans/?network=${network}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${apiKey}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      // Bigisub returns plans under 'plans' array or directly
      const plansList = Array.isArray(data) ? data : (data.plans || data.data || []);
      return NextResponse.json({ success: true, plans: plansList });
    }

    return NextResponse.json({ success: false, plans: [] }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching data plans:', error);
    return NextResponse.json({ success: false, plans: [] }, { status: 500 });
  }
}