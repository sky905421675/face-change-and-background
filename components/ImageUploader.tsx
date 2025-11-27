import React, { useCallback, useState } from 'react';

interface ImageUploaderProps {
  label: string;
  onChange: (file: File | null) => void;
  previewUrl?: string | null;
  className?: string;
  id: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, onChange, previewUrl, className = '', id }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onChange(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm font-medium text-slate-400 ml-1">{label}</label>
      <div 
        className={`
          relative border-2 border-dashed rounded-xl transition-all duration-200 aspect-[4/3] flex flex-col items-center justify-center overflow-hidden bg-slate-900/50 group cursor-pointer
          ${isDragging ? 'border-banana-500 bg-banana-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById(id)?.click()}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-medium text-sm">Change Image</span>
            </div>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                }}
                className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
             <svg className="w-8 h-8 mb-3 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-slate-400">Drag & drop or click</p>
          </div>
        )}
        <input 
          id={id}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleChange}
        />
      </div>
    </div>
  );
};
