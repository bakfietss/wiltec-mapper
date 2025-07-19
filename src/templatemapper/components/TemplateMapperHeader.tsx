import React from 'react';

export const TemplateMapperHeader: React.FC = () => {
  return (
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Template Mapper
      </h1>
      <p className="text-lg text-slate-600 max-w-2xl mx-auto">
        Upload your data and generate templates for visual mapping
      </p>
    </div>
  );
};