import React from 'react';
import { Briefcase, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

const DashboardStatsSection = ({ studentData }) => {
  const stats = studentData?.stats;

  const statsData = [
    {
      label: 'Applied',
      count: stats?.applied || 0,
      bgFrom: 'from-white',
      bgTo: 'to-red-100',
      textColor: 'text-red-700',
      iconBgColor: 'bg-red-600',
      iconColor: 'text-white',
      icon: Briefcase,
    },
    {
      label: 'Shortlisted',
      count: stats?.shortlisted || 0,
      bgFrom: 'from-white',
      bgTo: 'to-blue-200',
      textColor: 'text-blue-700',
      iconBgColor: 'bg-blue-600',
      iconColor: 'text-white',
      icon: AlertCircle,
    },
    {
      label: 'Interviewed',
      count: stats?.interviewed || 0,
      bgFrom: 'from-white',
      bgTo: 'to-green-200',
      textColor: 'text-green-700',
      iconBgColor: 'bg-green-600',
      iconColor: 'text-white',
      icon: CheckCircle,
    },
    {
      label: 'Offers',
      count: stats?.offers || 0,
      bgFrom: 'from-white',
      bgTo: 'to-purple-200',
      textColor: 'text-purple-700',
      iconBgColor: 'bg-purple-600',
      iconColor: 'text-white',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="w-full">
      <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] py-3 px-3 sm:px-4 transition-all duration-200 shadow-lg hover:shadow-xl">
        <legend className="text-base sm:text-lg font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          Career Insights
        </legend>

        <div className="mb-1 mt-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              const displayValue = stat.count;

              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${stat.bgFrom} ${stat.bgTo} p-2 sm:p-3 lg:p-4 rounded-lg border-2 border-gray-200 hover:shadow-lg transition-all duration-300 min-h-[56px] sm:min-h-[64px] lg:min-h-[80px] flex flex-col justify-between group`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <div className={`p-1 sm:p-1.5 flex items-center justify-center shadow-md rounded-md flex-shrink-0 ${stat.iconBgColor} group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 ${stat.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${stat.textColor} mb-0 truncate`}>{stat.label}</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 truncate" title={String(displayValue)}>{displayValue}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default DashboardStatsSection;
