// "use client";

// import { useUser } from "@clerk/nextjs";
// import { useEffect } from "react";
// import { useMutation } from "convex/react";
// import { api } from "../../convex/_generated/api";

// export default function UserSync() {
//   const { user } = useUser();
//   const syncUser = useMutation(api.users.syncUser);

//  useEffect(() => {
//   console.log("Clerk user:", user);

//   if (!user) return;

//   console.log("Syncing user to Convex...");

//   syncUser({
//     clerkId: user.id,
//     name: user.fullName ?? "No Name",
//     email: user.primaryEmailAddress?.emailAddress ?? "",
//     avatarUrl: user.imageUrl,
//   });
// }, [user]);
// }

"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function UserSync() {
  const { user } = useUser();
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    console.log("Clerk user:", user);

    if (!user) return;

    console.log("Syncing user to Convex...");

    syncUser({
      clerkId: user.id,
      name: user.fullName ?? "No Name",
      email: user.primaryEmailAddress?.emailAddress ?? "",
      avatarUrl: user.imageUrl,
    });
  }, [user, syncUser]); // adding syncUser is optional but good practice

  return null; // required
}