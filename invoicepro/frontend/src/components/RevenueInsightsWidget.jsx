import React, { useEffect, useRef, useState } from 'react';

// Animated counter hook
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime = null;
    let animationFrame;
    
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function (easeOutQuart)
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * target));
      
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    
    animationFrame = window.requestAnimationFrame(step);
    
    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [target, duration]);
  
  return count;
}

// Utility to format numbers to INR
const formatINR = (num) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

// SVG Circular Progress Ring
function ProgressRing({ progress, size = 120, strokeWidth = 10, color = 'currentColor' }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-zinc-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-1500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold text-white">{animatedProgress.toFixed(0)}%</span>
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">of target</span>
      </div>
    </div>
  );
}

// SVG Sparkline chart
function Sparkline({ data, width = 200, height = 60, color = '#8b5cf6' }) {
  const [isDrawn, setIsDrawn] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsDrawn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const padding = 5;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * usableWidth;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return `${x},${y}`;
  }).join(' ');

  // Create a smooth curve (simplistic approach for sparkline)
  const createPath = (pointsArray) => {
    if (pointsArray.length === 0) return '';
    let d = `M ${pointsArray[0].x} ${pointsArray[0].y}`;
    for (let i = 1; i < pointsArray.length; i++) {
      const p0 = pointsArray[i - 1];
      const p1 = pointsArray[i];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const pointObjects = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * usableWidth,
    y: height - padding - ((val - min) / range) * usableHeight
  }));
  
  const pathD = createPath(pointObjects);

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient for area under the curve */}
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Area */}
      <path
        d={`${pathD} L ${width - padding} ${height} L ${padding} ${height} Z`}
        fill="url(#sparkline-gradient)"
        className={`transition-opacity duration-1000 ${isDrawn ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1000"
        strokeDashoffset={isDrawn ? 0 : 1000}
        className="transition-all duration-1500 ease-out"
      />
      
      {/* Data points */}
      {pointObjects.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={isDrawn ? 3 : 0}
          fill="#09090b"
          stroke={color}
          strokeWidth="2"
          className="transition-all duration-300"
          style={{ transitionDelay: `${isDrawn ? (i * 100) + 1000 : 0}ms` }}
        />
      ))}
    </svg>
  );
}

export default function RevenueInsightsWidget({ stats }) {
  // Use demo data if no stats provided
  const data = stats || {
    totalRevenue: 127500,
    monthlyTarget: 200000,
    overdueAmount: 34200,
    overdueCount: 3,
    pipelineValue: 89000,
    recentDailyRevenue: [8500, 12000, 15000, 9800, 22000, 18500, 14200]
  };

  const revenueCount = useCountUp(data.totalRevenue);
  const targetCount = useCountUp(data.monthlyTarget);
  const overdueCount = useCountUp(data.overdueAmount);
  const pipelineCount = useCountUp(data.pipelineValue);

  const progressPercentage = Math.min((data.totalRevenue / data.monthlyTarget) * 100, 100);

  return (
    <section className="w-full bg-zinc-950 p-6 rounded-2xl border border-zinc-800/50 shadow-2xl relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-8 relative z-10">
        <h2 className="text-2xl font-bold text-white tracking-tight">Revenue Intelligence</h2>
        <span className="violet-pill px-3 py-1 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
          Live Sync
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* Card 1: Revenue Ring & Stats */}
        <div className="glow-card bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Monthly Revenue</p>
              <h3 className="text-2xl font-bold text-white mt-1 animated-gradient-text bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                {formatINR(revenueCount)}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <ProgressRing progress={progressPercentage} size={80} strokeWidth={8} color="#8b5cf6" />
            <div className="text-right">
              <p className="text-zinc-500 text-xs">Target</p>
              <p className="text-zinc-300 font-medium text-sm">{formatINR(targetCount)}</p>
            </div>
          </div>
        </div>

        {/* Card 2: Sparkline */}
        <div className="glow-card bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div>
            <p className="text-zinc-400 text-sm font-medium">Last 7 Days</p>
            <div className="flex items-end gap-2 mt-1">
              <h3 className="text-xl font-bold text-white">
                {formatINR(data.recentDailyRevenue[data.recentDailyRevenue.length - 1])}
              </h3>
              <span className="text-emerald-400 text-xs font-medium mb-1 flex items-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                +12%
              </span>
            </div>
          </div>
          
          <div className="mt-4 flex justify-center h-[60px]">
            <Sparkline data={data.recentDailyRevenue} width={220} height={60} color="#d946ef" />
          </div>
        </div>

        {/* Card 3: Money At Risk */}
        <div className="glow-card bg-zinc-900/50 border border-red-900/30 rounded-xl p-5 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse"></div>
          
          <div>
            <div className="flex items-center justify-between">
              <p className="text-red-400/90 text-sm font-medium flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Money at Risk
              </p>
              <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/20">
                {data.overdueCount} Invoices
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white mt-2">
              {formatINR(overdueCount)}
            </h3>
          </div>
          
          <div className="mt-5 flex gap-2">
            <button className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-medium py-2 rounded-lg border border-white/10 transition-colors">
              Send Reminders
            </button>
          </div>
        </div>

        {/* Card 4: Predicted Revenue */}
        <div className="glow-card bg-zinc-900/50 border border-amber-900/30 rounded-xl p-5 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div>
            <p className="text-amber-400/90 text-sm font-medium flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Next 30 Days
            </p>
            <h3 className="text-2xl font-bold text-white mt-2">
              {formatINR(pipelineCount)}
            </h3>
            <p className="text-zinc-500 text-xs mt-1">Based on active pipeline</p>
          </div>
          
          <div className="mt-4 pt-3 border-t border-zinc-800/60">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Confidence Score</span>
              <span className="text-emerald-400 font-medium">85% High</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full w-[85%]"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
