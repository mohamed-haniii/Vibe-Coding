import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });
    (window as any).__clinic_socket = socket;
  }
  return socket;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    retries?: number;
  } = {}
): Promise<T> {
  const maxRetries = options.retries !== undefined ? options.retries : 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const token = sessionStorage.getItem('clinic_jwt_token') || localStorage.getItem('clinic_jwt_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`/api${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem('clinic_jwt_token');
          localStorage.removeItem('clinic_jwt_token');
          window.dispatchEvent(new Event('auth-unauthorized'));
        }
        const error: any = new Error(data.message || 'حدث خطأ في الاتصال مع السيرفر');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data as T;
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
      attempt++;
      if (attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 300));
        continue;
      }
      // Network or server unreachable error after all retries
      const netErr: any = new Error('تعذر الاتصال بالسيرفر! يرجى التأكد من تشغيل الشبكة المحلية أو الواي فاي. (شيفت العمل وجميع البيانات محفوظة بأمان ولن تضيع)');
      netErr.isNetworkError = true;
      throw netErr;
    }
  }

  throw new Error('تعذر الاتصال بالسيرفر');
}
