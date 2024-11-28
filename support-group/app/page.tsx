import { LoginButton } from "@/components/auth/login-button";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>   
     <p>Home Page </p>
     <LoginButton>
     <Button variant="secondary" size="lg">Sign in</Button>
     </LoginButton>
    </>

  );
}
