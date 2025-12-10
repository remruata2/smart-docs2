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
                                src="/zirnalogosmall.png"
                                alt="Zirna"
                                width={120}
                                height={40}
                                className="h-10 w-auto"
                                priority
                                unoptimized
                            />
                        </Link>
                        <p className="text-gray-600 text-sm">
                            AI-powered exam preparation platform for students across India.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
                                    Pricing
                                </Link>
                            </li>
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
                </div>

                <div className="border-t mt-8 pt-8 text-center text-gray-600 text-sm">
                    <p>&copy; {new Date().getFullYear()} Zirna. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
