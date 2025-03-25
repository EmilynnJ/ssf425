import React from 'react';

export function EyeIcon() {
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      {/* Animated glow effect */}
      <div className="absolute inset-0 w-full h-full rounded-full bg-white opacity-60 filter blur-lg animate-pulse"></div>
      
      {/* Pink outer ring */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-pink-500 p-1 shadow-[0_0_15px_rgba(236,72,153,0.7)]">
          
          {/* Eye white */}
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            
            {/* Iris */}
            <div className="w-8 h-8 rounded-full bg-purple-800 flex items-center justify-center">
              
              {/* Pupil */}
              <div className="w-4 h-4 rounded-full bg-black"></div>
              
              {/* Light reflections */}
              <div className="absolute w-2.5 h-2.5 rounded-full bg-white top-3 right-3.5 opacity-80"></div>
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white bottom-4 left-4 opacity-60"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}