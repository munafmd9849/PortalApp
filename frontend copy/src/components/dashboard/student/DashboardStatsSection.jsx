import React from 'react';
import { Briefcase, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

const DashboardStatsSection = ({ studentData }) => {
  const stats = studentData?.stats;

  const statsData = [
    {
      label: 'Applied',
      count: stats?.applied || 0,
      bgColor: 'bg-[var(--pl-surface-strong)]',
      textColor: 'text-[var(--pl-primary)]',
      iconBgColor: 'bg-[var(--pl-primary)]',
      iconColor: 'text-white',
      icon: Briefcase,
    },
    {
      label: 'Shortlisted',
      count: stats?.shortlisted || 0,
      bgColor: 'bg-[var(--pl-surface-strong)]',
      textColor: 'text-[var(--pl-warning)]',
      iconBgColor: 'bg-[var(--pl-warning)]',
      iconColor: 'text-white',
      icon: AlertCircle,
    },
    {
      label: 'Interviewed',
      count: stats?.interviewed || 0,
      bgColor: 'bg-[var(--pl-surface-strong)]',
      textColor: 'text-[var(--pl-primary)]',
      iconBgColor: 'bg-[var(--pl-primary)]',
      iconColor: 'text-white',
      icon: CheckCircle,
    },
    {
      label: 'Offers',
      count: stats?.offers || 0,
      bgColor: 'bg-[var(--pl-surface-strong)]',
      textColor: 'text-[var(--pl-success)]',
      iconBgColor: 'bg-[var(--pl-success)]',
      iconColor: 'text-white',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="w-full">
      <fieldset className="bg-[var(--pl-surface-strong)] rounded-lg border border-[var(--pl-border)] py-4 px-4 sm:px-6 transition-all duration-200 shadow-sm">
        <legend className="text-lg sm:text-xl font-bold px-2 text-[var(--pl-text)] rounded-full">
          Career Insights
        </legend>

        <div className="mb-3 mt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              const displayValue = stat.count;

              return (
                <div
                  key={index}
                  className={`${stat.bgColor} p-4 rounded-xl border border-[var(--pl-border)] hover:border-[var(--pl-primary)] hover:shadow-md transition-all duration-200 min-h-[120px] flex flex-col justify-between`}
                >
                  <div className="flex items-center">
                    <div className={`p-2 mr-3 flex items-center justify-center shadow-sm rounded-full ${stat.iconBgColor}`}>
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>

                    <div>
                      <p className={`text-xs font-semibold ${stat.textColor}`}>{stat.label}</p>
                      <p className="text-2xl font-bold text-[var(--pl-text)] break-words">{displayValue}</p>
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
