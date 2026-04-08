/** @type {import('next').NextConfig} */
const nextConfig = {
  // 开启静态导出
  output: "export",
  // 如果你的仓库名不是 username.github.io，而是像 pms.github.io 这样的项目名
  // 就需要设置仓库名作为路径。例如：https://zepuH.github.io/pms.github.io
  // 注意：如果你的仓库名是 zepuH.github.io (用户站点)，则不需要这一行，或者保持为 '' 
  basePath: "/pms.github.io",
  // 静态导出模式下，必须禁用 Next.js 自带的图片优化功能
  images: {
    unoptimized: true,
  },
  // 可选：让生成的链接末尾都带上斜杠，比如 /about/，有时能避免 404
  // trailingSlash: true,
};

module.exports = nextConfig;
