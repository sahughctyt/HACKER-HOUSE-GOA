/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    'three',
    '@react-three/fiber',
    '@react-three/rapier',
    '@react-three/drei',
    'meshline',
  ],
};

export default nextConfig;
