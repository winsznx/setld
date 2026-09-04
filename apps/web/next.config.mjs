/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ['@gluwa/usc-sdk', 'ethers'],
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};
