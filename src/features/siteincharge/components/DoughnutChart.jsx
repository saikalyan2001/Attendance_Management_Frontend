import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChart = ({ data }) => {
  const chartData = {
    labels: ['Present', 'Absent', 'Leave', 'Half-Day'],
    datasets: [
      {
        data: [data.present, data.absent, data.leave, data.halfDay],
        backgroundColor: ['#22c55e', '#ef4444', '#f97316', '#6b7280'],
        borderColor: ['#16a34a', '#dc2626', '#ea580c', '#4b5563'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'var(--body)',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="w-full max-w-[300px] h-[250px] mx-auto">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default DoughnutChart;