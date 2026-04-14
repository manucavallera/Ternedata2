import React from "react";

const ButtonSelectListado = ({ setStep }) => {
  const handleNext = (data) => {
    setStep(data);
  };

  const buttons = [
    { label: "Madres", step: 1 },
    { label: "Terneros", step: 2 },
    { label: "Eventos", step: 3 },
    { label: "Tratamientos", step: 4 },
    { label: "Diarrea", fullLabel: "Diarrea Terneros", step: 5 },
    { label: "Salud", fullLabel: "Resumen Salud", step: 6 },
  ];

  return (
    <div className='mx-auto flex items-center justify-center gap-2 sm:gap-3 md:gap-6 px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 flex-wrap'>
      {buttons.map(({ label, fullLabel, step }) => (
        <ul
          key={step}
          className='border-green-600 hover:border-green-400 hover:bg-green-600 group flex-1 sm:flex-none -skew-x-[30deg] transform border mb-2 sm:mb-3 md:mb-4 hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-[80px] sm:min-w-[110px]'
        >
          <li className='m-2 sm:m-3 md:m-4 skew-x-[30deg] transform bg-transparent px-3 sm:px-6 md:px-9 py-2 sm:py-3 md:py-4 text-center first-letter:uppercase cursor-pointer'>
            <b
              className='block text-xs sm:text-sm md:text-lg group-hover:text-white'
              onClick={() => handleNext(step)}
            >
              <span className='sm:hidden'>{label}</span>
              <span className='hidden sm:inline'>{fullLabel || label}</span>
            </b>
          </li>
        </ul>
      ))}
    </div>
  );
};

export default ButtonSelectListado;
