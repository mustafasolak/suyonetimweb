import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { FaWater, FaChartLine, FaFilter, FaClock } from 'react-icons/fa';
import dynamic from 'next/dynamic';

// Create a client-side only component for the timestamp
const TimestampDisplay = () => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(format(new Date(), 'HH:mm:ss'));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-4">
      <span className="text-gray-400">Son Güncelleme:</span>
      <span className="font-medium">{currentTime}</span>
    </div>
  );
};

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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 shadow-lg">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <FaWater className="text-blue-500 text-2xl" />
            <h1 className="text-xl font-bold">Su Yönetimi</h1>
          </div>
          <nav className="space-y-2">
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg bg-gray-700 text-white">
              <FaChartLine />
              <span>Dashboard</span>
            </a>
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
              <FaClock />
              <span>Geçmiş Veriler</span>
            </a>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Su Tüketim Takip Sistemi</h1>
            <TimestampDisplay />
            <div className="flex items-center space-x-4">
              <span className="text-gray-400">Son Güncelleme:</span>
              <span className="font-medium">{format(new Date(), 'HH:mm:ss')}</span>
            </div>
          </div>

          {/* Real-time Data Cards */}
          {latestData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl p-6 shadow-lg transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400">Anlık Debi</h3>
                  <FaWater className="text-blue-500" />
                </div>
                <p className="text-3xl font-bold">{latestData.flowRate_Lpm.toFixed(3)}</p>
                <p className="text-gray-400">L/dk</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 shadow-lg transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400">Son 10 Saniyelik</h3>
                  <FaClock className="text-green-500" />
                </div>
                <p className="text-3xl font-bold">{latestData.delta_mL.toFixed(1)}</p>
                <p className="text-gray-400">mL</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 shadow-lg transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400">Toplam Tüketim</h3>
                  <FaChartLine className="text-purple-500" />
                </div>
                <p className="text-3xl font-bold">{latestData.total_mL.toFixed(1)}</p>
                <p className="text-gray-400">mL</p>
              </div>
            </div>
          )}

          {/* Filter Section */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <FaFilter className="text-blue-500" />
              <h2 className="text-xl font-semibold">Filtreleme Seçenekleri</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Zaman Aralığı</label>
                <select
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <label className="block text-sm text-gray-400 mb-2">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={format(startDate, 'yyyy-MM-dd')}
                      onChange={(e) => setStartDate(new Date(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Bitiş Tarihi</label>
                    <input
                      type="date"
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={format(endDate, 'yyyy-MM-dd')}
                      onChange={(e) => setEndDate(new Date(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FaChartLine className="text-blue-500" />
              <h2 className="text-xl font-semibold">Debi Grafiği</h2>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={<CustomizedAxisTick />}
                    height={timeRange === '24h' ? 30 : 80}
                    stroke="#9CA3AF"
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#fff'
                    }}
                    labelFormatter={(value) => formatTime(value)}
                    formatter={(value) => [`${value} L/dk`, 'Debi']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="flowRate_Lpm" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                    name="Debi (L/dk)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 