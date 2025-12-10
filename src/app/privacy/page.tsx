import Link from "next/link";
import { Footer } from "@/components/Footer";
import Image from "next/image";

export default function PrivacyPolicy() {
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
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                <p className="text-gray-600 mb-8">Last updated: November 27, 2024</p>

                <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Zirna ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered exam preparation platform at zirna.io.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

                        <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.1 Information You Provide</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Account information (username, email address, password)</li>
                            <li>Profile information (educational institution, program, subjects)</li>
                            <li>Payment information (processed securely through Razorpay)</li>
                            <li>Communications with our support team</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.2 Information Automatically Collected</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Usage data (quiz attempts, study sessions, performance metrics)</li>
                            <li>Device information (IP address, browser type, operating system)</li>
                            <li>Log data (access times, pages viewed, actions taken)</li>
                            <li>Cookies and similar tracking technologies</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.3 AI Interaction Data</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Questions you ask the AI tutor</li>
                            <li>Quiz responses and answers</li>
                            <li>Study materials you interact with</li>
                            <li>Learning preferences and patterns</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            We use the collected information for the following purposes:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Personalize your learning experience</li>
                            <li>Generate AI-powered content tailored to your needs</li>
                            <li>Process payments and manage subscriptions</li>
                            <li>Send important updates and notifications</li>
                            <li>Analyze usage patterns to improve our platform</li>
                            <li>Detect and prevent fraud or abuse</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Third-Party Services</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            We use the following third-party services to operate our platform:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li><strong>Razorpay:</strong> Payment processing (subject to Razorpay's privacy policy)</li>
                            <li><strong>Google Analytics:</strong> Website analytics and usage tracking</li>
                            <li><strong>AI Service Providers:</strong> To generate educational content and provide tutoring features</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mt-3">
                            These third parties have their own privacy policies and we encourage you to review them.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            We do not sell your personal information. We may share your information in the following circumstances:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our platform</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                            <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We retain your personal information for as long as your account is active or as needed to provide you services. Upon account deletion, we will immediately delete your personal information, except where we are required to retain it for legal or regulatory purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Your Rights</h2>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            You have the following rights regarding your personal information:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                            <li><strong>Portability:</strong> Request your data in a portable format</li>
                            <li><strong>Objection:</strong> Object to certain processing of your data</li>
                            <li><strong>Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mt-3">
                            To exercise these rights, please contact us at support@zirna.io.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies and Tracking</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We use cookies and similar tracking technologies to track activity on our platform and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Our Service is intended for users who are at least 13 years old. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can delete it.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. International Data Transfers</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Your information may be transferred to and maintained on servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our Service, you consent to such transfers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us:
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
