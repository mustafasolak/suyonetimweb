import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

interface WaterData {
  dayKey: string;
  delta_mL: number;
  flowRate_Lpm: number;
  timestamp: number;
  total_mL: number;
}

type TimeRange = '24h' | '7d' | '30d' | 'custom';

export default function Home() {
  const [waterData, setWaterData] = useState<WaterData[]>([]);
  const [latestData, setLatestData] = useState<WaterData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Anlık veri için ayrı bir sorgu
  useEffect(() => {
    const latestQuery = query(
      collection(db, 'sensor'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribeLatest = onSnapshot(latestQuery, (snapshot) => {
      if (!snapshot.empty) {
        setLatestData(snapshot.docs[0].data() as WaterData);
      }
    });

    return () => unsubscribeLatest();
  }, []);

  // Seçilen zaman aralığındaki veriler için sorgu
  useEffect(() => {
    let startTimestamp: number;
    let endTimestamp: number;

    if (timeRange === '24h') {
      startTimestamp = Math.floor(subDays(new Date(), 1).getTime() / 1000);
      endTimestamp = Math.floor(new Date().getTime() / 1000);
    } else if (timeRange === '7d') {
      startTimestamp = Math.floor(subDays(new Date(), 7).getTime() / 1000);
      endTimestamp = Math.floor(new Date().getTime() / 1000);
    } else if (timeRange === '30d') {
      startTimestamp = Math.floor(subDays(new Date(), 30).getTime() / 1000);
      endTimestamp = Math.floor(new Date().getTime() / 1000);
    } else {
      startTimestamp = Math.floor(startOfDay(startDate).getTime() / 1000);
      endTimestamp = Math.floor(endOfDay(endDate).getTime() / 1000);
    }

    const historicalQuery = query(
      collection(db, 'sensor'),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeHistorical = onSnapshot(historicalQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as WaterData);
      setWaterData(data);
    });

    return () => unsubscribeHistorical();
  }, [timeRange, startDate, endDate]);

  const formatTime = (timestamp: number) => {
    if (timeRange === '24h') {
      return format(new Date(timestamp * 1000), 'HH:mm:ss', { locale: tr });
    } else {
      const date = new Date(timestamp * 1000);
      const formattedDate = format(date, 'dd.MM.yyyy', { locale: tr });
      const formattedTime = format(date, 'HH:mm', { locale: tr });
      return `${formattedDate}\n${formattedTime}`;
    }
  };

  const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const formattedValue = formatTime(payload.value);
    
    if (timeRange === '24h') {
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={16} textAnchor="middle" fill="#666">
            {formattedValue}
          </text>
        </g>
      );
    } else {
      const [date, time] = formattedValue.split('\n');
      
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontWeight="bold">
            {date}
          </text>
          <text x={0} y={0} dy={32} textAnchor="middle" fill="#666" fontSize="12">
            {time}
          </text>
        </g>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Su Tüketim Takip Sistemi</h1>
        
        {/* Filtreleme Seçenekleri */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Filtreleme Seçenekleri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zaman Aralığı</label>
              <select
                className="w-full p-2 border rounded-md"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <option value="24h">Son 24 Saat</option>
                <option value="7d">Son 7 Gün</option>
                <option value="30d">Son 30 Gün</option>
                <option value="custom">Özel Tarih Aralığı</option>
              </select>
            </div>
            {timeRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-md"
                    value={format(startDate, 'yyyy-MM-dd')}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-md"
                    value={format(endDate, 'yyyy-MM-dd')}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Anlık Veriler */}
        {latestData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Anlık Veriler</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Anlık Debi</p>
                <p className="text-2xl font-bold">{latestData.flowRate_Lpm.toFixed(3)} L/dk</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Son 10 Saniyelik Tüketim</p>
                <p className="text-2xl font-bold">{latestData.delta_mL.toFixed(1)} mL</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Toplam Tüketim</p>
                <p className="text-2xl font-bold">{latestData.total_mL.toFixed(1)} mL</p>
              </div>
            </div>
          </div>
        )}

        {/* Grafikler */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Debi Grafiği</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={<CustomizedAxisTick />}
                  height={timeRange === '24h' ? 30 : 80}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => formatTime(value)}
                  formatter={(value) => [`${value} L/dk`, 'Debi']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="flowRate_Lpm" 
                  stroke="#3B82F6" 
                  name="Debi (L/dk)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
} 