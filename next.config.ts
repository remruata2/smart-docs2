import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Configure compiler options
	compiler: {
		// Enable styled-components support
		styledComponents: true,
	},
	// Server external packages
	serverExternalPackages: [
		"mammoth",
		"xlsx",
		"@xenova/transformers",
		"llamaindex",
		"react-pdf",
	],
	// Transpile packages for client-side bundling
	// Note: react-pdf is in serverExternalPackages, so don't include it here
	transpilePackages: [],
	// Experimental features
	experimental: {
		serverActions: {
			// Increase body size limit to 50MB for file uploads
			bodySizeLimit: "50mb",
		},
		// Increase timeout for server components
	},
	// Allow cross-origin requests from demo.lushaimedia.in
	allowedDevOrigins: ["demo.lushaimedia.in"],
	// Add timeout configurations
	async headers() {
		return [
			{
				source: "/api/:path*",
				headers: [
					{
						key: "X-Response-Time",
						value: "300000", // 5 minutes
					},
				],
			},
		];
	},
	// Increase server timeout
	serverRuntimeConfig: {
		// Increase timeout for API routes
		maxDuration: 300, // 5 minutes
	},
	// Performance optimizations
	poweredByHeader: false,
	compress: true,
	// Increase memory limit for large queries
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Server-side specific configuration
			// Handle server-side rendering issues with browser globals
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				child_process: false,
				// Add fallbacks for browser globals that might be referenced
				global: false,
				globalThis: false,
				canvas: false, // PDF.js may reference canvas
			};

			// Use legacy build for @supabase/supabase-js in Node.js to suppress warning
			config.resolve.alias = {
				...config.resolve.alias,
				"@supabase/supabase-js": "@supabase/supabase-js/dist/main/index.js",
			};

			// Disable problematic optimizations for server-side
			config.optimization = {
				...config.optimization,
				splitChunks: false, // Disable chunk splitting for server
			};
		} else {
			// Client-side configuration
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				child_process: false,
				canvas: false, // PDF.js may reference canvas
			};
		}

		// Note: react-pdf handles pdfjs-dist internally, no alias needed

		// Configure for ESM modules like unpdf
		config.resolve.extensionAlias = {
			".js": [".js", ".ts", ".tsx"],
			".jsx": [".jsx", ".tsx"],
			".mjs": [".mjs", ".js"],
		};

		return config;
	},
};

export default nextConfig;
