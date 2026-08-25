import { getDb } from '../db';

export async function generateNextPatientCode(): Promise<string> {
  const db = await getDb();
  const lastPatient = await db.get('SELECT code FROM patients ORDER BY id DESC LIMIT 1');

  if (!lastPatient || !lastPatient.code) {
    return 'P-0001';
  }

  const match = lastPatient.code.match(/P-(\d+)/);
  if (match && match[1]) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `P-${nextNum.toString().padStart(4, '0')}`;
  }

  // Fallback
  const count = await db.get('SELECT COUNT(*) as cnt FROM patients');
  return `P-${(count.cnt + 1).toString().padStart(4, '0')}`;
}
