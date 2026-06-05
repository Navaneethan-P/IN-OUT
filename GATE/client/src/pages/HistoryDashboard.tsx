import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, isSameDay, parseISO } from 'date-fns';
import { LogIn, LogOut, Users } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function HistoryDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/history`);
        setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => isSameDay(parseISO(log.timestamp), new Date(selectedDate)));
  }, [logs, selectedDate]);

  const stats = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    let maleIn = 0;
    let femaleIn = 0;
    let maleOut = 0;
    let femaleOut = 0;

    filteredLogs.forEach(log => {
      const isMale = log.student.gender === 'MALE';
      if (log.action === 'IN') {
        inCount++;
        if (isMale) maleIn++; else femaleIn++;
      } else {
        outCount++;
        if (isMale) maleOut++; else femaleOut++;
      }
    });

    return { inCount, outCount, maleIn, femaleIn, maleOut, femaleOut };
  }, [filteredLogs]);

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">In/Out History Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">View daily gate logs and statistics. (Read-only)</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-green-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <LogIn className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total IN Today</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.inCount}</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4 flex justify-between text-sm text-gray-500">
              <span>Male: <strong className="text-gray-900">{stats.maleIn}</strong></span>
              <span>Female: <strong className="text-gray-900">{stats.femaleIn}</strong></span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-red-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <LogOut className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total OUT Today</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.outCount}</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4 flex justify-between text-sm text-gray-500">
              <span>Male: <strong className="text-gray-900">{stats.maleOut}</strong></span>
              <span>Female: <strong className="text-gray-900">{stats.femaleOut}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Scan Logs for {format(new Date(selectedDate), 'MMM d, yyyy')}</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(parseISO(log.timestamp), 'hh:mm:ss a')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{log.student.name}</div>
                  <div className="text-sm text-gray-500">{log.student.rollNo}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {log.student.gender}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.action === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {log.action}
                  </span>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">No logs for this date.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
