"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import Sidebar from "../../components/Sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedIn>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 bg-gray-100">
            {children}
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}