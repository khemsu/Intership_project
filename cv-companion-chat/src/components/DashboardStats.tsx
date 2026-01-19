
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Users, TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  cvCount: number;
}

const DashboardStats = ({ cvCount }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total CVs</CardTitle>
          <FileText className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{cvCount}</div>
          <p className="text-xs text-gray-500 mt-1">
            Active resumes in system
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Processed Today</CardTitle>
          <Upload className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <p className="text-xs text-gray-500 mt-1">
            New uploads today
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Candidates</CardTitle>
          <Users className="h-5 w-5 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{cvCount}</div>
          <p className="text-xs text-gray-500 mt-1">
            Unique profiles
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          <TrendingUp className="h-5 w-5 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">98%</div>
          <p className="text-xs text-gray-500 mt-1">
            Processing accuracy
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
