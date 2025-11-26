import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// For API routes (pages/api)
export function setSessionCookie(res, userId, rememberMe = false) {
  // 7 days default, 30 days if remember me is checked
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  res.setHeader('Set-Cookie', `session=${userId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

export function getSessionCookie(req) {
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  return sessionMatch ? sessionMatch[1] : null;
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

// For Server Components (app directory)
export async function setSession(userId) {
  const cookieStore = await cookies();
  cookieStore.set('session', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  return session?.value || null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }
  const { getDb } = await import('./mongodb');
  const { ObjectId } = await import('mongodb');
  const db = await getDb();
  const users = db.collection('users');
  const user = await users.findOne({ _id: new ObjectId(session) });

  if (!user) {
    redirect('/');
  }

  return { userId: session, user };
}

