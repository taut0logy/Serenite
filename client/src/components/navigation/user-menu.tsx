import { User as UserType } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuGroup,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
//import { useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
//import { LOGOUT } from "@/graphql/operations";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

export function UserMenu({ user }: { user: UserType | null }) {
    //const [logoutMutation] = useMutation(LOGOUT);

    const router = useRouter();

    const handleLogout = async () => {
        try {
            // if (user) {
            //     // Call GraphQL logout mutation
            //     await logoutMutation({
            //         variables: {
            //             token: window.sessionStorage.getItem("token") || "",
            //         },
            //     });
            // }

            // Use NextAuth signOut
            await signOut({ redirect: false });

            toast.success("See you next time!");
            router.push("/auth/login");
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Something went wrong during logout");
        }
    };

    const getUserInitials = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return "U";
    };

    const getDisplayName = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        if (user?.email) {
            return user.email.split("@")[0];
        }
        return "User";
    };

    return (
        <div className="user-menu">
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative h-10 w-10 rounded-full cursor-pointer hover:scale-110 transition-transform duration-300"
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                    src={user?.image || ""}
                                    alt={getDisplayName()}
                                />
                                <AvatarFallback>
                                    {getUserInitials()}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56"
                        align="end"
                        forceMount
                    >
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {getDisplayName()}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={() => router.push("/profile")}
                            >
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => router.push("/settings")}
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}
        </div>
    );
}
