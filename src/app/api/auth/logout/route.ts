import { NextResponse } from 'next/server';
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('rsl-user');
  res.cookies.delete('rsl-investor');
  return res;
}
