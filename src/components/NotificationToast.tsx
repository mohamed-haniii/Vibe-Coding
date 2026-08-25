import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Bell, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const { notifications, dismissNotification } = useSocket();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map(n => (
        <div
          key={n.id}
          className="pointer-events-auto bg-slate-900/90 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-700/50 flex items-start justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {n.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : n.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <Info className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-100 leading-snug">{n.message}</p>
              <span className="text-[10px] text-slate-400 font-medium block mt-1 dir-rtl">{n.timestamp}</span>
            </div>
          </div>

          <button
            onClick={() => dismissNotification(n.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
