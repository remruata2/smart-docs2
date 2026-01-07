import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
	console.warn(
		"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
	);
}

// Supabase Admin client with Service Role Key for backend operations
// Only create client if env vars are present to avoid errors
export const supabaseAdmin =
	supabaseUrl && supabaseServiceRoleKey
		? createClient(supabaseUrl, supabaseServiceRoleKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		})
		: null;

/**
 * Validates Supabase Storage connection and bucket access
 * @param bucketName Name of the bucket to test
 * @returns Object with connection status and details
 */
export async function validateSupabaseStorage(
	bucketName: string = "chapter_pages"
): Promise<{
	connected: boolean;
	bucketExists: boolean;
	error?: string;
	details?: {
		url: string;
		bucket: string;
		availableBuckets?: string[];
	};
}> {
	try {
		console.log(
			`[SUPABASE-VALIDATION] Starting validation for bucket: ${bucketName}`
		);

		// Check environment variables
		if (!supabaseUrl || !supabaseServiceRoleKey) {
			const error =
				"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables";
			console.error(`[SUPABASE-VALIDATION] ${error}`);
			return {
				connected: false,
				bucketExists: false,
				error,
			};
		}

		console.log(`[SUPABASE-VALIDATION] Supabase URL: ${supabaseUrl}`);
		console.log(
			`[SUPABASE-VALIDATION] Service Role Key: ${supabaseServiceRoleKey.substring(
				0,
				10
			)}...`
		);

		// Check if client was created
		if (!supabaseAdmin) {
			const error =
				"Supabase client not initialized (missing environment variables)";
			console.error(`[SUPABASE-VALIDATION] ${error}`);
			return {
				connected: false,
				bucketExists: false,
				error,
			};
		}

		// Test connection by listing buckets
		console.log(`[SUPABASE-VALIDATION] Attempting to list buckets...`);
		const { data: buckets, error: listError } =
			await supabaseAdmin.storage.listBuckets();

		if (listError) {
			const error = `Failed to connect to Supabase Storage: ${listError.message}`;
			console.error(`[SUPABASE-VALIDATION] ${error}`);
			console.error(`[SUPABASE-VALIDATION] Error details:`, {
				name: listError.name,
				message: listError.message,
				status: (listError as any).status,
				statusCode: (listError as any).statusCode,
			});
			return {
				connected: false,
				bucketExists: false,
				error,
			};
		}

		console.log(
			`[SUPABASE-VALIDATION] Successfully connected. Found ${buckets?.length || 0
			} buckets`
		);
		const availableBuckets = buckets?.map((b) => b.name) || [];
		console.log(`[SUPABASE-VALIDATION] Available buckets:`, availableBuckets);

		// Check if target bucket exists
		const bucketExists =
			buckets?.some((bucket) => bucket.name === bucketName) || false;

		if (!bucketExists) {
			const error = `Bucket '${bucketName}' does not exist. Available buckets: ${availableBuckets.join(", ") || "none"
				}`;
			console.error(`[SUPABASE-VALIDATION] ${error}`);
			return {
				connected: true,
				bucketExists: false,
				error,
				details: {
					url: supabaseUrl,
					bucket: bucketName,
					availableBuckets,
				},
			};
		}

		console.log(
			`[SUPABASE-VALIDATION] Bucket '${bucketName}' exists. Testing write access...`
		);

		// Test write access with a small test file
		const isPdfBucket = bucketName.toLowerCase().includes("pdf");
		const testPath = `_test_connection_${Date.now()}.${isPdfBucket ? "pdf" : "txt"}`;
		const contentType = isPdfBucket ? "application/pdf" : "text/plain";
		const testContent = new Blob(["connection test"], { type: contentType });

		const { error: uploadError } = await supabaseAdmin.storage
			.from(bucketName)
			.upload(testPath, testContent, {
				contentType: contentType,
				upsert: true,
			});

		if (uploadError) {
			const error = `Bucket exists but write access failed: ${uploadError.message}`;
			console.error(`[SUPABASE-VALIDATION] ${error}`);
			console.error(`[SUPABASE-VALIDATION] Upload error details:`, {
				name: uploadError.name,
				message: uploadError.message,
				status: (uploadError as any).status,
				statusCode: (uploadError as any).statusCode,
			});
			return {
				connected: true,
				bucketExists: true,
				error,
				details: {
					url: supabaseUrl,
					bucket: bucketName,
					availableBuckets,
				},
			};
		}

		console.log(
			`[SUPABASE-VALIDATION] Write access successful. Cleaning up test file...`
		);

		// Clean up test file
		const { error: deleteError } = await supabaseAdmin.storage
			.from(bucketName)
			.remove([testPath]);
		if (deleteError) {
			console.warn(
				`[SUPABASE-VALIDATION] Failed to delete test file (non-critical):`,
				deleteError.message
			);
		}

		console.log(`[SUPABASE-VALIDATION] ✅ Validation successful!`);
		return {
			connected: true,
			bucketExists: true,
			details: {
				url: supabaseUrl,
				bucket: bucketName,
				availableBuckets,
			},
		};
	} catch (error: any) {
		const errorMsg = `Connection validation failed: ${error.message}`;
		console.error(`[SUPABASE-VALIDATION] ${errorMsg}`);
		console.error(`[SUPABASE-VALIDATION] Error stack:`, error.stack);
		return {
			connected: false,
			bucketExists: false,
			error: errorMsg,
		};
	}
}
