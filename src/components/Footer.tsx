import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="border-t bg-white py-12 mt-16">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div>
                        <Link href="/" className="inline-block mb-4">
                            <Image
                                src="/zirna-brand-logo.png"
                                alt="Zirna"
                                width={120}
                                height={40}
                                className="h-10 w-auto"
                                priority
                                unoptimized
                            />
                        </Link>
                        <p className="text-gray-600 text-sm">
                            Zirna is developed and owned by Fiara Infotech. An AI-powered exam preparation platform for students.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/app" className="text-gray-600 hover:text-gray-900">
                                    Features
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/contact" className="text-gray-600 hover:text-gray-900">
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <a href="mailto:support@zirna.io" className="text-gray-600 hover:text-gray-900">
                                    Support
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* App Stores */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Get the App</h4>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3 px-4 py-2 bg-[#000000] text-white rounded-xl border border-gray-800 opacity-90 cursor-not-allowed group transition-all">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current">
                                            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Coming Soon on</span>
                                        <span className="text-sm font-bold">App Store</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2 bg-[#000000] text-white rounded-xl border border-gray-800 opacity-90 cursor-not-allowed group transition-all">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        <svg viewBox="0 0 512 512" className="w-5 h-5 fill-current">
                                            <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l236.6-236.6L47 0zm396.6 176.1l-60.2 60.2-60-60L253 253l60 60 60.2-60.2 62.4-35.7c15.7-9 22.8-22.1 21.4-34.7-.6-5.8-3.4-11.3-8.4-14.3l-64.9-37.1zM104.6 499l220.7-126.7-60.1-60.1L104.6 499z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Coming Soon on</span>
                                        <span className="text-sm font-bold">Google Play</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t mt-8 pt-8 text-center text-gray-600 text-sm">
                    <p>&copy; {new Date().getFullYear()} Fiara Infotech. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
