import { NextResponse } from 'next/server';

export const apiResponse = {
  success: (data: any, status = 200) =>
    NextResponse.json(data, { status }),

  error: (message: string, status = 400) =>
    NextResponse.json({ error: message }, { status }),

  unauthorized: () =>
    NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),

  forbidden: () =>
    NextResponse.json({ error: 'Not authorized' }, { status: 403 }),

  badRequest: (message: string) =>
    NextResponse.json({ error: message }, { status: 400 }),
};
