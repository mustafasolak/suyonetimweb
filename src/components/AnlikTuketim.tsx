import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SensorData {
  id: string;
  akim: number;
  basinc: number;
  sicaklik: number;
  timestamp: any;
}

const AnlikTuketim: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "sensor"),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SensorData[];
      setSensorData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const chartData = {
    labels: sensorData.map(data => new Date(data.timestamp?.toDate()).toLocaleTimeString()).reverse(),
    datasets: [
      {
        label: 'Akım (A)',
        data: sensorData.map(data => data.akim).reverse(),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
      {
        label: 'Basınç (bar)',
        data: sensorData.map(data => data.basinc).reverse(),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      },
      {
        label: 'Sıcaklık  (°C)',
        data: sensorData.map(data => data.sicaklik).reverse(),
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Anlık Sensör Verileri'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Anlık Sensör Verileri
        </Typography>
        <Box height={400}>
          <Line data={chartData} options={options} />
        </Box>
        <Box mt={2}>
          <Typography variant="subtitle1" gutterBottom>
            Son Ölçüm Değerleri:
          </Typography>
          {sensorData[0] && (
            <Box>
              <Typography>Akım: {sensorData[0].akim} A</Typography>
              <Typography>Basınç: {sensorData[0].basinc} bar</Typography>
              <Typography>Sıcaklık: {sensorData[0].sicaklik} °C</Typography>
              <Typography variant="caption" color="textSecondary">
                Son güncelleme: {new Date(sensorData[0].timestamp?.toDate()).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AnlikTuketim; 