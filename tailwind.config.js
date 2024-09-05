/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{html,js,ts,jsx,tsx}', // Scan all files in the components directory
    './hooks/**/*.{html,js,ts,jsx,tsx}',      // Scan all files in the hooks directory
    './pages/**/*.{html,js,ts,jsx,tsx}',      // Scan all files in the pages directory
    './public/**/*.{html,js,ts,jsx,tsx}',     // Scan all files in the public directory
    './src/**/*.{html,js,ts,jsx,tsx}',        // Scan all files in the src directory
    './styles/**/*.{html,js,ts,jsx,tsx}',     // Scan all files in the styles directory
    './config.ts',                            // Include config.ts file
    './next-env.d.ts',                        // Include next-env.d.ts file
    './next.config.js',                       // Include next.config.js file
    './postcss.config.js',                    // Include postcss.config.js file
    './tailwind.config.js',                   // Include tailwind.config.js file
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
