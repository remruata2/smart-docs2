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
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg opacity-50 cursor-not-allowed">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                            <path d="M17.05 20.28c-.96.95-2.04.8-2.04 1.93 0 1.13 1.05 1.09 2.04-.01.99-1.11 1.01-2.88 0-1.92zM12.03 7.25c-2.48 0-4.5 2.01-4.5 4.5s2.02 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7.5c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zM10.5 4.5h3v-2h-3v2z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[10px] uppercase font-medium text-gray-400">Coming Soon on</span>
                                        <span className="text-sm font-semibold">App Store</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg opacity-50 cursor-not-allowed">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                            <path d="M5.929 22.857l14.143-8.143-14.143-8.143v16.286zM15.5 12l-7.571 4.357v-8.714l7.571 4.357z" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[10px] uppercase font-medium text-gray-400">Coming Soon on</span>
                                        <span className="text-sm font-semibold">Google Play</span>
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
