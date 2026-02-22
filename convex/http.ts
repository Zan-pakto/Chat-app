import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const headerPayload = request.headers;

    try {
      // In a real production app, we would use svix to verify the webhook signature here.
      // For this sample, we just parse it directly.
      const result = JSON.parse(payloadString);
      const eventType = result.type;

      switch (eventType) {
        case "user.created":
          await ctx.runMutation(internal.users.createUser, {
            clerkId: result.data.id,
            email: result.data.email_addresses[0]?.email_address || "",
            name: `${result.data.first_name || ""} ${result.data.last_name || ""}`.trim(),
            imageUrl: result.data.image_url,
          });
          break;
        case "user.updated":
          await ctx.runMutation(internal.users.updateUser, {
            clerkId: result.data.id,
            email: result.data.email_addresses[0]?.email_address || "",
            name: `${result.data.first_name || ""} ${result.data.last_name || ""}`.trim(),
            imageUrl: result.data.image_url,
          });
          break;
      }

      return new Response(null, {
        status: 200,
      });
    } catch (err) {
      console.error("Webhook Error", err);
      return new Response("Webhook Error", {
        status: 400,
      });
    }
  }),
});

export default http;
