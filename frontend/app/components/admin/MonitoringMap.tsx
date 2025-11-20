'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, TrendingUp, AlertTriangle, CheckCircle, Map, Loader2, Info } from 'lucide-react';

interface SchoolMarker {
  id: number;
  name: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  status: 'active' | 'issue' | 'pending';
  priority: number;
  lastDelivery: string;
  students: number;
}

interface MonitoringMapProps {
  height?: string;
}

const MonitoringMap: React.FC<MonitoringMapProps> = ({ height = '500px' }) => {
  const [schools, setSchools] = useState<SchoolMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const token = localStorage.getItem('token');

        const response = await axios.get(`${apiUrl}/schools?limit=100`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.data && response.data.schools) {
          // Map schools to SchoolMarker format
          const schoolsData: SchoolMarker[] = response.data.schools.map((school: any) => ({
            id: school.id,
            name: school.name,
            location: `${school.city || school.kabupaten}, ${school.province || school.provinsi}`,
            lat: school.latitude || null,
            lng: school.longitude || null,
            status: 'active' as const, // Default status
            priority: school.priority_score || 50,
            lastDelivery: 'N/A',
            students: school.student_count || 0,
          }));

          setSchools(schoolsData.slice(0, 20)); // Limit to 20 for performance
        }
      } catch (err: any) {
        console.error('Error fetching schools:', err);
        setError('Gagal memuat data sekolah');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const schoolsWithCoordinates = schools.filter(s => s.lat && s.lng);

  const getStatusConfig = (status: SchoolMarker['status']) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle, color: 'green', label: 'Aktif' };
      case 'issue':
        return { icon: AlertTriangle, color: 'red', label: 'Ada Masalah' };
      case 'pending':
        return { icon: TrendingUp, color: 'yellow', label: 'Menunggu' };
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'red';
    if (priority >= 60) return 'yellow';
    return 'green';
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 gradient-bg-2 rounded-xl flex items-center justify-center">
            <Map className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Peta Monitoring Real-Time</h3>
            <p className="text-gray-600">Visualisasi status sekolah dan prioritas alokasi</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">Aktif</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-700">Menunggu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700">Ada Masalah</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700">Prioritas berdasarkan AI</span>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div
        className="relative bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center"
        style={{ height }}
      >
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 gap-4 h-full">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="border border-gray-400"></div>
            ))}
          </div>
        </div>

        {/* Map Icon */}
        <div className="relative z-10 text-center">
          {loading ? (
            <>
              <Loader2 className="w-24 h-24 text-gray-300 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500 font-semibold mb-2">Memuat data sekolah...</p>
            </>
          ) : error ? (
            <>
              <AlertTriangle className="w-24 h-24 text-red-300 mx-auto mb-4" />
              <p className="text-red-500 font-semibold mb-2">{error}</p>
            </>
          ) : (
            <>
              <Map className="w-24 h-24 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold mb-2">Leaflet.js Map Integration</p>
              <p className="text-sm text-gray-400 max-w-md">
                Peta interaktif akan menampilkan lokasi sekolah dengan marker berwarna<br />
                berdasarkan status dan ukuran berdasarkan prioritas AI
              </p>
              {schoolsWithCoordinates.length === 0 && schools.length > 0 && (
                <div className="mt-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl max-w-md mx-auto">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-yellow-800">Data Koordinat Belum Tersedia</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Geocoding service sedang memproses {schools.length} sekolah untuk menampilkan lokasi di peta.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 glass-subtle rounded-xl">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">
                  {schools.length} Sekolah Terdaftar
                  {schoolsWithCoordinates.length > 0 && ` (${schoolsWithCoordinates.length} dengan koordinat)`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Simulated Markers - Only show if coordinates available */}
        <div className="absolute inset-0 pointer-events-none">
          {schoolsWithCoordinates.slice(0, 4).map((school, idx) => {
            const statusConfig = getStatusConfig(school.status);
            const priorityColor = getPriorityColor(school.priority);
            const StatusIcon = statusConfig.icon;

            // Simulate positions based on array index (in production, use real lat/lng projection)
            const positions = [
              { top: '20%', left: '25%' },
              { top: '40%', left: '60%' },
              { top: '65%', left: '35%' },
              { top: '50%', left: '75%' },
            ];

            return (
              <div
                key={school.id}
                className="absolute animate-float"
                style={positions[idx]}
              >
                <div className="relative pointer-events-auto group">
                  {/* Marker */}
                  <div className={`w-8 h-8 rounded-full bg-${statusConfig.color}-500 border-4 border-white shadow-glow flex items-center justify-center cursor-pointer hover:scale-110 transition-smooth`}>
                    <StatusIcon className="w-4 h-4 text-white" />
                  </div>

                  {/* Priority Ring */}
                  <div className={`absolute inset-0 rounded-full border-2 border-${priorityColor}-500 animate-pulse`} style={{ padding: '4px' }}></div>

                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-smooth pointer-events-none z-20">
                    <div className="glass p-4 rounded-xl shadow-modern min-w-[250px]">
                      <h4 className="font-bold text-gray-900 mb-2">{school.name}</h4>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>Lokasi: {school.location}</p>
                        <p>Siswa: {school.students}</p>
                        <p>Prioritas: <span className={`font-bold text-${priorityColor}-600`}>{school.priority}</span></p>
                        <p>Terakhir: {school.lastDelivery}</p>
                      </div>
                      <div className={`mt-2 px-2 py-1 rounded-full bg-${statusConfig.color}-100 flex items-center gap-1 justify-center`}>
                        <StatusIcon className={`w-3 h-3 text-${statusConfig.color}-700`} />
                        <span className={`text-xs font-semibold text-${statusConfig.color}-700`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* School List Below Map */}
      <div className="p-6 border-t border-gray-200">
        <h4 className="font-bold text-gray-900 mb-4">Daftar Sekolah</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schools.map((school) => {
            const statusConfig = getStatusConfig(school.status);
            const priorityColor = getPriorityColor(school.priority);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={school.id}
                className="glass-subtle rounded-xl p-4 hover:shadow-modern transition-smooth"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      {school.name}
                    </h5>
                    <p className="text-sm text-gray-600">{school.location}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full bg-${statusConfig.color}-100 flex items-center gap-1`}>
                    <StatusIcon className={`w-3 h-3 text-${statusConfig.color}-700`} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{school.students} siswa</span>
                  <span className={`font-bold text-${priorityColor}-600`}>
                    Prioritas: {school.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonitoringMap;
