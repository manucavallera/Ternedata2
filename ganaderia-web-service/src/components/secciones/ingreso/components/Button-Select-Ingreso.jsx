import React from "react";

const ButtonSelectIngreso = ({ setStep }) => {
  const handleNext = (data) => {
    setStep(data);
  };

  return (
    <div className='mx-auto flex items-center justify-center gap-3 sm:gap-4 md:gap-6 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 flex-wrap'>
      <ul className='border-green-600 hover:border-green-400 hover:bg-green-600 group flex-1 sm:flex-none -skew-x-[30deg] transform border mb-3 sm:mb-4 hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-[120px] sm:min-w-[140px]'>
        <li className='m-2 sm:m-3 md:m-4 skew-x-[30deg] transform bg-transparent px-4 sm:px-6 md:px-9 py-2 sm:py-3 md:py-4 text-center first-letter:uppercase cursor-pointer'>
          <b
            className='block text-sm sm:text-base md:text-lg group-hover:text-white'
            onClick={() => handleNext(1)}
          >
            Madres
          </b>
        </li>
      </ul>

      <ul className='border-green-600 hover:border-green-400 hover:bg-green-600 group flex-1 sm:flex-none -skew-x-[30deg] transform border mb-3 sm:mb-4 hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-[120px] sm:min-w-[140px]'>
        <li className='m-2 sm:m-3 md:m-4 skew-x-[30deg] transform bg-transparent px-4 sm:px-6 md:px-9 py-2 sm:py-3 md:py-4 text-center first-letter:uppercase cursor-pointer'>
          <b
            className='block text-sm sm:text-base md:text-lg group-hover:text-white'
            onClick={() => handleNext(2)}
          >
            Terneros
          </b>
        </li>
      </ul>

      <ul className='border-green-600 hover:border-green-400 hover:bg-green-600 group flex-1 sm:flex-none -skew-x-[30deg] transform border mb-3 sm:mb-4 hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-[120px] sm:min-w-[140px]'>
        <li className='m-2 sm:m-3 md:m-4 skew-x-[30deg] transform bg-transparent px-4 sm:px-6 md:px-9 py-2 sm:py-3 md:py-4 text-center first-letter:uppercase cursor-pointer'>
          <b
            className='block text-sm sm:text-base md:text-lg group-hover:text-white'
            onClick={() => handleNext(3)}
          >
            Evento
          </b>
        </li>
      </ul>

      <ul className='border-green-600 hover:border-green-400 hover:bg-green-600 group flex-1 sm:flex-none -skew-x-[30deg] transform border mb-3 sm:mb-4 hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-[120px] sm:min-w-[140px]'>
        <li className='m-2 sm:m-3 md:m-4 skew-x-[30deg] transform bg-transparent px-4 sm:px-6 md:px-9 py-2 sm:py-3 md:py-4 text-center first-letter:uppercase cursor-pointer'>
          <b
            className='block text-sm sm:text-base md:text-lg group-hover:text-white'
            onClick={() => handleNext(4)}
          >
            Tratamiento
          </b>
        </li>
      </ul>

      <ul className='border-green-600 hover:border-green-400 hover:bg-green-600 group flex-1 sm:flex-none -skew-x-[30deg] transform border mb-3 sm:mb-4 hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-[120px] sm:min-w-[140px]'>
        <li className='m-2 sm:m-3 md:m-4 skew-x-[30deg] transform bg-transparent px-4 sm:px-6 md:px-9 py-2 sm:py-3 md:py-4 text-center first-letter:uppercase cursor-pointer'>
          <b
            className='block text-sm sm:text-base md:text-lg group-hover:text-white'
            onClick={() => handleNext(5)}
          >
            <span className='hidden sm:inline'>Diarrea Ternero</span>
            <span className='sm:hidden'>Diarrea</span>
          </b>
        </li>
      </ul>
    </div>
  );
};

export default ButtonSelectIngreso;
