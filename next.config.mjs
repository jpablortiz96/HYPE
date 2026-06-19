/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg", "@aws-sdk/dsql-signer"],
};
export default nextConfig;
