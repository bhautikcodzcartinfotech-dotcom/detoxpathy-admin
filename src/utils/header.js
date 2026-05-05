// components/ui/Header.jsx
export const Header = ({ children, size = "3xl", className = "" }) => (
  <h2
    className={`
      text-${size} font-black tracking-tight text-gray-900
      ${className}
    `}
  >
    {children}
  </h2>
);

// components/ui/Button.jsx
export const Button = ({ 
  children, 
  onClick, 
  className = "", 
  variant = "primary", 
  type = "button",
  disabled = false,
  icon: Icon
}) => {
  const baseStyles = "px-8 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-[12px] whitespace-nowrap shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  
  const variants = {
    primary: "bg-[#134D41] text-white hover:bg-[#1a6657] shadow-teal-900/20 hover:shadow-xl hover:shadow-teal-900/30",
    secondary: "bg-white text-gray-700 border border-gray-100 hover:bg-gray-50 hover:shadow-xl hover:shadow-gray-200/50",
    gold: "bg-[#EAB308] text-white hover:bg-[#CA8A04] shadow-yellow-900/20 hover:shadow-xl hover:shadow-yellow-900/30",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white hover:shadow-xl hover:shadow-red-600/20",
    outline: "border-2 border-[#134D41] text-[#134D41] hover:bg-[#134D41] hover:text-white"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 stroke-[3]" />}
      {children}
    </button>
  );
};
