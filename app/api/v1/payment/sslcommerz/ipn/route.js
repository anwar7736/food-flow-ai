import { handleSslCommerzIpn } from "@/app/lib/sslcommerzCallbacks";

export async function POST(request) {
    return handleSslCommerzIpn(request);
}
