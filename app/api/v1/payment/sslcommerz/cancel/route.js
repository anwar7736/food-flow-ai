import { handleSslCommerzCallback } from "@/app/lib/sslcommerzCallbacks";

export async function POST(request) {
    return handleSslCommerzCallback(request, "cancel");
}
