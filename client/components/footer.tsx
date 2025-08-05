import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-4">
                            Serenite
                        </h3>
                        <p className="text-sm">
                            Empowering individuals through accessible mental
                            health support and therapy.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">
                            Quick Links
                        </h4>
                        <ul className="space-y-2">
                            <li>
                                <a
                                    href="/about"
                                    className="hover:text-white transition"
                                >
                                    About Us
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/services"
                                    className="hover:text-white transition"
                                >
                                    Services
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/blog"
                                    className="hover:text-white transition"
                                >
                                    Blog
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/contact"
                                    className="hover:text-white transition"
                                >
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">
                            Connect
                        </h4>
                        <div className="flex space-x-4">
                            <a href="#" className="hover:text-white transition">
                                <Facebook />
                            </a>
                            <a href="#" className="hover:text-white transition">
                                <Twitter />
                            </a>
                            <a href="#" className="hover:text-white transition">
                                <Instagram />
                            </a>
                            <a href="#" className="hover:text-white transition">
                                <Linkedin />
                            </a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">
                            Newsletter
                        </h4>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                className="bg-gray-800 border-gray-700"
                            />
                            <Button variant="secondary">Subscribe</Button>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
                    <p>
                        &copy; {new Date().getFullYear()} Serenite. All rights
                        reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
