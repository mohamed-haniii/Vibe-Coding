import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface WeightDataPoint {
  recordedAt: string;
  weightKg: number;
  visitTypeName?: string;
  bmi?: number;
}

interface WeightChartProps {
  data: WeightDataPoint[];
}

export const WeightChart: React.FC<WeightChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
        لا توجد سجّلات وزنية سابقة لهذا المريض لرسم المخطط البياني.
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map((item, idx) => {
    const dateFormatted = new Date(item.recordedAt).toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric'
    });

    return {
      name: `الزيارة #${idx + 1}`,
      date: dateFormatted,
      الوزن: item.weightKg,
      نوع_الزيارة: item.visitTypeName || 'زيارة'
    };
  });

  // Calculate min and max for chart Y Axis bounds
  const weights = data.map(d => d.weightKg);
  const minWeight = Math.max(0, Math.floor(Math.min(...weights) - 3));
  const maxWeight = Math.ceil(Math.max(...weights) + 3);

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          تطور وزن المريض عبر الزيارات المتتالية (كجم)
        </h4>
        <span className="text-[11px] text-slate-500 font-medium">
          إجمالي الزيارات: {data.length}
        </span>
      </div>

      <div className="h-56 w-full dir-ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis domain={[minWeight, maxWeight]} stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: any) => [`${value} كجم`, 'الوزن']}
            />
            <Line
              type="monotone"
              dataKey="الوزن"
              stroke="#0284c7"
              strokeWidth={3}
              activeDot={{ r: 6, fill: '#0369a1' }}
              dot={{ r: 4, fill: '#0284c7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
