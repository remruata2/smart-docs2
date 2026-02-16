"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Globe } from "lucide-react";
import { useState } from "react";
import { Footer } from "@/components/Footer";
import Image from "next/image";

export default function ContactUs() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("sending");

        // Simulate form submission - replace with actual API call
        setTimeout(() => {
            setStatus("sent");
            setFormData({ name: "", email: "", subject: "", message: "" });
            setTimeout(() => setStatus("idle"), 3000);
        }, 1000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/" className="inline-block">
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
                </div>
            </header>

            {/* Content */}
            <div className="container mx-auto px-4 py-12 max-w-6xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Get in Touch
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Contact Information */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5 text-blue-600" />
                                    Email Us
                                </CardTitle>
                                <CardDescription>
                                    Send us an email anytime
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <a
                                    href="mailto:support@zirna.io"
                                    className="text-blue-600 hover:underline text-lg"
                                >
                                    support@zirna.io
                                </a>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                    Visit Us
                                </CardTitle>
                                <CardDescription>
                                    Our office location
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <address className="not-italic text-gray-700">
                                    <p className="font-semibold">Zirna</p>
                                    <p>D/Z31B, Dinthar</p>
                                    <p>Aizawl, Mizoram</p>
                                    <p>India - 796009</p>
                                </address>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-blue-600" />
                                    Website
                                </CardTitle>
                                <CardDescription>
                                    Visit our website
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <a
                                    href="https://zirna.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-lg"
                                >
                                    zirna.io
                                </a>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-50 border-blue-200">
                            <CardHeader>
                                <CardTitle className="text-blue-900">Support Hours</CardTitle>
                            </CardHeader>
                            <CardContent className="text-blue-800">
                                <p>Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                                <p>Saturday: 10:00 AM - 4:00 PM IST</p>
                                <p>Sunday: Closed</p>
                                <p className="mt-2 text-sm">
                                    We typically respond within 24 hours during business days.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Send us a Message</CardTitle>
                            <CardDescription>
                                Fill out the form below and we'll get back to you soon
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Your name"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject *
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        required
                                        value={formData.subject}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="How can we help?"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                        Message *
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows={6}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Tell us more about your inquiry..."
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={status === "sending"}
                                >
                                    {status === "sending" ? "Sending..." : status === "sent" ? "Sent!" : "Send Message"}
                                </Button>

                                {status === "sent" && (
                                    <p className="text-green-600 text-sm text-center">
                                        Thank you! We've received your message and will get back to you soon.
                                    </p>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Footer />
        </div>
    );
}
