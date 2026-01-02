import Link from "next/link";
import { Footer } from "@/components/Footer";
import Image from "next/image";

// Force static generation
export const dynamic = 'force-static';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/" className="inline-block">
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
                </div>
            </header>

            {/* Content */}
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
                <p className="text-gray-600 mb-8">Last updated: November 27, 2024</p>

                <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            By accessing and using Zirna (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            Zirna is an AI-powered exam preparation platform that provides:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>AI-generated quizzes and practice questions</li>
                            <li>Interactive learning tools and study materials</li>
                            <li>Battle mode for competitive learning</li>
                            <li>AI tutor assistance</li>
                            <li>Chapter summaries and flashcards</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            To access certain features of the Service, you must create an account. You agree to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Provide accurate, current, and complete information</li>
                            <li>Maintain the security of your password and account</li>
                            <li>Notify us immediately of any unauthorized use of your account</li>
                            <li>Be responsible for all activities that occur under your account</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Subscription and Payments</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            Zirna offers both free and paid subscription plans:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Free features have usage limitations as specified in the platform</li>
                            <li>Paid courses or subscriptions are billed as specified during purchase</li>
                            <li>All payments are processed securely through Razorpay</li>
                            <li>Fees are non-refundable except as required by law</li>
                            <li>You may cancel any recurring subscription at any time, effective at the end of the current billing period</li>
                            <li>We reserve the right to modify pricing with reasonable notice to existing subscribers</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            You agree not to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Use the Service for any illegal purpose or in violation of any laws</li>
                            <li>Share your account credentials with others</li>
                            <li>Attempt to gain unauthorized access to the Service or related systems</li>
                            <li>Use automated systems or software to extract data from the Service</li>
                            <li>Interfere with or disrupt the Service or servers</li>
                            <li>Impersonate any person or entity</li>
                            <li>Upload or transmit viruses or malicious code</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
                        <p className="text-gray-700 leading-relaxed">
                            All content, features, and functionality of the Service, including but not limited to text, graphics, logos, and software, are the exclusive property of Zirna and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. AI-Generated Content</h2>
                        <p className="text-gray-700 leading-relaxed">
                            The Service uses artificial intelligence to generate educational content. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You should verify important information independently and not rely solely on AI-generated content for critical decisions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
                        <p className="text-gray-700 leading-relaxed">
                            To the maximum extent permitted by law, Zirna shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to modify these Terms of Service at any time. We will notify users of any material changes via email or through the Service. Your continued use of the Service after such modifications constitutes your acceptance of the updated terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
                        <p className="text-gray-700 leading-relaxed">
                            These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Aizawl, Mizoram, India.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have any questions about these Terms of Service, please contact us at:
                        </p>
                        <div className="mt-4 text-gray-700">
                            <p className="font-semibold">Zirna</p>
                            <p>D/Z31B, Dinthar, Aizawl</p>
                            <p>Mizoram, India - 796009</p>
                            <p className="mt-2">Email: <a href="mailto:support@zirna.io" className="text-blue-600 hover:underline">support@zirna.io</a></p>
                            <p>Website: <a href="https://zirna.io" className="text-blue-600 hover:underline">zirna.io</a></p>
                        </div>
                    </section>
                </div>
            </div>

            <Footer />
        </div>
    );
}
