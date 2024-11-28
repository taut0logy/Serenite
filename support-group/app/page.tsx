import { LoginButton } from "@/components/auth/login-button";
import { Button } from "@/components/ui/button";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";

export default function Home() {
  return (
    <main className="flex h-full flex-row items-center justify-evenly bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800">
      <div>
        <p className="text-white text-xl">Home Page</p>
        
        
      </div>

      {/* Login Button */}
      <LoginButton>
        <Button variant="secondary" size="lg">Sign in</Button>
      </LoginButton>
    </main>
  );
}
