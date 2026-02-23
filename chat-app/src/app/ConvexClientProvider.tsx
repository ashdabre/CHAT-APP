// "use client";
// import { ReactNode } from "react";
// import { ConvexProviderWithClerk } from "convex/react-clerk";
// import { useAuth } from "@clerk/nextjs";
// import { ConvexReactClient } from "convex/react";

// const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// export function ConvexClientProvider({ children }: { children: ReactNode }) {
//   return (
//     <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
//       {children}
//     </ConvexProviderWithClerk>
//   );
// }
"use client";

import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();

  return (
    <ConvexProviderWithClerk
      client={convex}
      useAuth={useAuth}
      getToken={async () => {
        try {
          const token = await getToken({ template: "convex" });
          console.log("🔑 Token obtained:", token ? "yes" : "no");
          return token ?? undefined;
        } catch (error) {
          console.error("🔑 Error getting token:", error);
          return undefined;
        }
      }}
    >
      {children}
    </ConvexProviderWithClerk>
  );
}