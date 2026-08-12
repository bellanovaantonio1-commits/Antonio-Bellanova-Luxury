import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const defaultData = [
  { name: 'Jan', revenue: 0, sales: 0 },
  { name: 'Feb', revenue: 0, sales: 0 },
  { name: 'Mar', revenue: 0, sales: 0 },
];

export default function RevenueChart({ data }: { data?: { name: string; revenue: number; sales: number }[] }) {
  const chartData = data?.length ? data : defaultData;
  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }}
            tickFormatter={(value) => `${(value / 1000)}k`}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFF', 
              borderRadius: '12px', 
              border: '1px solid #F3F4F6',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#D4AF37" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            name="Umsatz (€)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesTrendChart({ data }: { data?: { name: string; revenue: number; sales: number }[] }) {
  const chartData = data?.length ? data : defaultData;
  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <Tooltip 
            cursor={{ fill: '#F9FAFB' }}
            contentStyle={{ 
              backgroundColor: '#FFF', 
              borderRadius: '12px', 
              border: '1px solid #F3F4F6',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
          />
          <Bar 
            dataKey="sales" 
            fill="#0A0A0A" 
            radius={[4, 4, 0, 0]} 
            name="Verkäufe (Stück)"
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
