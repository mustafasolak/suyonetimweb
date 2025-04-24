import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface WaterData {
  dayKey: string;
  delta_mL: number;
  flowRate_Lpm: number;
  timestamp: number;
  total_mL: number;
}

export default function Home() {
  const [waterData, setWaterData] = useState<WaterData[]>([]);
  const [latestData, setLatestData] = useState<WaterData | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'sensor'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as WaterData);
      setWaterData(data);
      if (data.length > 0) {
        setLatestData(data[0]);
      }
    });

    return () => unsubscribe();
  }, []);

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp * 1000), 'HH:mm:ss', { locale: tr });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Su Tüketim Takip Sistemi</h1>
        
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
                  tickFormatter={(value) => formatTime(value)}
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