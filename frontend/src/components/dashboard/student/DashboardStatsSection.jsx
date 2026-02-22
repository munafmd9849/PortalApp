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
      <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] py-5 px-4 sm:px-6 transition-all duration-200 shadow-lg hover:shadow-xl">
        <legend className="text-lg sm:text-xl font-bold px-3 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          Career Insights
        </legend>

        <div className="mb-3 mt-2">
          {/* Mobile: 2×2 grid, larger icons/text to match Track Applications */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              const displayValue = stat.count;

              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${stat.bgFrom} ${stat.bgTo} p-3 lg:p-6 rounded-lg lg:rounded-xl border-2 border-gray-200 hover:shadow-xl transition-all duration-300 min-h-[72px] lg:min-h-[140px] flex flex-col justify-between group`}
                >
                  <div className="flex items-start gap-2 lg:gap-4 min-w-0">
                    <div className={`p-1.5 lg:p-3.5 flex items-center justify-center shadow-lg rounded-lg lg:rounded-xl flex-shrink-0 ${stat.iconBgColor} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-8 w-8 lg:h-10 lg:w-10 ${stat.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className={`text-base lg:text-lg font-bold uppercase tracking-wider ${stat.textColor} mb-0.5 lg:mb-2 truncate`}>{stat.label}</p>
                      <p className="text-3xl lg:text-5xl font-extrabold text-gray-900 truncate" title={String(displayValue)}>{displayValue}</p>
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
