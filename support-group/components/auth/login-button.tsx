"use client";

interface LoginButtonProps { 
  children: React.ReactNode;
  mode?: "modal" | "redirect";
  asChild?: boolean;
};

export const LoginButton = ({
  children,
  mode = "modal",
  asChild = false,
}: LoginButtonProps) => {
  const onClick = () => {
    console.log("Login button clicked");
  }
  return (
  <span onClick={onClick} className="cursor-pointer">{children}</span>
  );
};