export const FormSection = ({ 
  icon: Icon, 
  title, 
  children 
}: { 
  icon: React.ComponentType<any>; 
  title: string; 
  children: React.ReactNode; 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-6">
      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    </div>
    {children}
  </div>
);