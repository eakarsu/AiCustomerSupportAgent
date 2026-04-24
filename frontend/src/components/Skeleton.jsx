export function SkeletonLine({ width = 'w-full', height = 'h-4' }) {
  return <div className={`${width} ${height} bg-gray-200 rounded animate-pulse`} />;
}

export function SkeletonCircle({ size = 'w-10 h-10' }) {
  return <div className={`${size} bg-gray-200 rounded-full animate-pulse`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <SkeletonCircle size="w-14 h-14" />
        <SkeletonLine width="w-8" height="h-5" />
      </div>
      <SkeletonLine width="w-3/4" height="h-5 mb-2" />
      <SkeletonLine width="w-full" height="h-4 mb-1" />
      <SkeletonLine width="w-2/3" height="h-4" />
    </div>
  );
}

export function SkeletonTableRow({ columns = 6 }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <SkeletonLine width={i === 0 ? 'w-48' : 'w-20'} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 8, columns = 6 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <SkeletonLine width="w-48" height="h-6" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-4 text-left">
                <SkeletonLine width="w-16" height="h-4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <SkeletonLine width="w-48" height="h-8 mb-2" />
        <SkeletonLine width="w-64" height="h-5" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-6 bg-gray-100 animate-pulse h-36" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
