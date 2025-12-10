import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Configure compiler options
	compiler: {
		// Enable styled-components support
		styledComponents: true,
	},
	// Server external packages - these won't be bundled, reducing build time
	serverExternalPackages: [
		"mammoth",
		"xlsx",
		"@xenova/transformers",
		"llamaindex",
		"react-pdf",
		"pdf-parse",
		"pdf-poppler",
		"@supabase/supabase-js",
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
		// Optimize package imports - reduces build time
		optimizePackageImports: [
			"@radix-ui/react-alert-dialog",
			"@radix-ui/react-avatar",
			"@radix-ui/react-checkbox",
			"@radix-ui/react-dialog",
			"@radix-ui/react-dropdown-menu",
			"@radix-ui/react-label",
			"@radix-ui/react-popover",
			"@radix-ui/react-progress",
			"@radix-ui/react-radio-group",
			"@radix-ui/react-scroll-area",
			"@radix-ui/react-select",
			"@radix-ui/react-slider",
			"@radix-ui/react-slot",
			"@radix-ui/react-tabs",
			"lucide-react",
			"react-icons",
			"@tiptap/react",
			"@tiptap/extension-bullet-list",
			"@tiptap/extension-color",
			"@tiptap/extension-heading",
			"@tiptap/extension-highlight",
			"@tiptap/extension-image",
			"@tiptap/extension-link",
			"@tiptap/extension-list-item",
			"@tiptap/extension-ordered-list",
			"@tiptap/extension-placeholder",
			"@tiptap/extension-table",
			"@tiptap/extension-table-cell",
			"@tiptap/extension-table-header",
			"@tiptap/extension-table-row",
			"@tiptap/extension-text-align",
			"@tiptap/extension-text-style",
			"@tiptap/extension-underline",
		],
	},
	// Allow cross-origin requests from demo.lushaimedia.in
	allowedDevOrigins: ["demo.lushaimedia.in"],
	// Add timeout configurations
	async headers() {
		return [
			// Security headers for all routes
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
					// Only enable HSTS in production
					...(process.env.NODE_ENV === "production"
						? [
							{
								key: "Strict-Transport-Security",
								value: "max-age=31536000; includeSubDomains",
							},
						]
						: []),
				],
			},
			// API-specific headers
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

	// Add empty turbopack config to silence webpack migration warning
	// Turbopack will use webpack config as fallback
	turbopack: {},
	// Performance optimizations
	poweredByHeader: false,
	compress: true,
	// Image optimization configuration
	images: {
		// Allow static images from public folder
		unoptimized: false,
		// Ensure static images are properly served
		formats: ["image/avif", "image/webp"],
		// Don't disable static images
		disableStaticImages: false,
	},
	// Output file tracing - exclude heavy packages from tracing
	outputFileTracingExcludes: {
		"*": [
			"node_modules/@xenova/transformers/**/*",
			"node_modules/llamaindex/**/*",
			"node_modules/react-pdf/**/*",
			"node_modules/pdf-parse/**/*",
			"node_modules/pdf-poppler/**/*",
			"node_modules/mammoth/**/*",
			"node_modules/xlsx/**/*",
			"node_modules/.cache/**/*",
			"node_modules/mermaid/**/*",
			"node_modules/katex/**/*",
			"node_modules/html2canvas/**/*",
			"node_modules/jspdf/**/*",
			"node_modules/jsdom/**/*",
			"node_modules/@lexical/**/*",
			"node_modules/lexical/**/*",
		],
	},
	// Increase memory limit for large queries
	webpack: (config, { isServer, dev }) => {
		// Reduce memory usage during build
		if (!dev) {
			config.optimization = {
				...config.optimization,
				moduleIds: "deterministic",
				runtimeChunk: false,
			};
		}
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

			// Optimize server-side bundling - enable chunk splitting for better caching
			if (!dev) {
				config.optimization = {
					...config.optimization,
					moduleIds: "deterministic",
					runtimeChunk: false,
					// Enable chunk splitting for server in production
					splitChunks: {
						chunks: "all",
						cacheGroups: {
							default: false,
							vendors: false,
							// Separate heavy packages into their own chunks
							transformers: {
								name: "transformers",
								test: /[\\/]node_modules[\\/]@xenova[\\/]transformers[\\/]/,
								priority: 10,
								reuseExistingChunk: true,
							},
							llamaindex: {
								name: "llamaindex",
								test: /[\\/]node_modules[\\/]llamaindex[\\/]/,
								priority: 10,
								reuseExistingChunk: true,
							},
						},
					},
				};
			}
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

			// Optimize client-side chunk splitting
			if (!dev) {
				config.optimization = {
					...config.optimization,
					splitChunks: {
						chunks: "all",
						cacheGroups: {
							default: {
								minChunks: 2,
								priority: -20,
								reuseExistingChunk: true,
							},
							vendor: {
								test: /[\\/]node_modules[\\/]/,
								name: "vendors",
								priority: -10,
								reuseExistingChunk: true,
							},
							// Separate heavy UI libraries
							radix: {
								test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
								name: "radix-ui",
								priority: 20,
								reuseExistingChunk: true,
							},
							tiptap: {
								test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
								name: "tiptap",
								priority: 20,
								reuseExistingChunk: true,
							},
							// Separate chart libraries
							charts: {
								test: /[\\/]node_modules[\\/](recharts|mermaid)[\\/]/,
								name: "charts",
								priority: 15,
								reuseExistingChunk: true,
							},
						},
					},
				};
			}
		}

		// Note: react-pdf handles pdfjs-dist internally, no alias needed

		// Configure for ESM modules like unpdf
		config.resolve.extensionAlias = {
			".js": [".js", ".ts", ".tsx"],
			".jsx": [".jsx", ".tsx"],
			".mjs": [".mjs", ".js"],
		};

		// Ignore heavy packages during bundling (they're in serverExternalPackages)
		config.externals = config.externals || [];
		if (isServer) {
			config.externals.push({
				"@xenova/transformers": "commonjs @xenova/transformers",
				llamaindex: "commonjs llamaindex",
				"react-pdf": "commonjs react-pdf",
			});
		}

		return config;
	},
};

export default nextConfig;
