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
      percentage: true,
    },
  ];

  const calculateOfferPercentage = () => {
    const totalApplied = stats?.applied || 0;
    const totalOffers = stats?.offers || 0;
    return totalApplied > 0 ? Math.round((totalOffers / totalApplied) * 100) : 0;
  };

  return (
    <div className="w-full">
      <fieldset className="bg-white rounded-lg border-2 border-[#8ec5ff] py-4 px-4 sm:px-6 transition-all duration-200 shadow-lg">
        <legend className="text-lg sm:text-xl font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          Career Insights
        </legend>

        <div className="mb-3 mt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              const displayValue = stat.percentage ? `${calculateOfferPercentage()}%` : stat.count;

              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${stat.bgFrom} ${stat.bgTo} p-4 rounded-xl border border-gray-200 hover:border-[#3c80a7] hover:shadow-md transition-all duration-200 min-h-[120px] flex flex-col justify-between`}
                >
                  <div className="flex items-center">
                    <div className={`p-2 mr-3 flex items-center justify-center shadow-sm rounded-full ${stat.iconBgColor}`}>
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>

                    <div>
                      <p className={`text-xs font-semibold ${stat.textColor}`}>{stat.label}</p>
                      <p className="text-2xl font-bold text-black break-words">{displayValue}</p>
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
