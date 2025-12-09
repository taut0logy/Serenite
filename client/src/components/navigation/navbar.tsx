"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Home,
    LogOut,
    Menu,
    MessageSquare,
    Settings,
    User,
    Video,
    BookOpen,
    Circle,
    Palette,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@apollo/client";
import { LOGOUT } from "@/graphql/operations/mutations";
import { toast } from "sonner";
//import { NotificationMenu } from "@/components/notifications/notification-menu";
import { UserMenu } from "./user-menu";
import { MdPeople } from "react-icons/md";

// Define navigation items based on user role
const getNavItems = (role?: string) => {
    // Base navigation items for all authenticated users
    const items = [
        {
            title: "Dashboard",
            href: "/dashboard",
            icon: Home,
            roles: ["USER", "HOST", "MANAGER", "ADMIN"],
        },
        {
            title: "Diary",
            href: "/diary",
            icon: BookOpen,
            roles: ["USER", "HOST", "MANAGER", "ADMIN"],
        },
        {
            title: "Chat",
            href: "/mental-health-assistant",
            icon: MessageSquare,
            roles: ["USER", "HOST", "MANAGER", "ADMIN"],
        },
        {
            title: "Breathe",
            href: "/breathing-exercise",
            icon: Circle,
            roles: ["USER", "HOST", "MANAGER", "ADMIN"],
        },
        {
            title: "Moner Canvus",
            href: "/moner-canvus",
            icon: Palette,
            roles: ["USER", "HOST", "MANAGER", "ADMIN"],
        },
        {
            title: "Community",
            href: "/community",
            icon: MdPeople,
            roles: ["USER", "HOST", "MANAGER", "ADMIN"],
        },
    ];

    // Admin-only items
    const adminItems = [
        {
            title: "Admin",
            href: "/admin",
            icon: Settings,
            roles: ["ADMIN"],
        },
    ];

    // Filter items based on user role
    return [...items, ...(role === "ADMIN" ? adminItems : [])];
};

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const navItems = getNavItems(user?.role);

    const [logoutMutation] = useMutation(LOGOUT);

    const closeMenu = () => setIsMenuOpen(false);

    const handleLogout = async () => {
        try {
            if (user) {
                // Call GraphQL logout mutation
                await logoutMutation({
                    variables: {
                        token: window.sessionStorage.getItem("token") || "",
                    },
                });
            }

            // Use NextAuth signOut
            await signOut({ redirect: false });

            toast.success("See you next time!");
            router.push("/auth/login");
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Something went wrong during logout");
        }
    };

    // Handle responsive layout changes
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768 && isMenuOpen) {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isMenuOpen]);

    // Get user initials for avatar fallback
    const getUserInitials = () => {
        if (!user || !user.firstName || !user.lastName) return "U";
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    };

    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="container mx-auto flex h-16 items-center justify-between">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center space-x-2 font-semibold text-xl"
                >
                    <span className="hidden sm:inline-block bg-gradient-to-r from-primary via-purple-500 to-pink-500 dark:from-primary/90 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent bg-[length:200%_100%]">
                        Serenite
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-6">
                    {user && (
                        <div className="flex items-center space-x-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                                        pathname === item.href
                                            ? "text-primary font-bold"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {item.title}
                                </Link>
                            ))}
                        </div>
                    )}
                </nav>

                {/* Right side - User menu or auth links */}
                <div className="flex items-center gap-2">
                    <ThemeToggle />

                    {isLoading ? (
                        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                    ) : user ? (
                        <>
                            {/* <NotificationMenu /> */}
                            {<UserMenu user={user} />}
                        </>
                    ) : (
                        <div className="hidden md:flex items-center gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => router.push("/auth/login")}
                            >
                                Sign in
                            </Button>
                            <Button
                                onClick={() => router.push("/auth/register")}
                            >
                                Sign up
                            </Button>
                        </div>
                    )}

                    {/* Mobile menu button */}
                    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <SheetTrigger asChild className="md:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Menu"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-[85vw] sm:w-[350px] pr-0"
                        >
                            <SheetHeader className="mb-4">
                                <SheetTitle className="flex items-center text-lg">
                                    <Video className="h-5 w-5 mr-2 text-primary" />
                                    Serenite
                                </SheetTitle>
                            </SheetHeader>

                            {user ? (
                                <>
                                    <div className="flex items-center space-x-4 mt-4 mb-6 px-4">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage
                                                src={user?.image || ""}
                                                alt={user?.name || "User"}
                                            />
                                            <AvatarFallback>
                                                {getUserInitials()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {user?.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {user?.email}
                                            </p>
                                        </div>
                                    </div>

                                    <Separator className="mb-4" />

                                    <div className="flex flex-col space-y-1 px-4">
                                        {navItems.map((item) => (
                                            <Button
                                                key={item.href}
                                                variant={
                                                    pathname === item.href
                                                        ? "secondary"
                                                        : "ghost"
                                                }
                                                className="justify-start"
                                                onClick={() => {
                                                    router.push(item.href);
                                                    closeMenu();
                                                }}
                                            >
                                                <item.icon className="mr-2 h-4 w-4" />
                                                {item.title}
                                            </Button>
                                        ))}
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="px-4 pb-8">
                                        <Button
                                            variant="ghost"
                                            className="justify-start w-full"
                                            onClick={() => {
                                                router.push("/profile");
                                                closeMenu();
                                            }}
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            Profile
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            className="justify-start w-full"
                                            onClick={() => {
                                                router.push("/settings");
                                                closeMenu();
                                            }}
                                        >
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            className="justify-start w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                                handleLogout();
                                                closeMenu();
                                            }}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Log out
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col space-y-4 px-4 mt-6">
                                    <Button
                                        onClick={() => {
                                            router.push("/auth/login");
                                            closeMenu();
                                        }}
                                        className="w-full"
                                    >
                                        Sign in
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            router.push("/auth/register");
                                            closeMenu();
                                        }}
                                        className="w-full"
                                    >
                                        Sign up
                                    </Button>
                                </div>
                            )}

                            <div className="absolute bottom-6 left-6">
                                <ThemeToggle />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
